import Customer from '../models/Customer.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
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

  // ── GET /customers — paginated list ──
  fastify.get('/', auth, async (request, reply) => {
    const { search, village, includeInactive, createdFrom, createdTo, page = 1, limit = 500 } = request.query;
    const { shopId } = request.user;
    const limitNum = Math.min(parseInt(limit), 500);
    const skip     = (parseInt(page) - 1) * limitNum;

    const filter = { shopId };
    if (!includeInactive) filter.isActive = true;
    if (village) filter.village = { $regex: `^${village.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    if (search) {
      filter.$or = [
        { fullName:   { $regex: search, $options: 'i' } },
        { mobile:     { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { village:    { $regex: search, $options: 'i' } },
      ];
    }
    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
      if (createdTo)   filter.createdAt.$lte = new Date(new Date(createdTo).setHours(23, 59, 59, 999));
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ fullName: 1 }).skip(skip).limit(limitNum).lean(),
      Customer.countDocuments(filter),
    ]);

    return reply.send({ customers, total, page: parseInt(page), totalPages: Math.ceil(total / limitNum) });
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

    const txnDate = date ? new Date(date) : new Date();
    const staff = await User.findById(userId).lean();

    // Create mirror Transaction first so we can link it in WalletTransaction
    const mirrorTx = await Transaction.create({
      shopId, type: 'in',
      customerName: customer.fullName,
      amount: Number(amount),
      productDescription: `Wallet credit — ${customer.fullName}`,
      date: txnDate,
      payMode: payMode || 'cash',
      staffId: userId, staffName: staff?.name || '',
      notes: note || '',
      linkedCustomerId: customer._id,
      linkedCustomerUid: customer.customerId,
      deletedAt: null,
    });

    const txn = await WalletTransaction.create({
      shopId, customerId: customer._id, type: 'credit',
      amount: Number(amount), balanceBefore, balanceAfter,
      note: note || '', payMode: payMode || 'cash', recordedBy: userId,
      date: txnDate,
      transactionId: mirrorTx._id,
    });

    // WhatsApp notification (fire and forget)
    const tenant = await Tenant.findOne({ shopId });
    notifyCredit({ mobile: customer.mobile, amount: Number(amount), balanceAfter, shopName: tenant?.shopName || shopId });

    return reply.status(201).send({ transaction: txn, customer });
  });

  // ── POST /customers/:id/debit — deduct amount (money) or give stock items ──
  fastify.post('/:id/debit', auth, async (request, reply) => {
    const { amount, note, date, payMode, stockId, quantity } = request.body;
    const { shopId, userId } = request.user;

    const customer = await Customer.findOne({ _id: request.params.id, shopId, isActive: true });
    if (!customer) return reply.status(404).send({ error: 'Customer not found' });

    let debitAmount = Number(amount);
    let stockItem   = null;
    let qtyNum      = 0;

    if (stockId) {
      // Stock-item debit: give goods from stock, deduct value from customer balance
      stockItem = await Stock.findOne({ _id: stockId, shopId, isActive: true });
      if (!stockItem) return reply.status(404).send({ error: 'Stock item not found' });

      qtyNum = Number(quantity);
      if (!qtyNum || qtyNum <= 0)           return reply.status(400).send({ error: 'Quantity must be greater than 0' });
      if (qtyNum > stockItem.quantity)       return reply.status(400).send({ error: `Only ${stockItem.quantity} ${stockItem.unit} in stock` });

      // Amount can be overridden; default = qty × pricePerUnit
      debitAmount = amount ? Number(amount) : qtyNum * stockItem.pricePerUnit;
      if (!debitAmount || debitAmount <= 0) return reply.status(400).send({ error: 'Calculated amount must be greater than 0' });
    } else {
      if (!amount || debitAmount <= 0) return reply.status(400).send({ error: 'Amount must be greater than 0' });
    }

    const balanceBefore = customer.balance;
    const balanceAfter  = balanceBefore - debitAmount;

    customer.balance = balanceAfter;
    customer.isLoan  = balanceAfter < 0;
    await customer.save();

    // Deduct stock and record movement if stock item given
    if (stockItem) {
      const quantityBefore = stockItem.quantity;
      stockItem.quantity  -= qtyNum;
      await stockItem.save();

      await StockMovement.create({
        shopId, stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
        type: 'sale', quantity: -qtyNum,
        quantityBefore, quantityAfter: stockItem.quantity,
        customerName: customer.fullName,
        note: note || `Given to ${customer.fullName}`, recordedBy: userId,
      });
    }

    const txnDate = date ? new Date(date) : new Date();
    const debitNote = note || (stockItem ? `${stockItem.name} × ${qtyNum}` : '');
    const staff = await User.findById(userId).lean();

    // Create mirror Transaction first so we can link it in WalletTransaction
    const mirrorTx = await Transaction.create({
      shopId, type: 'out',
      customerName: customer.fullName,
      amount: debitAmount,
      productDescription: stockItem
        ? `${stockItem.name} × ${qtyNum} ${stockItem.unit} — ${customer.fullName}`
        : `Wallet debit — ${customer.fullName}`,
      date: txnDate,
      payMode: payMode || 'cash',
      staffId: userId, staffName: staff?.name || '',
      notes: debitNote,
      linkedCustomerId: customer._id,
      linkedCustomerUid: customer.customerId,
      stockId:       stockItem ? stockItem._id  : null,
      stockName:     stockItem ? stockItem.name : null,
      stockCategory: stockItem ? stockItem.category : null,
      quantitySold:  stockItem ? qtyNum : null,
      unit:          stockItem ? stockItem.unit : null,
      deletedAt: null,
    });

    const txn = await WalletTransaction.create({
      shopId, customerId: customer._id,
      type:               stockItem ? 'sale' : 'debit',
      amount:             debitAmount,
      balanceBefore, balanceAfter,
      note:               debitNote,
      payMode:            payMode || 'cash',
      recordedBy:         userId,
      date:               txnDate,
      productDescription: stockItem ? stockItem.name : null,
      stockName:          stockItem ? stockItem.name : null,
      quantitySold:       stockItem ? qtyNum         : null,
      unit:               stockItem ? stockItem.unit  : null,
      transactionId:      mirrorTx._id,
    });

    // WhatsApp notification
    const tenant = await Tenant.findOne({ shopId });
    notifyDebit({ mobile: customer.mobile, amount: debitAmount, balanceAfter, shopName: tenant?.shopName || shopId });

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
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo)   filter.date.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
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
