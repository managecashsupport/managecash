import jwt from 'jsonwebtoken';
import Tenant from '../models/Tenant.js';

export async function tenantResolver(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { userId, shopId, role } = payload;

    if (!shopId || !userId) {
      return reply.status(401).send({ error: 'Invalid token payload' });
    }

    const tenant = await Tenant.findOne({ shopId });
    if (!tenant) {
      return reply.status(401).send({ error: 'Shop not found' });
    }

    if (tenant.status === 'suspended') {
      return reply.status(403).send({ error: 'Account suspended. Please contact support.' });
    }

    if (tenant.status === 'trial' && new Date() > new Date(tenant.trialEndsAt)) {
      return reply.status(403).send({ error: 'Trial expired. Please upgrade your plan.', code: 'TRIAL_EXPIRED' });
    }

    request.user   = { userId, shopId, role };
    request.tenant = { status: tenant.status, plan: tenant.plan };

  } catch (err) {
    if (err.name === 'JsonWebTokenError')  return reply.status(401).send({ error: 'Invalid token' });
    if (err.name === 'TokenExpiredError')  return reply.status(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    return reply.status(500).send({ error: 'Authentication error' });
  }
}
