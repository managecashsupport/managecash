import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const SECRET = process.env.ADMIN_DASHBOARD_SECRET || 'admin3636secret';

function checkSecret(request, reply) {
  const key = request.headers['x-admin-key'] || request.query.key;
  if (key !== SECRET) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export default async function adminDashboardRoutes(fastify) {

  // GET /admin3636secret/stats
  fastify.get('/stats', { preHandler: [checkSecret] }, async (request, reply) => {
    try {
      const now = new Date();
      const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart    = new Date(now); weekStart.setDate(now.getDate() - 7);
      const monthStart   = new Date(now.getFullYear(), now.getMonth(), 1);
      const last30       = new Date(now); last30.setDate(now.getDate() - 30);

      const [
        allTenants,
        newToday,
        newThisWeek,
        newThisMonth,
        totalUsers,
        txToday,
        txThisWeek,
        txThisMonth,
        statusCounts,
        planCounts,
        recentTxShops,
      ] = await Promise.all([
        Tenant.find().sort({ createdAt: -1 }).lean(),
        Tenant.countDocuments({ createdAt: { $gte: todayStart } }),
        Tenant.countDocuments({ createdAt: { $gte: weekStart } }),
        Tenant.countDocuments({ createdAt: { $gte: monthStart } }),
        User.countDocuments(),
        Transaction.countDocuments({ createdAt: { $gte: todayStart }, deletedAt: null }),
        Transaction.countDocuments({ createdAt: { $gte: weekStart }, deletedAt: null }),
        Transaction.countDocuments({ createdAt: { $gte: monthStart }, deletedAt: null }),
        Tenant.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Tenant.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
        // shops that had a transaction in the last 7 days
        Transaction.distinct('shopId', { createdAt: { $gte: weekStart }, deletedAt: null }),
      ]);

      // Per-tenant enriched data
      const shopIds = allTenants.map(t => t.shopId);
      const [userCounts, txCounts, lastTxDates] = await Promise.all([
        User.aggregate([
          { $match: { shopId: { $in: shopIds } } },
          { $group: { _id: '$shopId', count: { $sum: 1 } } }
        ]),
        Transaction.aggregate([
          { $match: { shopId: { $in: shopIds }, deletedAt: null } },
          { $group: { _id: '$shopId', count: { $sum: 1 } } }
        ]),
        Transaction.aggregate([
          { $match: { shopId: { $in: shopIds }, deletedAt: null } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$shopId', lastAt: { $first: '$createdAt' } } }
        ]),
      ]);

      const userCountMap  = Object.fromEntries(userCounts.map(u => [u._id, u.count]));
      const txCountMap    = Object.fromEntries(txCounts.map(t => [t._id, t.count]));
      const lastTxMap     = Object.fromEntries(lastTxDates.map(t => [t._id, t.lastAt]));
      const activeShopSet = new Set(recentTxShops);

      const tenants = allTenants.map(t => ({
        shopId:       t.shopId,
        shopName:     t.shopName,
        ownerName:    t.ownerName,
        ownerEmail:   t.ownerEmail,
        plan:         t.plan,
        status:       t.status,
        trialEndsAt:  t.trialEndsAt,
        createdAt:    t.createdAt,
        userCount:    userCountMap[t.shopId] || 0,
        txCount:      txCountMap[t.shopId]   || 0,
        lastActivity: lastTxMap[t.shopId]    || null,
        activeThisWeek: activeShopSet.has(t.shopId),
      }));

      const statusMap = Object.fromEntries(statusCounts.map(s => [s._id, s.count]));
      const planMap   = Object.fromEntries(planCounts.map(p => [p._id, p.count]));

      return reply.send({
        overview: {
          totalTenants:   allTenants.length,
          totalUsers,
          activeThisWeek: recentTxShops.length,
          newToday,
          newThisWeek,
          newThisMonth,
          txToday,
          txThisWeek,
          txThisMonth,
        },
        byStatus: {
          trial:        statusMap.trial        || 0,
          active:       statusMap.active       || 0,
          grace_period: statusMap.grace_period || 0,
          suspended:    statusMap.suspended    || 0,
          cancelled:    statusMap.cancelled    || 0,
        },
        byPlan: {
          monthly:    planMap.monthly     || 0,
          yearly:     planMap.yearly      || 0,
          yearly_pro: planMap.yearly_pro  || 0,
          none:       planMap.null        || 0,
        },
        tenants,
        generatedAt: now,
      });
    } catch (err) {
      console.error('Admin dashboard error:', err);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });
}
