import Expense from '../models/Expense.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { tenantResolver } from '../middleware/tenantResolver.js';

const adminOnly = async (request, reply) => {
  if (request.user.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });
};

export default async function expenseRoutes(fastify) {
  const adminAuth = { preHandler: [tenantResolver, adminOnly] };

  // ── GET /expenses ──
  fastify.get('/', adminAuth, async (request, reply) => {
    const { category, dateFrom, dateTo, page = 1, limit = 50 } = request.query;
    const { shopId } = request.user;

    const filter = { shopId };
    if (category) filter.category = { $regex: category, $options: 'i' };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo)   filter.date.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Expense.countDocuments(filter),
    ]);

    return reply.send({ expenses, total });
  });

  // ── GET /expenses/categories — distinct list ──
  fastify.get('/categories', adminAuth, async (request, reply) => {
    const categories = await Expense.distinct('category', { shopId: request.user.shopId });
    return reply.send(categories.sort());
  });

  // ── POST /expenses ──
  fastify.post('/', adminAuth, async (request, reply) => {
    const { category, amount, description, date, payMode } = request.body;
    const { shopId, userId } = request.user;

    if (!category) return reply.status(400).send({ error: 'Category is required' });
    if (!amount || amount <= 0) return reply.status(400).send({ error: 'Amount must be greater than 0' });

    const expenseDate = date ? new Date(date) : new Date();

    const expense = await Expense.create({
      shopId, category: category.trim(), amount: Number(amount),
      description: description?.trim() || '',
      date: expenseDate,
      payMode: payMode || 'cash',
      recordedBy: userId,
    });

    // Mirror in Transaction so it appears in History and Dashboard
    const staff = await User.findById(userId).lean();
    await Transaction.create({
      shopId, type: 'out',
      customerName: category.trim(),
      amount: Number(amount),
      productDescription: description?.trim() || category.trim(),
      date: expenseDate,
      payMode: payMode || 'cash',
      staffId: userId, staffName: staff?.name || '',
      notes: `Expense: ${category.trim()}`,
      deletedAt: null,
    });

    return reply.status(201).send(expense);
  });

  // ── PUT /expenses/:id ──
  fastify.put('/:id', adminAuth, async (request, reply) => {
    const { category, amount, description, date, payMode } = request.body;
    const expense = await Expense.findOne({ _id: request.params.id, shopId: request.user.shopId });
    if (!expense) return reply.status(404).send({ error: 'Expense not found' });

    if (category)    expense.category    = category.trim();
    if (amount)      expense.amount      = Number(amount);
    if (description !== undefined) expense.description = description;
    if (date)        expense.date        = new Date(date);
    if (payMode)     expense.payMode     = payMode;

    await expense.save();
    return reply.send(expense);
  });

  // ── DELETE /expenses/:id ──
  fastify.delete('/:id', adminAuth, async (request, reply) => {
    const expense = await Expense.findOneAndDelete({ _id: request.params.id, shopId: request.user.shopId });
    if (!expense) return reply.status(404).send({ error: 'Expense not found' });
    return reply.send({ success: true });
  });

  // ── GET /expenses/summary ──
  fastify.get('/summary', adminAuth, async (request, reply) => {
    const { dateFrom, dateTo } = request.query;
    const { shopId } = request.user;

    const filter = { shopId };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo)   filter.date.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    const byCategory = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const [totals] = await Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    return reply.send({ byCategory, total: totals?.total || 0, count: totals?.count || 0 });
  });
}
