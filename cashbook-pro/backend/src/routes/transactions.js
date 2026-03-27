import { tenantResolver } from '../middleware/tenantResolver.js';
import { roleCheck } from '../middleware/roleCheck.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Customer from '../models/Customer.js';

function fmt(n) { return parseFloat((n || 0).toFixed(2)); }

async function buildSummary(filter) {
  const agg = await Transaction.aggregate([
    { $match: { ...filter, deletedAt: null } },
    { $group: {
      _id: null,
      totalIn:    { $sum: { $cond: [{ $eq: ['$type', 'in'] },  '$amount', 0] } },
      totalOut:   { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$amount', 0] } },
      net:        { $sum: { $cond: [{ $eq: ['$type', 'in'] },  '$amount', { $multiply: ['$amount', -1] }] } },
      cashIn:     { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'in']  }, { $eq: ['$payMode', 'cash']   }] }, '$amount', 0] } },
      onlineIn:   { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'in']  }, { $eq: ['$payMode', 'online'] }] }, '$amount', 0] } },
      cashOut:    { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'out'] }, { $eq: ['$payMode', 'cash']   }] }, '$amount', 0] } },
      onlineOut:  { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'out'] }, { $eq: ['$payMode', 'online'] }] }, '$amount', 0] } },
      count:      { $sum: 1 },
      avgAmount:  { $avg: '$amount' },
    }},
  ]);

  const s = agg[0] || {};
  return {
    totalIn:            fmt(s.totalIn),
    totalOut:           fmt(s.totalOut),
    net:                fmt(s.net),
    cashIn:             fmt(s.cashIn),
    onlineIn:           fmt(s.onlineIn),
    cashOut:            fmt(s.cashOut),
    onlineOut:          fmt(s.onlineOut),
    transactionCount:   s.count || 0,
    avgTransactionValue:fmt(s.avgAmount),
  };
}

function formatTx(t) {
  const obj = t.toObject ? t.toObject() : { ...t };
  obj.id = obj._id;
  return obj;
}

export default async function transactionRoutes(fastify) {

  // GET /transactions
  fastify.get('/', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { page = 1, limit = 20, search, type, staff_id, date_from, date_to, pay_mode } = request.query;
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (parseInt(page) - 1) * limitNum;

      const filter = { shopId: request.user.shopId, deletedAt: null };

      if (request.user.role === 'staff') {
        filter.staffId = request.user.userId;
      } else if (staff_id) {
        filter.staffId = staff_id;
      }

      if (type)     filter.type    = type;
      if (pay_mode) filter.payMode = pay_mode;
      if (search) {
        filter.$or = [
          { customerName:       { $regex: search, $options: 'i' } },
          { productDescription: { $regex: search, $options: 'i' } },
        ];
      }
      if (date_from || date_to) {
        filter.date = {};
        if (date_from) filter.date.$gte = new Date(date_from);
        if (date_to)   filter.date.$lte = new Date(date_to);
      }

      const [total, transactions] = await Promise.all([
        Transaction.countDocuments(filter),
        Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ]);

      const summary = await buildSummary({ shopId: request.user.shopId, ...(filter.staffId ? { staffId: filter.staffId } : {}), ...(filter.type ? { type: filter.type } : {}), ...(filter.date ? { date: filter.date } : {}) });

      return reply.send({
        data: transactions.map(formatTx),
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limitNum),
        summary,
      });

    } catch (err) {
      console.error('Get transactions error:', err);
      return reply.status(500).send({ error: 'Failed to fetch transactions' });
    }
  });

  // POST /transactions
  fastify.post('/', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { type, customerName, amount, productDescription, date, payMode, imageUrl, imageKey, notes,
              stockId, quantitySold, linkedCustomerId } = request.body;

      if (!type || !customerName || !amount || !date) {
        return reply.status(400).send({ error: 'Type, customer name, amount, and date are required' });
      }
      if (!['in', 'out'].includes(type)) {
        return reply.status(400).send({ error: 'Type must be "in" or "out"' });
      }
      if (!['cash', 'online'].includes(payMode || 'cash')) {
        return reply.status(400).send({ error: 'Pay mode must be "cash" or "online"' });
      }
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return reply.status(400).send({ error: 'Amount must be a positive number' });
      }

      // Starter plan: 500 transactions per day limit
      if (request.tenant.plan === 'starter') {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
        const count = await Transaction.countDocuments({ shopId: request.user.shopId, date: { $gte: today, $lt: tomorrow }, deletedAt: null });
        if (count >= 500) {
          return reply.status(403).send({ error: 'Transaction limit reached. Please upgrade your plan.', code: 'TRANSACTION_LIMIT_REACHED' });
        }
      }

      const staff = await User.findOne({ _id: request.user.userId, isActive: true });
      if (!staff) return reply.status(404).send({ error: 'Staff not found' });

      // Resolve stock item if provided
      let stockItem = null;
      if (stockId && type === 'out') {
        stockItem = await Stock.findOne({ _id: stockId, shopId: request.user.shopId, isActive: true });
        if (!stockItem) return reply.status(404).send({ error: 'Stock item not found' });
        if (!quantitySold || quantitySold <= 0) return reply.status(400).send({ error: 'Quantity sold is required when a product is selected' });
      }

      // Resolve linked customer if provided
      let linkedCustomer = null;
      if (linkedCustomerId) {
        linkedCustomer = await Customer.findOne({ _id: linkedCustomerId, shopId: request.user.shopId, isActive: true });
        // Don't fail the transaction if customer not found — just skip linking
      }

      const transaction = await Transaction.create({
        shopId: request.user.shopId,
        type, customerName, amount: amountNum,
        productDescription: productDescription || (stockItem ? stockItem.name : null),
        date: new Date(date),
        payMode: payMode || 'cash',
        staffId: staff._id,
        staffName: staff.name,
        imageUrl: imageUrl || null,
        imageKey: imageKey || null,
        notes: notes || null,
        stockId:          stockItem ? stockItem._id  : null,
        stockName:        stockItem ? stockItem.name : null,
        stockCategory:    stockItem ? stockItem.category : null,
        quantitySold:     stockItem ? Number(quantitySold) : null,
        unit:             stockItem ? stockItem.unit : null,
        linkedCustomerId: linkedCustomer ? linkedCustomer._id : null,
        linkedCustomerUid:linkedCustomer ? linkedCustomer.customerId : null,
      });

      // Update customer wallet balance
      // Convention (matches wallet credit/debit routes):
      //   balance > 0 = customer has advance/credit  (isLoan = false)
      //   balance < 0 = customer owes money (loan)   (isLoan = true)
      // type 'out' = goods given → reduces customer's advance → balance decreases
      // type 'in'  = customer pays → increases customer's advance → balance increases
      if (linkedCustomer) {
        const balanceDelta = type === 'out' ? -amountNum : amountNum;
        linkedCustomer.balance += balanceDelta;
        linkedCustomer.isLoan = linkedCustomer.balance < 0;
        await linkedCustomer.save();
      }

      // Deduct stock and record movement
      if (stockItem) {
        const quantityBefore = stockItem.quantity;
        stockItem.quantity -= Number(quantitySold);
        await stockItem.save();

        await StockMovement.create({
          shopId: request.user.shopId,
          stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
          type: 'sale', quantity: -Number(quantitySold),
          quantityBefore, quantityAfter: stockItem.quantity,
          transactionId: transaction._id, customerName,
          note: notes || '', recordedBy: staff._id,
        });
      }

      return reply.status(201).send(formatTx(transaction));

    } catch (err) {
      console.error('Create transaction error:', err);
      return reply.status(500).send({ error: 'Failed to create transaction' });
    }
  });

  // PUT /transactions/:id
  fastify.put('/:id', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { id } = request.params;
      const filter = { _id: id, shopId: request.user.shopId, deletedAt: null };

      if (request.user.role === 'staff') {
        filter.staffId = request.user.userId;
        filter.createdAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
      }

      const exists = await Transaction.findOne(filter);
      if (!exists) return reply.status(404).send({ error: 'Transaction not found or cannot be edited' });

      const { customerName, amount, productDescription, date, payMode, imageUrl, notes, quantitySold } = request.body;
      const updates = {};

      if (customerName)              updates.customerName       = customerName;
      if (amount !== undefined) {
        const n = parseFloat(amount);
        if (isNaN(n) || n <= 0) return reply.status(400).send({ error: 'Amount must be a positive number' });
        updates.amount = n;
      }
      if (productDescription !== undefined) updates.productDescription = productDescription || null;
      if (date)     updates.date    = new Date(date);
      if (payMode) {
        if (!['cash', 'online'].includes(payMode)) return reply.status(400).send({ error: 'Pay mode must be "cash" or "online"' });
        updates.payMode = payMode;
      }
      if (imageUrl !== undefined)    updates.imageUrl  = imageUrl || null;
      if (notes !== undefined)       updates.notes     = notes || null;

      // Adjust stock if quantitySold changed on an 'out' transaction
      if (exists.stockId && quantitySold !== undefined) {
        const newQty = Number(quantitySold);
        const oldQty = exists.quantitySold || 0;
        const delta  = oldQty - newQty; // positive = stock returned, negative = more stock taken
        if (delta !== 0) {
          const stockItem = await Stock.findOne({ _id: exists.stockId, shopId: request.user.shopId });
          if (stockItem) {
            const quantityBefore = stockItem.quantity;
            stockItem.quantity   = Math.max(0, stockItem.quantity + delta);
            await stockItem.save();
            await StockMovement.create({
              shopId: request.user.shopId,
              stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
              type: 'adjustment', quantity: delta,
              quantityBefore, quantityAfter: stockItem.quantity,
              transactionId: exists._id,
              note: 'Transaction edit — qty adjusted', recordedBy: request.user.userId,
            });
          }
        }
        updates.quantitySold = newQty;
      }

      if (!Object.keys(updates).length) return reply.status(400).send({ error: 'No fields to update' });

      // If linked customer exists and amount/type changed, adjust their wallet balance
      if (exists.linkedCustomerId && (updates.amount !== undefined || updates.type !== undefined)) {
        const linkedCustomer = await Customer.findById(exists.linkedCustomerId);
        if (linkedCustomer) {
          const oldType   = exists.type;
          const oldAmount = exists.amount;
          const newType   = updates.type   || oldType;
          const newAmount = updates.amount !== undefined ? updates.amount : oldAmount;

          // out → balance decreases, in → balance increases (matches wallet convention)
          const oldEffect = oldType === 'out' ? -oldAmount : oldAmount;
          const newEffect = newType === 'out' ? -newAmount : newAmount;
          linkedCustomer.balance = linkedCustomer.balance - oldEffect + newEffect;
          linkedCustomer.isLoan = linkedCustomer.balance < 0;
          await linkedCustomer.save();
        }
      }

      const updated = await Transaction.findByIdAndUpdate(id, { $set: updates }, { new: true });
      return reply.send(formatTx(updated));

    } catch (err) {
      console.error('Update transaction error:', err);
      return reply.status(500).send({ error: 'Failed to update transaction' });
    }
  });

  // DELETE /transactions/:id  (soft delete)
  fastify.delete('/:id', { preHandler: [tenantResolver, roleCheck(['admin'])] }, async (request, reply) => {
    try {
      const result = await Transaction.findOneAndUpdate(
        { _id: request.params.id, shopId: request.user.shopId, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );
      if (!result) return reply.status(404).send({ error: 'Transaction not found' });
      return reply.send({ success: true });
    } catch (err) {
      console.error('Delete transaction error:', err);
      return reply.status(500).send({ error: 'Failed to delete transaction' });
    }
  });

  // GET /transactions/summary
  fastify.get('/summary', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { date_from, date_to, staff_id } = request.query;
      const filter = { shopId: request.user.shopId, deletedAt: null };

      if (request.user.role === 'staff') filter.staffId = request.user.userId;
      else if (staff_id)                 filter.staffId = staff_id;
      if (date_from || date_to) {
        filter.date = {};
        if (date_from) filter.date.$gte = new Date(date_from);
        if (date_to)   filter.date.$lte = new Date(date_to);
      }

      return reply.send(await buildSummary(filter));
    } catch (err) {
      console.error('Get summary error:', err);
      return reply.status(500).send({ error: 'Failed to get summary' });
    }
  });

  // GET /transactions/export  (CSV)
  fastify.get('/export', { preHandler: [tenantResolver, roleCheck(['admin'])] }, async (request, reply) => {
    try {
      const { date_from, date_to } = request.query;
      const filter = { shopId: request.user.shopId, deletedAt: null };
      if (date_from || date_to) {
        filter.date = {};
        if (date_from) filter.date.$gte = new Date(date_from);
        if (date_to)   filter.date.$lte = new Date(date_to);
      }

      const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 }).lean();

      const headers = ['Transaction Type','Customer Name','Product Description','Amount','Date','Payment Mode','Staff Name','Notes','Created At'];
      const csv = [
        headers.join(','),
        ...transactions.map(t => [
          t.type,
          `"${t.customerName}"`,
          t.productDescription ? `"${t.productDescription}"` : '',
          t.amount,
          new Date(t.date).toISOString().split('T')[0],
          t.payMode,
          `"${t.staffName}"`,
          t.notes ? `"${t.notes}"` : '',
          t.createdAt,
        ].join(',')),
      ].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="cashbook-${request.user.shopId}-${new Date().toISOString().split('T')[0]}.csv"`);
      return reply.send(csv);

    } catch (err) {
      console.error('Export error:', err);
      return reply.status(500).send({ error: 'Failed to export transactions' });
    }
  });
}
