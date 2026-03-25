import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

async function superAdminAuth(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'No super admin token provided' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.SUPERADMIN_JWT_SECRET);
    if (payload.role !== 'superadmin') {
      return reply.status(403).send({ error: 'Access denied' });
    }
    request.superAdmin = payload;
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return reply.status(401).send({ error: 'Invalid super admin token' });
    }
    return reply.status(500).send({ error: 'Authentication error' });
  }
}

export default async function superadminRoutes(fastify) {

  // GET /superadmin/tenants
  fastify.get('/tenants', { preHandler: [superAdminAuth] }, async (request, reply) => {
    try {
      const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
      return reply.send(tenants);
    } catch (err) {
      console.error('Get tenants error:', err);
      return reply.status(500).send({ error: 'Failed to fetch tenants' });
    }
  });

  // GET /superadmin/stats
  fastify.get('/stats', { preHandler: [superAdminAuth] }, async (request, reply) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [statusCounts, newThisMonth] = await Promise.all([
        Tenant.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),
        Tenant.countDocuments({ createdAt: { $gte: monthStart } }),
      ]);

      const counts = { trial: 0, active: 0, suspended: 0, cancelled: 0, grace_period: 0 };
      let totalTenants = 0;
      for (const s of statusCounts) {
        counts[s._id] = s.count;
        totalTenants += s.count;
      }

      const mrrMap = { starter: 499, growth: 999, pro: 1499 };
      const activeTenants = await Tenant.find({ status: 'active' }, 'plan').lean();
      const totalMRR = activeTenants.reduce((sum, t) => sum + (mrrMap[t.plan] || 0), 0);

      return reply.send({
        totalTenants,
        activeTenants: counts.active,
        trialTenants: counts.trial,
        suspendedTenants: counts.suspended,
        totalMRR,
        churnRate: '0.00',
        newTenantsThisMonth: newThisMonth,
        transactionsToday: 0,
      });
    } catch (err) {
      console.error('Get stats error:', err);
      return reply.status(500).send({ error: 'Failed to fetch stats' });
    }
  });

  // PUT /superadmin/tenants/:shopId/suspend
  fastify.put('/tenants/:shopId/suspend', { preHandler: [superAdminAuth] }, async (request, reply) => {
    try {
      const tenant = await Tenant.findOneAndUpdate(
        { shopId: request.params.shopId },
        { $set: { status: 'suspended' } },
        { new: true }
      );
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
      return reply.send({ success: true, tenant });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to suspend tenant' });
    }
  });

  // PUT /superadmin/tenants/:shopId/activate
  fastify.put('/tenants/:shopId/activate', { preHandler: [superAdminAuth] }, async (request, reply) => {
    try {
      const tenant = await Tenant.findOneAndUpdate(
        { shopId: request.params.shopId },
        { $set: { status: 'active' } },
        { new: true }
      );
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
      return reply.send({ success: true, tenant });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to activate tenant' });
    }
  });

  // PUT /superadmin/tenants/:shopId/plan
  fastify.put('/tenants/:shopId/plan', { preHandler: [superAdminAuth] }, async (request, reply) => {
    try {
      const { plan } = request.body;
      if (!plan || !['starter', 'growth', 'pro'].includes(plan)) {
        return reply.status(400).send({ error: 'Invalid plan' });
      }
      const tenant = await Tenant.findOneAndUpdate(
        { shopId: request.params.shopId },
        { $set: { plan } },
        { new: true }
      );
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
      return reply.send({ success: true, tenant });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to update tenant plan' });
    }
  });

  // DELETE /superadmin/tenants/:shopId
  fastify.delete('/tenants/:shopId', { preHandler: [superAdminAuth] }, async (request, reply) => {
    try {
      const { shopId } = request.params;
      const tenant = await Tenant.findOneAndDelete({ shopId });
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });

      // Delete all related data
      await Promise.all([
        User.deleteMany({ shopId }),
        Transaction.deleteMany({ shopId }),
      ]);

      return reply.send({ success: true, deletedTenant: { shopId: tenant.shopId, shopName: tenant.shopName } });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to delete tenant' });
    }
  });
}
