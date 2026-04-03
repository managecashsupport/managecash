import Stock, { LOW_STOCK_THRESHOLD } from '../models/Stock.js';
import StockMovement from '../models/StockMovement.js';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { roleCheck } from '../middleware/roleCheck.js';

export default async function stockRoutes(fastify) {
  const auth      = { preHandler: [tenantResolver] };
  const adminAuth = { preHandler: [tenantResolver, roleCheck(['admin'])] };

  // ── GET /stock — paginated list ──
  fastify.get('/', auth, async (request, reply) => {
    const { category, search, lowStock, page = 1, limit = 100 } = request.query;
    const { shopId } = request.user;
    const limitNum = Math.min(parseInt(limit), 500);
    const skip     = (parseInt(page) - 1) * limitNum;

    const filter = { shopId, isActive: true };
    if (category) filter.category = { $regex: category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (search)   filter.$or = [
      { name:        { $regex: search, $options: 'i' } },
      { category:    { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
    if (lowStock === 'true') filter.quantity = { $lte: LOW_STOCK_THRESHOLD };

    const [items, total] = await Promise.all([
      Stock.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(limitNum).lean(),
      Stock.countDocuments(filter),
    ]);

    // Group by category (done on the already-paginated subset)
    const grouped = items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    return reply.send({ items, grouped, total, page: parseInt(page), totalPages: Math.ceil(total / limitNum), lowStockThreshold: LOW_STOCK_THRESHOLD });
  });

  // ── GET /stock/categories — distinct categories ──
  fastify.get('/categories', auth, async (request, reply) => {
    const categories = await Stock.distinct('category', { shopId: request.user.shopId, isActive: true });
    return reply.send(categories.sort());
  });

  // ── POST /stock — create item ──
  fastify.post('/', auth, async (request, reply) => {
    const { name, category, description, quantity, unit, pricePerUnit } = request.body;
    const { shopId } = request.user;

    if (!name || !category) return reply.status(400).send({ error: 'Name and category are required' });
    if (pricePerUnit === undefined || pricePerUnit < 0) return reply.status(400).send({ error: 'Price per unit is required' });

    const item = await Stock.create({
      shopId, name: name.trim(), category: category.trim(),
      description: description?.trim() || '',
      quantity: Number(quantity) || 0,
      unit: unit?.trim() || 'pcs',
      pricePerUnit: Number(pricePerUnit),
    });

    return reply.status(201).send(item);
  });

  // ── PUT /stock/:id — update item details ──
  fastify.put('/:id', auth, async (request, reply) => {
    const { name, category, description, unit, pricePerUnit } = request.body;
    const { shopId } = request.user;

    const item = await Stock.findOne({ _id: request.params.id, shopId });
    if (!item) return reply.status(404).send({ error: 'Stock item not found' });

    if (name)            item.name        = name.trim();
    if (category)        item.category    = category.trim();
    if (description !== undefined && description !== null) item.description = description.trim();
    if (description === null) item.description = '';
    if (unit)            item.unit        = unit.trim();
    if (pricePerUnit !== undefined) item.pricePerUnit = Number(pricePerUnit);

    await item.save();
    return reply.send(item);
  });

  // ── POST /stock/:id/restock — add quantity ──
  fastify.post('/:id/restock', auth, async (request, reply) => {
    const { quantity, note } = request.body;
    const { shopId, userId } = request.user;

    if (!quantity || quantity <= 0) return reply.status(400).send({ error: 'Quantity must be greater than 0' });

    const item = await Stock.findOne({ _id: request.params.id, shopId, isActive: true });
    if (!item) return reply.status(404).send({ error: 'Stock item not found' });

    const quantityBefore = item.quantity;
    item.quantity += Number(quantity);
    await item.save();

    await StockMovement.create({
      shopId, stockId: item._id, stockName: item.name, stockCategory: item.category,
      type: 'restock', quantity: Number(quantity),
      quantityBefore, quantityAfter: item.quantity,
      note: note || '', recordedBy: userId,
    });

    return reply.send(item);
  });

  // ── POST /stock/:id/adjust — manual adjustment ──
  fastify.post('/:id/adjust', auth, async (request, reply) => {
    const { quantity, note } = request.body; // can be negative
    const { shopId, userId } = request.user;

    if (quantity === undefined) return reply.status(400).send({ error: 'Quantity required' });

    const item = await Stock.findOne({ _id: request.params.id, shopId, isActive: true });
    if (!item) return reply.status(404).send({ error: 'Stock item not found' });

    const newQty = item.quantity + Number(quantity);
    if (newQty < 0) return reply.status(400).send({ error: `Cannot reduce by ${Math.abs(Number(quantity))} — only ${item.quantity} in stock` });

    const quantityBefore = item.quantity;
    item.quantity = newQty;
    await item.save();

    await StockMovement.create({
      shopId, stockId: item._id, stockName: item.name, stockCategory: item.category,
      type: 'adjustment', quantity: Number(quantity),
      quantityBefore, quantityAfter: item.quantity,
      note: note || '', recordedBy: userId,
    });

    return reply.send(item);
  });

  // ── DELETE /stock/:id — soft delete (admin only) ──
  fastify.delete('/:id', adminAuth, async (request, reply) => {
    const item = await Stock.findOne({ _id: request.params.id, shopId: request.user.shopId });
    if (!item) return reply.status(404).send({ error: 'Stock item not found' });
    item.isActive = false;
    await item.save();
    return reply.send({ success: true });
  });

  // ── GET /stock/:id/movements — history for one item ──
  fastify.get('/:id/movements', auth, async (request, reply) => {
    const { page = 1, limit = 30 } = request.query;
    const { shopId } = request.user;

    const item = await Stock.findOne({ _id: request.params.id, shopId });
    if (!item) return reply.status(404).send({ error: 'Stock item not found' });

    const [movements, total] = await Promise.all([
      StockMovement.find({ shopId, stockId: item._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('recordedBy', 'name'),
      StockMovement.countDocuments({ shopId, stockId: item._id }),
    ]);

    return reply.send({ item, movements, total });
  });

  // ── GET /stock/analytics/sales — sales by category ──
  fastify.get('/analytics/sales', auth, async (request, reply) => {
    const { dateFrom, dateTo } = request.query;
    const { shopId } = request.user;

    const matchFilter = { shopId, type: 'sale' };
    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) matchFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   matchFilter.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }

    const [byCategory, byItem, totalMovements] = await Promise.all([
      // Sales grouped by category
      StockMovement.aggregate([
        { $match: matchFilter },
        { $group: {
          _id: '$stockCategory',
          totalQuantity: { $sum: { $abs: '$quantity' } },
          totalRevenue:  { $sum: { $multiply: [{ $abs: '$quantity' }, { $literal: 0 }] } }, // placeholder
          count: { $sum: 1 },
        }},
        { $sort: { totalQuantity: -1 } },
      ]),
      // Top selling items
      StockMovement.aggregate([
        { $match: matchFilter },
        { $group: {
          _id: { stockId: '$stockId', stockName: '$stockName', stockCategory: '$stockCategory' },
          totalQuantity: { $sum: { $abs: '$quantity' } },
          count: { $sum: 1 },
        }},
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
      ]),
      StockMovement.countDocuments(matchFilter),
    ]);

    // Enrich byCategory with revenue from Stock prices
    const categoryRevenue = await StockMovement.aggregate([
      { $match: matchFilter },
      { $lookup: {
        from: 'stocks',
        localField: 'stockId',
        foreignField: '_id',
        as: 'stock',
      }},
      { $unwind: { path: '$stock', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: '$stockCategory',
        totalQuantity: { $sum: { $abs: '$quantity' } },
        totalRevenue:  { $sum: { $multiply: [{ $abs: '$quantity' }, { $ifNull: ['$stock.pricePerUnit', 0] }] } },
        count: { $sum: 1 },
      }},
      { $sort: { totalRevenue: -1 } },
    ]);

    return reply.send({ byCategory: categoryRevenue, byItem, totalMovements });
  });
}
