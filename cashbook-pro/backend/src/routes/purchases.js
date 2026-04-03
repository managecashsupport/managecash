import Purchase from '../models/Purchase.js';
import Stock from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
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

        if (delta !== 0 || !oldItem) {
          let stockItem = await Stock.findOne({ shopId, name: { $regex: `^${newItem.productName}$`, $options: 'i' } });
          if (stockItem) {
            if (delta !== 0) {
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
          } else if (!oldItem) {
            // New product added during edit — create stock entry
            stockItem = await Stock.create({
              shopId, name: newItem.productName.trim(),
              category: newItem.category?.trim() || 'General',
              quantity: Number(newItem.quantity),
              unit: newItem.unit || 'pcs',
              pricePerUnit: Number(newItem.pricePerUnit),
            });
            await StockMovement.create({
              shopId, stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
              type: 'restock', quantity: Number(newItem.quantity),
              quantityBefore: 0, quantityAfter: Number(newItem.quantity),
              note: `New item from purchase edit — ${vendor || purchase.vendor}`, recordedBy: userId,
              purchaseId: purchase._id,
            });
          }
        }

        // Update item fields
        if (oldItem) {
          oldItem.quantity     = newQty;
          oldItem.pricePerUnit = Number(newItem.pricePerUnit) || oldItem.pricePerUnit;
          oldItem.totalPrice   = oldItem.quantity * oldItem.pricePerUnit;
        } else {
          // Brand new item added during edit
          purchase.items.push({
            productName:  newItem.productName.trim(),
            category:     newItem.category?.trim() || 'General',
            quantity:     newQty,
            unit:         newItem.unit || 'pcs',
            pricePerUnit: Number(newItem.pricePerUnit) || 0,
            totalPrice:   newQty * (Number(newItem.pricePerUnit) || 0),
          });
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
    if (Number(amount) > purchase.balance) return reply.status(400).send({ error: `Payment (₹${amount}) exceeds outstanding balance (₹${purchase.balance})` });

    const payDate = date ? new Date(date) : new Date();

    purchase.payments.push({ amount: Number(amount), note: note || '', payMode: payMode || 'cash', date: payDate, recordedBy: userId });
    purchase.paidAmount += Number(amount);
    purchase.balance     = purchase.totalAmount - purchase.paidAmount;
    purchase.status      = purchase.balance <= 0 ? 'paid' : 'partial';
    if (purchase.balance < 0) purchase.balance = 0;

    await purchase.save();

    // Mirror in Transaction so it appears in History and Dashboard
    const staff = await User.findById(userId).lean();
    await Transaction.create({
      shopId: request.user.shopId, type: 'out',
      customerName: purchase.vendor,
      amount: Number(amount),
      productDescription: `Purchase payment — ${purchase.vendor}`,
      date: payDate,
      payMode: payMode || 'cash',
      staffId: userId, staffName: staff?.name || '',
      notes: note || '',
      sourceId: purchase._id, sourceType: 'purchase',
      deletedAt: null,
    });

    return reply.send(purchase);
  });

  // ── DELETE /purchases/:id — delete ──
  fastify.delete('/:id', adminAuth, async (request, reply) => {
    const { shopId, userId } = request.user;
    const purchase = await Purchase.findOneAndDelete({ _id: request.params.id, shopId });
    if (!purchase) return reply.status(404).send({ error: 'Purchase not found' });

    // 1. Reverse stock for all items in this purchase
    for (const item of purchase.items) {
      if (!item.stockId) continue;
      const stockItem = await Stock.findById(item.stockId);
      if (!stockItem) continue;
      const quantityBefore = stockItem.quantity;
      stockItem.quantity = Math.max(0, stockItem.quantity - Number(item.quantity));
      await stockItem.save();
      await StockMovement.create({
        shopId, stockId: stockItem._id, stockName: stockItem.name, stockCategory: stockItem.category,
        type: 'adjustment', quantity: -Number(item.quantity),
        quantityBefore, quantityAfter: stockItem.quantity,
        note: `Purchase deleted — stock reversed (${purchase.vendor})`, recordedBy: userId,
        purchaseId: purchase._id,
      });
    }

    // 2. Soft-delete all mirror Transactions created from payments on this purchase
    await Transaction.updateMany(
      { sourceId: purchase._id, sourceType: 'purchase', deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );

    return reply.send({ success: true });
  });

  // ── GET /purchases/vendors — distinct vendor names for this tenant ──
  fastify.get('/vendors', adminAuth, async (request, reply) => {
    const { shopId } = request.user;
    const vendors = await Purchase.distinct('vendor', { shopId });
    return reply.send({ vendors: vendors.sort((a, b) => a.localeCompare(b)) });
  });

  // ── GET /purchases/open-by-vendor — most recent pending/partial purchase for a vendor ──
  fastify.get('/open-by-vendor', adminAuth, async (request, reply) => {
    const { shopId } = request.user;
    const { vendor } = request.query;
    if (!vendor) return reply.status(400).send({ error: 'vendor is required' });

    // Escape regex special chars so vendor names with dots/parens etc. are safe
    const escaped = vendor.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const purchase = await Purchase.findOne({
      shopId,
      vendor: { $regex: `^${escaped}$`, $options: 'i' },
      status: { $in: ['pending', 'partial'] },
    }).sort({ date: -1 });

    return reply.send({ purchase: purchase || null });
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
