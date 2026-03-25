import Salary from '../models/Salary.js';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { notifySalary } from '../services/whatsapp.js';

const adminOnly = async (request, reply) => {
  if (request.user.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function salaryRoutes(fastify) {
  const adminAuth = { preHandler: [tenantResolver, adminOnly] };

  // ── GET /salaries — list, optionally filter by month/year/staff ──
  fastify.get('/', adminAuth, async (request, reply) => {
    const { month, year, staffId, status } = request.query;
    const { shopId } = request.user;

    const filter = { shopId };
    if (month)   filter.month   = Number(month);
    if (year)    filter.year    = Number(year);
    if (staffId) filter.staffId = staffId;
    if (status)  filter.status  = status;

    const salaries = await Salary.find(filter).sort({ year: -1, month: -1, staffName: 1 });
    return reply.send(salaries);
  });

  // ── POST /salaries — create salary record for a month ──
  fastify.post('/', adminAuth, async (request, reply) => {
    const { staffId, month, year, baseSalary, deductions, notes } = request.body;
    const { shopId } = request.user;

    if (!staffId || !month || !year || !baseSalary)
      return reply.status(400).send({ error: 'staffId, month, year and baseSalary are required' });

    const staff = await User.findOne({ _id: staffId, shopId, isActive: true });
    if (!staff) return reply.status(404).send({ error: 'Staff member not found' });

    const existing = await Salary.findOne({ shopId, staffId, month: Number(month), year: Number(year) });
    if (existing) return reply.status(400).send({ error: 'Salary record already exists for this month' });

    const ded       = Number(deductions) || 0;
    const netSalary = Number(baseSalary) - ded;

    const salary = await Salary.create({
      shopId, staffId, staffName: staff.name,
      month: Number(month), year: Number(year),
      baseSalary: Number(baseSalary), deductions: ded,
      netSalary, paidAmount: 0, balance: netSalary,
      status: 'pending', notes: notes || '',
    });

    return reply.status(201).send(salary);
  });

  // ── PUT /salaries/:id — edit base salary or deductions ──
  fastify.put('/:id', adminAuth, async (request, reply) => {
    const { baseSalary, deductions, notes } = request.body;
    const salary = await Salary.findOne({ _id: request.params.id, shopId: request.user.shopId });
    if (!salary) return reply.status(404).send({ error: 'Salary record not found' });

    if (baseSalary  !== undefined) salary.baseSalary  = Number(baseSalary);
    if (deductions  !== undefined) salary.deductions  = Number(deductions);
    if (notes       !== undefined) salary.notes       = notes;

    salary.netSalary = salary.baseSalary - salary.deductions;
    salary.balance   = salary.netSalary  - salary.paidAmount;
    salary.status    = salary.paidAmount === 0 ? 'pending' : salary.balance <= 0 ? 'paid' : 'partial';

    await salary.save();
    return reply.send(salary);
  });

  // ── POST /salaries/:id/payment — record a salary payment ──
  fastify.post('/:id/payment', adminAuth, async (request, reply) => {
    const { amount, note, date, payMode } = request.body;
    const { shopId, userId } = request.user;

    if (!amount || amount <= 0) return reply.status(400).send({ error: 'Amount must be greater than 0' });

    const salary = await Salary.findOne({ _id: request.params.id, shopId });
    if (!salary) return reply.status(404).send({ error: 'Salary record not found' });
    if (salary.status === 'paid') return reply.status(400).send({ error: 'Salary already fully paid' });

    salary.payments.push({ amount: Number(amount), note: note || '', payMode: payMode || 'cash', date: date ? new Date(date) : new Date(), recordedBy: userId });
    salary.paidAmount += Number(amount);
    salary.balance     = salary.netSalary - salary.paidAmount;
    salary.status      = salary.balance <= 0 ? 'paid' : 'partial';
    if (salary.balance < 0) salary.balance = 0;

    await salary.save();

    // WhatsApp notification to staff
    const staff = await User.findById(salary.staffId);
    if (staff?.phone) {
      const tenant = await Tenant.findOne({ shopId });
      notifySalary({
        mobile: staff.phone,
        amount: Number(amount),
        remaining: salary.balance,
        monthName: MONTHS[salary.month - 1],
        year: salary.year,
        shopName: tenant?.shopName || shopId,
      });
    }

    return reply.send(salary);
  });

  // ── DELETE /salaries/:id ──
  fastify.delete('/:id', adminAuth, async (request, reply) => {
    const salary = await Salary.findOneAndDelete({ _id: request.params.id, shopId: request.user.shopId });
    if (!salary) return reply.status(404).send({ error: 'Salary record not found' });
    return reply.send({ success: true });
  });

  // ── GET /salaries/summary ──
  fastify.get('/summary', adminAuth, async (request, reply) => {
    const { month, year } = request.query;
    const { shopId } = request.user;
    const filter = { shopId };
    if (month) filter.month = Number(month);
    if (year)  filter.year  = Number(year);

    const [result] = await Salary.aggregate([
      { $match: filter },
      { $group: {
        _id: null,
        totalNet:   { $sum: '$netSalary' },
        totalPaid:  { $sum: '$paidAmount' },
        totalDue:   { $sum: '$balance' },
        pending:    { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        partial:    { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
        paid:       { $sum: { $cond: [{ $eq: ['$status', 'paid']    }, 1, 0] } },
      }},
    ]);
    return reply.send(result || { totalNet: 0, totalPaid: 0, totalDue: 0, pending: 0, partial: 0, paid: 0 });
  });
}
