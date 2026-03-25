import Customer from '../models/Customer.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Tenant from '../models/Tenant.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { notifyCredit, notifyDebit } from '../services/whatsapp.js';

// Auto-generate a customer ID: CUST001, CUST002, ...
async function generateCustomerId(shopId) {
  const last = await Customer.findOne({ shopId })
    .sort({ createdAt: -1 })
    .select('customerId');
  if (!last) return 'CUST001';
  const num = parseInt(last.customerId.replace(/\D/g, ''), 10) || 0;
  return 'CUST' + String(num + 1).padStart(3, '0');
}

export default async function customerRoutes(fastify) {
  const auth = { preHandler: [tenantResolver] };

  // ── GET /customers — list all (search by name/mobile/id/village) ──
  fastify.get('/', auth, async (request, reply) => {
    const { search, village, includeInactive } = request.query;
    const { shopId } = request.user;

    const filter = { shopId };
    if (!includeInactive) filter.isActive = true;
    if (village) filter.village = { $regex: `^${village}$`, $options: 'i' };
    if (search) {
      filter.$or = [
        { fullName:   { $regex: search, $options: 'i' } },
        { mobile:     { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { village:    { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(filter).sort({ fullName: 1 });
    return reply.send(customers);
  });

  // ── GET /customers/villages — distinct village list for autocomplete ──
  fastify.get('/villages', auth, async (request, reply) => {
    const villages = await Customer.distinct('village', {
      shopId: request.user.shopId,
      village: { $ne: '' },
    });
    return reply.send(villages.sort((a, b) => a.localeCompare(b)));
  });

  // ── POST /customers — create customer ──
  fastify.post('/', auth, async (request, reply) => {
    const { fullName, mobile, address, village, customerId: manualId } = request.body;
    const { shopId } = request.user;

    if (!fullName || !mobile) {
      return reply.status(400).send({ error: 'Full name and mobile are required' });
    }

    const customerId = manualId?.trim() || await generateCustomerId(shopId);

    // Check uniqueness
    const exists = await Customer.findOne({ shopId, customerId });
    if (exists) return reply.status(400).send({ error: 'Customer ID already exists' });

    const mobileTaken = await Customer.findOne({ shopId, mobile: mobile.trim() });
    if (mobileTaken) return reply.status(400).send({ error: 'Mobile number already registered' });

    const customer = await Customer.create({
      shopId, customerId, fullName: fullName.trim(),
      mobile: mobile.trim(), address: address?.trim() || '',
      village: village?.trim() || '',
    });

    return reply.status(201).send(customer);
  });

  // ── GET /customers/:id — single customer with stats ──
  fastify.get('/:id', auth, async (request, reply) => {
    const customer = await Customer.findOne({ _id: request.params.id, shopId: request.user.shopId });
    if (!customer) return reply.status(404).send({ error: 'Customer not found' });
    return reply.send(customer);
  });

  // ── PUT /customers/:id — update customer ──
  fastify.put('/:id', auth, async (request, reply) => {
    const { fullName, mobile, address, village, customerId } = request.body;
    const { shopId } = request.user;

    const customer = await Customer.findOne({ _id: request.params.id, shopId });
    if (!customer) return reply.status(404).send({ error: 'Customer not found' });

    if (customerId && customerId !== customer.customerId) {
      const taken = await Customer.findOne({ shopId, customerId });
      if (taken) return reply.status(400).send({ error: 'Customer ID already exists' });
      customer.customerId = customerId;
    }
    if (fullName) customer.fullName = fullName.trim();
    if (mobile)   customer.mobile   = mobile.trim();
    if (address !== undefined) customer.address = address.trim();
    if (village !== undefined) customer.village = village.trim();

    await customer.save();
    return reply.send(customer);
  });

  // ── DELETE /customers/:id — soft deactivate ──
  fastify.delete('/:id', auth, async (request, reply) => {
    const customer = await Customer.findOne({ _id: request.params.id, shopId: request.user.shopId });
    if (!customer) return reply.status(404).send({ error: 'Customer not found' });
    customer.isActive = false;
    await customer.save();
    return reply.send({ success: true });
  });

  // ── POST /customers/:id/credit — add funds ──
  fastify.post('/:id/credit', auth, async (request, reply) => {
    const { amount, note, date, payMode } = request.body;
    const { shopId, userId } = request.user;

    if (!amount || amount <= 0) return reply.status(400).send({ error: 'Amount must be greater than 0' });

    const customer = await Customer.findOne({ _id: request.params.id, shopId, isActive: true });
    if (!customer) return reply.status(404).send({ error: 'Customer not found' });

    const balanceBefore = customer.balance;
    const balanceAfter  = balanceBefore + Number(amount);

    customer.balance = balanceAfter;
    customer.isLoan  = balanceAfter < 0;
    await customer.save();

    const txn = await WalletTransaction.create({
      shopId, customerId: customer._id, type: 'credit',
      amount: Number(amount), balanceBefore, balanceAfter,
      note: note || '', payMode: payMode || 'cash', recordedBy: userId,
      date: date ? new Date(date) : new Date(),
    });

    // WhatsApp notification (fire and forget)
    const tenant = await Tenant.findOne({ shopId });
    notifyCredit({ mobile: customer.mobile, amount: Number(amount), balanceAfter, shopName: tenant?.shopName || shopId });

    return reply.status(201).send({ transaction: txn, customer });
  });

  // ── POST /customers/:id/debit — deduct amount ──
  fastify.post('/:id/debit', auth, async (request, reply) => {
    const { amount, note, date, payMode } = request.body;
    const { shopId, userId } = request.user;

    if (!amount || amount <= 0) return reply.status(400).send({ error: 'Amount must be greater than 0' });

    const customer = await Customer.findOne({ _id: request.params.id, shopId, isActive: true });
    if (!customer) return reply.status(404).send({ error: 'Customer not found' });

    const balanceBefore = customer.balance;
    const balanceAfter  = balanceBefore - Number(amount);

    customer.balance = balanceAfter;
    customer.isLoan  = balanceAfter < 0;
    await customer.save();

    const txn = await WalletTransaction.create({
      shopId, customerId: customer._id, type: 'debit',
      amount: Number(amount), balanceBefore, balanceAfter,
      note: note || '', payMode: payMode || 'cash', recordedBy: userId,
      date: date ? new Date(date) : new Date(),
    });

    // WhatsApp notification
    const tenant = await Tenant.findOne({ shopId });
    notifyDebit({ mobile: customer.mobile, amount: Number(amount), balanceAfter, shopName: tenant?.shopName || shopId });

    return reply.status(201).send({ transaction: txn, customer });
  });

  // ── GET /customers/:id/passbook — transaction history ──
  fastify.get('/:id/passbook', auth, async (request, reply) => {
    const { shopId } = request.user;
    const { page = 1, limit = 50, dateFrom, dateTo } = request.query;

    const customer = await Customer.findOne({ _id: request.params.id, shopId });
    if (!customer) return reply.status(404).send({ error: 'Customer not found' });

    const filter = { shopId, customerId: customer._id };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('recordedBy', 'name'),
      WalletTransaction.countDocuments(filter),
    ]);

    return reply.send({ customer, transactions, total, page: Number(page), limit: Number(limit) });
  });

  // ── GET /customers/transactions/all — all wallet txns (admin) ──
  fastify.get('/transactions/all', auth, async (request, reply) => {
    const { shopId } = request.user;
    const { page = 1, limit = 50, dateFrom, dateTo, type, search } = request.query;

    const filter = { shopId };
    if (type && type !== 'all') filter.type = type;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   filter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    // If search provided, find matching customers first
    if (search) {
      const matchingCustomers = await Customer.find({
        shopId,
        $or: [
          { fullName:   { $regex: search, $options: 'i' } },
          { customerId: { $regex: search, $options: 'i' } },
          { mobile:     { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      filter.customerId = { $in: matchingCustomers.map(c => c._id) };
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('customerId', 'fullName customerId mobile')
        .populate('recordedBy', 'name'),
      WalletTransaction.countDocuments(filter),
    ]);

    // Summary stats
    const stats = await WalletTransaction.aggregate([
      { $match: { shopId } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const totalCredits = stats.find(s => s._id === 'credit')?.total || 0;
    const totalDebits  = stats.find(s => s._id === 'debit')?.total  || 0;

    return reply.send({ transactions, total, page: Number(page), limit: Number(limit), totalCredits, totalDebits });
  });
}
