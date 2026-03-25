import bcrypt from 'bcrypt';
import { tenantResolver } from '../middleware/tenantResolver.js';
import { roleCheck } from '../middleware/roleCheck.js';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Transaction from '../models/Transaction.js';

function formatUser(user, txCount = 0, tenant = null) {
  return {
    id:               user._id,
    name:             user.name,
    username:         user.username,
    role:             user.role,
    shopId:           user.shopId,
    isActive:         user.isActive,
    createdAt:        user.createdAt,
    transactionCount: txCount,
    ...(tenant ? {
      plan:               tenant.plan,
      subscriptionStatus: tenant.status,
      trialEndsAt:        tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
    } : {}),
  };
}

export default async function userRoutes(fastify) {

  // GET /users
  fastify.get('/', { preHandler: [tenantResolver, roleCheck(['admin'])] }, async (request, reply) => {
    try {
      const users = await User.find({ shopId: request.user.shopId, isActive: true }).lean();

      // Get transaction counts for all users in one query
      const counts = await Transaction.aggregate([
        { $match: { shopId: request.user.shopId, deletedAt: null } },
        { $group: { _id: '$staffId', count: { $sum: 1 } } },
      ]);
      const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));

      return reply.send(users.map(u => formatUser(u, countMap[u._id.toString()] || 0)));
    } catch (err) {
      console.error('Get users error:', err);
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });

  // POST /users  — admin creates a new staff/admin user
  fastify.post('/', { preHandler: [tenantResolver, roleCheck(['admin'])] }, async (request, reply) => {
    try {
      const { name, username, email, phone, password, role } = request.body;

      if (!name || !username || !password || !role) {
        return reply.status(400).send({ error: 'Name, username, password, and role are required' });
      }
      if (!['admin', 'staff'].includes(role)) {
        return reply.status(400).send({ error: 'Role must be "admin" or "staff"' });
      }
      if (password.length < 8 || !/(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return reply.status(400).send({ error: 'Password must be at least 8 characters with one uppercase and one number' });
      }

      const existing = await User.findOne({ shopId: request.user.shopId, username });
      if (existing) return reply.status(400).send({ error: 'Username already exists' });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ shopId: request.user.shopId, name, username, email: email || null, phone: phone || null, passwordHash, role });

      return reply.status(201).send(formatUser(user));
    } catch (err) {
      console.error('Create user error:', err);
      return reply.status(500).send({ error: 'Failed to create user' });
    }
  });

  // GET /users/me
  fastify.get('/me', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const [user, tenant] = await Promise.all([
        User.findById(request.user.userId).lean(),
        Tenant.findOne({ shopId: request.user.shopId }).lean(),
      ]);
      if (!user) return reply.status(404).send({ error: 'User not found' });
      return reply.send(formatUser(user, 0, tenant));
    } catch (err) {
      console.error('Get current user error:', err);
      return reply.status(500).send({ error: 'Failed to fetch user profile' });
    }
  });

  // PUT /users/me  — update own profile
  fastify.put('/me', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { name, email, phone } = request.body || {};
      const updates = {};
      if (name?.trim())  updates.name  = name.trim();
      if (email !== undefined) updates.email = email || null;
      if (phone !== undefined) updates.phone = phone || null;

      if (!Object.keys(updates).length) {
        return reply.status(400).send({ error: 'No fields to update' });
      }

      const user = await User.findByIdAndUpdate(
        request.user.userId,
        { $set: updates },
        { new: true }
      );
      if (!user) return reply.status(404).send({ error: 'User not found' });
      return reply.send(formatUser(user));
    } catch (err) {
      console.error('Update profile error:', err);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  // PUT /users/me/password
  fastify.put('/me/password', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { currentPassword, newPassword } = request.body;
      if (!currentPassword || !newPassword) {
        return reply.status(400).send({ error: 'Current and new password are required' });
      }
      if (newPassword.length < 8 || !/(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
        return reply.status(400).send({ error: 'New password must be at least 8 characters with one uppercase and one number' });
      }

      const user = await User.findById(request.user.userId);
      if (!user) return reply.status(404).send({ error: 'User not found' });

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return reply.status(400).send({ error: 'Current password is incorrect' });

      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await user.save();

      return reply.send({ success: true });
    } catch (err) {
      console.error('Change password error:', err);
      return reply.status(500).send({ error: 'Failed to change password' });
    }
  });

  // PUT /users/:id
  fastify.put('/:id', { preHandler: [tenantResolver, roleCheck(['admin'])] }, async (request, reply) => {
    try {
      const { id } = request.params;
      if (id === request.user.userId) {
        return reply.status(400).send({ error: 'Cannot update your own account' });
      }

      const { name, role, isActive } = request.body;
      const updates = {};
      if (name)             updates.name     = name;
      if (role) {
        if (!['admin', 'staff'].includes(role)) return reply.status(400).send({ error: 'Role must be "admin" or "staff"' });
        updates.role = role;
      }
      if (isActive !== undefined) updates.isActive = isActive;

      if (!Object.keys(updates).length) return reply.status(400).send({ error: 'No fields to update' });

      const user = await User.findOneAndUpdate(
        { _id: id, shopId: request.user.shopId },
        { $set: updates },
        { new: true }
      );
      if (!user) return reply.status(404).send({ error: 'User not found' });
      return reply.send(formatUser(user));
    } catch (err) {
      console.error('Update user error:', err);
      return reply.status(500).send({ error: 'Failed to update user' });
    }
  });

  // DELETE /users/:id  (soft delete)
  fastify.delete('/:id', { preHandler: [tenantResolver, roleCheck(['admin'])] }, async (request, reply) => {
    try {
      const { id } = request.params;
      if (id === request.user.userId) {
        return reply.status(400).send({ error: 'Cannot delete your own account' });
      }

      const user = await User.findOne({ _id: id, shopId: request.user.shopId, isActive: true });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ shopId: request.user.shopId, role: 'admin', isActive: true });
        if (adminCount <= 1) return reply.status(400).send({ error: 'Cannot delete the only admin user' });
      }

      await User.findByIdAndUpdate(id, { $set: { isActive: false } });
      return reply.send({ success: true });
    } catch (err) {
      console.error('Delete user error:', err);
      return reply.status(500).send({ error: 'Failed to delete user' });
    }
  });
}
