import Purchase from '../models/Purchase.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import { tenantResolver } from '../middleware/tenantResolver.js';

const adminOnly = async (request, reply) => {
  if (request.user.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });
};

export default async function purchaseRoutes(fastify) {
  const adminAuth = { preHandler: [tenantResolver, adminOnly] };

  // ── GET /purchases — list all ──
  fastify.get('/', adminAuth, async (request, reply) => {
    const { status, vendor, dateFrom, dateTo, page = 1, limit = 50 } = request.query;
    const { shopId } = request.user;

    const filter = { shopId };
    if (status)  filter.status = status;
    if (vendor)  filter.vendor = { $regex: vendor, $options: 'i' };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = new Date(dateFrom);
      if (dateTo)   filter.date.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    const [purchases, total] = await Promise.all([
      Purchase.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Purchase.countDocuments(filter),
    ]);

    return reply.send({ purchases, total });
  });

  // ── POST /purchases — create ──
  fastify.post('/', adminAuth, async (request, reply) => {
    const { vendor, gstNo, items, date, notes, initialPayment, initialPayMode } = request.body;
    const { shopId, userId } = request.user;

    if (!vendor) return reply.status(400).send({ error: 'Vendor name is required' });
    if (!items || items.length === 0) return reply.status(400).send({ error: 'At least one item is required' });

    // Calculate totals
    const processedItems = items.map(item => ({
      ...item,
      totalPrice: Number(item.quantity) * Number(item.pricePerUnit),
    }));
    const totalAmount = processedItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const paid        = Number(initialPayment) || 0;
    const balance     = totalAmount - paid;
    const status      = paid === 0 ? 'pending' : balance <= 0 ? 'paid' : 'partial';

    const payments = paid > 0 ? [{ amount: paid, note: 'Initial payment', payMode: initialPayMode || 'cash', date: date ? new Date(date) : new Date(), recordedBy: userId }] : [];

    const purchase = await Purchase.create({
      shopId, vendor: vendor.trim(), gstNo: gstNo?.trim() || '',
      items: processedItems, totalAmount, paidAmount: paid, balance, status,
      date: date ? new Date(date) : new Date(), notes: notes || '',
      payments, recordedBy: userId,
    });

    // Auto-update stock: add quantity to existing item or create new
    for (const item of processedItems) {
      let stockItem = await Stock.findOne({ shopId, name: { $regex: `^${item.productName}$`, $options: 'i' } });

      if (stockItem) {
        const quantityBefore = stockItem.quantity;
        stockItem.quantity += Number(item.quantity);
        if (item.category) stockItem.category = item.category;
        await stockItem.save();

        await StockMovement.create({
          shopId, stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
          type: 'restock', quantity: Number(item.quantity),
          quantityBefore, quantityAfter: stockItem.quantity,
          note: `Purchase from ${vendor}`, recordedBy: userId,
          purchaseId: purchase._id,
        });

        // Link stockId back to purchase item
        const idx = purchase.items.findIndex(pi => pi.productName.toLowerCase() === item.productName.toLowerCase());
        if (idx !== -1) purchase.items[idx].stockId = stockItem._id;
      } else {
        // Create new stock item
        stockItem = await Stock.create({
          shopId, name: item.productName.trim(),
          category: item.category?.trim() || 'General',
          quantity: Number(item.quantity),
          unit: item.unit || 'pcs',
          pricePerUnit: Number(item.pricePerUnit),
        });

        await StockMovement.create({
          shopId, stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
          type: 'restock', quantity: Number(item.quantity),
          quantityBefore: 0, quantityAfter: Number(item.quantity),
          note: `New item from purchase — ${vendor}`, recordedBy: userId,
          purchaseId: purchase._id,
        });

        const idx = purchase.items.findIndex(pi => pi.productName.toLowerCase() === item.productName.toLowerCase());
        if (idx !== -1) purchase.items[idx].stockId = stockItem._id;
      }
    }

    await purchase.save();
    return reply.status(201).send(purchase);
  });

  // ── PUT /purchases/:id — edit details + items ──
  fastify.put('/:id', adminAuth, async (request, reply) => {
    const { vendor, gstNo, notes, date, items } = request.body;
    const { shopId, userId } = request.user;

    const purchase = await Purchase.findOne({ _id: request.params.id, shopId });
    if (!purchase) return reply.status(404).send({ error: 'Purchase not found' });

    if (vendor) purchase.vendor = vendor.trim();
    if (gstNo  !== undefined) purchase.gstNo = gstNo.trim();
    if (notes  !== undefined) purchase.notes = notes;
    if (date)  purchase.date  = new Date(date);

    // Update items + adjust stock if items provided
    if (items && items.length > 0) {
      for (const newItem of items) {
        const oldItem = purchase.items.find(
          pi => pi.productName.toLowerCase() === newItem.productName.toLowerCase()
        );
        const oldQty = oldItem ? Number(oldItem.quantity) : 0;
        const newQty = Number(newItem.quantity);
        const delta  = newQty - oldQty;

        if (delta !== 0) {
          const stockItem = await Stock.findOne({ shopId, name: { $regex: `^${newItem.productName}$`, $options: 'i' } });
          if (stockItem) {
            const quantityBefore = stockItem.quantity;
            stockItem.quantity   = Math.max(0, stockItem.quantity + delta);
            await stockItem.save();
            await StockMovement.create({
              shopId, stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
              type: delta > 0 ? 'restock' : 'adjustment',
              quantity: delta,
              quantityBefore, quantityAfter: stockItem.quantity,
              note: `Purchase edit — ${vendor || purchase.vendor}`, recordedBy: userId,
              purchaseId: purchase._id,
            });
          }
        }

        // Update item fields
        if (oldItem) {
          oldItem.quantity     = newQty;
          oldItem.pricePerUnit = Number(newItem.pricePerUnit) || oldItem.pricePerUnit;
          oldItem.totalPrice   = oldItem.quantity * oldItem.pricePerUnit;
        }
      }

      // Recalculate totals
      const newTotal    = purchase.items.reduce((s, i) => s + i.totalPrice, 0);
      purchase.totalAmount = newTotal;
      purchase.balance     = Math.max(0, newTotal - purchase.paidAmount);
      purchase.status      = purchase.paidAmount === 0 ? 'pending'
                           : purchase.balance <= 0    ? 'paid' : 'partial';
    }

    await purchase.save();
    return reply.send(purchase);
  });

  // ── POST /purchases/:id/payment — add a payment ──
  fastify.post('/:id/payment', adminAuth, async (request, reply) => {
    const { amount, note, date, payMode } = request.body;
    const { userId } = request.user;

    if (!amount || amount <= 0) return reply.status(400).send({ error: 'Amount must be greater than 0' });

    const purchase = await Purchase.findOne({ _id: request.params.id, shopId: request.user.shopId });
    if (!purchase) return reply.status(404).send({ error: 'Purchase not found' });
    if (purchase.status === 'paid') return reply.status(400).send({ error: 'Purchase already fully paid' });

    purchase.payments.push({ amount: Number(amount), note: note || '', payMode: payMode || 'cash', date: date ? new Date(date) : new Date(), recordedBy: userId });
    purchase.paidAmount += Number(amount);
    purchase.balance     = purchase.totalAmount - purchase.paidAmount;
    purchase.status      = purchase.balance <= 0 ? 'paid' : 'partial';
    if (purchase.balance < 0) purchase.balance = 0;

    await purchase.save();
    return reply.send(purchase);
  });

  // ── DELETE /purchases/:id — delete ──
  fastify.delete('/:id', adminAuth, async (request, reply) => {
    const purchase = await Purchase.findOneAndDelete({ _id: request.params.id, shopId: request.user.shopId });
    if (!purchase) return reply.status(404).send({ error: 'Purchase not found' });
    return reply.send({ success: true });
  });

  // ── GET /purchases/summary — totals ──
  fastify.get('/summary', adminAuth, async (request, reply) => {
    const { shopId } = request.user;
    const [result] = await Purchase.aggregate([
      { $match: { shopId } },
      { $group: {
        _id: null,
        totalPurchased: { $sum: '$totalAmount' },
        totalPaid:      { $sum: '$paidAmount' },
        totalBalance:   { $sum: '$balance' },
        pending:        { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        partial:        { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } },
        paid:           { $sum: { $cond: [{ $eq: ['$status', 'paid']    }, 1, 0] } },
      }},
    ]);
    return reply.send(result || { totalPurchased: 0, totalPaid: 0, totalBalance: 0, pending: 0, partial: 0, paid: 0 });
  });
}
