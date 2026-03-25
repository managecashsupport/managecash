import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import InviteCode from '../models/InviteCode.js';
import { sendVerificationEmail } from '../services/email.js';

function generateTokens(userId, shopId, role) {
  const accessToken = jwt.sign(
    { userId, shopId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, shopId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' }
  );
  return { accessToken, refreshToken };
}

function setRefreshTokenCookie(reply, refreshToken) {
  const isProd = process.env.NODE_ENV === 'production';
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax', // 'none' required for cross-origin on Vercel
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // seconds
  });
}

function clearRefreshTokenCookie(reply) {
  const isProd = process.env.NODE_ENV === 'production';
  reply.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}

export default async function authRoutes(fastify) {

  // POST /auth/register  — creates tenant + admin user
  fastify.post('/register', async (request, reply) => {
    try {
      const { shopId, shopName, ownerName, ownerEmail, password, confirmPassword } = request.body;

      if (!shopId || !shopName || !ownerName || !ownerEmail || !password || !confirmPassword) {
        return reply.status(400).send({ error: 'All fields are required' });
      }
      if (password !== confirmPassword) {
        return reply.status(400).send({ error: 'Passwords do not match' });
      }
      if (!/^[a-zA-Z0-9_]{4,30}$/.test(shopId)) {
        return reply.status(400).send({ error: 'Shop ID must be 4-30 characters: letters, numbers, underscores only' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
        return reply.status(400).send({ error: 'Invalid email format' });
      }
      if (password.length < 8 || !/(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return reply.status(400).send({ error: 'Password must be at least 8 characters with one uppercase letter and one number' });
      }

      const existing = await Tenant.findOne({ shopId });
      if (existing) {
        return reply.status(400).send({ error: 'Shop ID already exists' });
      }

      // Create tenant
      const tenant = await Tenant.create({ shopId, shopName, ownerName, ownerEmail });

      // Create admin user — unverified until email confirmed
      const username = `${shopId}_admin`;
      const passwordHash = await bcrypt.hash(password, 12);
      const verifyToken = randomBytes(32).toString('hex');
      const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      const user = await User.create({
        shopId, name: ownerName, username, email: ownerEmail, passwordHash, role: 'admin',
        emailVerified: false, emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry,
      });

      // Send verification email (non-blocking — don't fail registration if email fails)
      sendVerificationEmail({ to: ownerEmail, name: ownerName, token: verifyToken })
        .catch(err => console.error('Verification email failed:', err.message));

      return reply.status(201).send({
        requiresVerification: true,
        email: ownerEmail,
        shopId,
        username,
      });

    } catch (err) {
      console.error('Registration error:', err);
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });

  // POST /auth/login
  fastify.post('/login', async (request, reply) => {
    try {
      const { shopId, username, password } = request.body;

      if (!username || !password) {
        return reply.status(400).send({ error: 'Username/email and password are required' });
      }

      let user, tenant;

      if (shopId) {
        // Admin login: shopId provided — search within that shop
        tenant = await Tenant.findOne({ shopId });
        if (!tenant) return reply.status(401).send({ error: 'Invalid credentials' });

        if (tenant.status === 'suspended') {
          return reply.status(403).send({ error: 'Account suspended. Please contact support.' });
        }
        if (tenant.status === 'trial' && new Date() > new Date(tenant.trialEndsAt)) {
          return reply.status(403).send({ error: 'Trial expired. Please upgrade your plan.', code: 'TRIAL_EXPIRED' });
        }

        user = await User.findOne({
          shopId,
          isActive: true,
          $or: [{ username }, { email: username }, { phone: username }],
        });
      } else {
        // Staff login: no shopId — search by email or phone globally
        const cleanPhone = username.replace(/\s+/g, '');
        user = await User.findOne({
          isActive: true,
          $or: [{ email: username }, { phone: cleanPhone }],
        });
        if (user) {
          tenant = await Tenant.findOne({ shopId: user.shopId });
          if (!tenant || tenant.status === 'suspended') {
            return reply.status(403).send({ error: 'Account suspended. Please contact support.' });
          }
          if (tenant.status === 'trial' && new Date() > new Date(tenant.trialEndsAt)) {
            return reply.status(403).send({ error: 'Trial expired. Please upgrade your plan.', code: 'TRIAL_EXPIRED' });
          }
        }
      }

      if (!user) return reply.status(401).send({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

      // Block login if email not verified (admin only — staff don't have email verification)
      if (user.role === 'admin' && !user.emailVerified) {
        return reply.status(403).send({
          error: 'Please verify your email before signing in. Check your inbox for the verification link.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        });
      }

      const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.shopId, user.role);
      setRefreshTokenCookie(reply, refreshToken);

      return reply.send({
        accessToken,
        user: { id: user._id, name: user.name, role: user.role, shopId: user.shopId, plan: tenant.plan, username: user.username, subscriptionStatus: tenant.status, trialEndsAt: tenant.trialEndsAt, subscriptionEndsAt: tenant.subscriptionEndsAt },
      });

    } catch (err) {
      console.error('Login error:', err);
      return reply.status(500).send({ error: 'Login failed' });
    }
  });

  // POST /auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      if (!refreshToken) return reply.status(401).send({ error: 'No refresh token provided' });

      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const { userId, shopId, role } = payload;

      const user = await User.findOne({ _id: userId, isActive: true });
      if (!user) {
        clearRefreshTokenCookie(reply);
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      const accessToken = jwt.sign(
        { userId, shopId, role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
      );

      return reply.send({ accessToken });

    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        clearRefreshTokenCookie(reply);
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }
      return reply.status(500).send({ error: 'Token refresh failed' });
    }
  });

  // POST /auth/logout
  fastify.post('/logout', async (request, reply) => {
    clearRefreshTokenCookie(reply);
    return reply.send({ success: true });
  });

  // GET /auth/check-shopid/:shopId
  fastify.get('/check-shopid/:shopId', async (request, reply) => {
    try {
      const { shopId } = request.params;
      if (!/^[a-zA-Z0-9_]{4,30}$/.test(shopId)) return reply.send({ available: false });
      const existing = await Tenant.findOne({ shopId });
      return reply.send({ available: !existing });
    } catch (err) {
      return reply.status(500).send({ error: 'Check failed' });
    }
  });

  // POST /auth/invite  — admin generates an invite code (requires auth)
  fastify.post('/invite', async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return reply.status(401).send({ error: 'Unauthorized' });
      const payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_ACCESS_SECRET);
      if (payload.role !== 'admin') return reply.status(403).send({ error: 'Admin only' });

      const { role = 'staff' } = request.body || {};

      // Enforce plan member limits
      const planLimits = { monthly: 5, yearly: 5, yearly_pro: 10 };
      const tenant = await Tenant.findOne({ shopId: payload.shopId });
      const limit = planLimits[tenant?.plan] ?? 5;
      const currentUsers = await User.countDocuments({ shopId: payload.shopId, isActive: true });
      if (currentUsers >= limit) {
        const planNames = { monthly: 'Monthly', yearly: 'Yearly Basic', yearly_pro: 'Yearly Pro' };
        const planName = planNames[tenant?.plan] || 'current';
        return reply.status(403).send({
          error: `Member limit reached. Your ${planName} plan allows up to ${limit} staff members. Upgrade to add more.`,
          code: 'MEMBER_LIMIT_REACHED',
        });
      }

      const code = randomBytes(4).toString('hex').toUpperCase(); // e.g. A3F9C2B1

      await InviteCode.create({
        shopId: payload.shopId,
        code,
        role,
        createdBy: payload.userId,
      });

      return reply.status(201).send({ code });
    } catch (err) {
      console.error('Generate invite error:', err);
      return reply.status(500).send({ error: 'Failed to generate invite code' });
    }
  });

  // GET /auth/invite/:code  — validate invite code (public)
  fastify.get('/invite/:code', async (request, reply) => {
    try {
      const invite = await InviteCode.findOne({ code: request.params.code.toUpperCase() });
      if (!invite) return reply.status(404).send({ error: 'Invalid invite code' });
      if (invite.usedBy) return reply.status(410).send({ error: 'Invite code already used' });
      if (new Date() > invite.expiresAt) return reply.status(410).send({ error: 'Invite code has expired' });

      const tenant = await Tenant.findOne({ shopId: invite.shopId });
      return reply.send({ shopId: invite.shopId, shopName: tenant?.shopName || invite.shopId, role: invite.role });
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to validate invite code' });
    }
  });

  // GET /auth/verify-email/:token — verify email address
  fastify.get('/verify-email/:token', async (request, reply) => {
    try {
      const { token } = request.params;
      const user = await User.findOne({
        emailVerifyToken: token,
        emailVerifyExpiry: { $gt: new Date() },
      });

      if (!user) {
        return reply.status(400).send({ error: 'Verification link is invalid or has expired.' });
      }

      await User.findByIdAndUpdate(user._id, {
        $set:   { emailVerified: true },
        $unset: { emailVerifyToken: '', emailVerifyExpiry: '' },
      });

      return reply.send({ success: true, shopId: user.shopId, username: user.username });
    } catch (err) {
      console.error('Email verification error:', err);
      return reply.status(500).send({ error: 'Verification failed' });
    }
  });

  // POST /auth/resend-verification — resend verification email
  fastify.post('/resend-verification', async (request, reply) => {
    try {
      const { email } = request.body;
      if (!email) return reply.status(400).send({ error: 'Email is required' });

      const user = await User.findOne({ email, emailVerified: false });
      if (!user) {
        // Don't reveal if email exists
        return reply.send({ success: true });
      }

      const verifyToken = randomBytes(32).toString('hex');
      const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(user._id, {
        $set: { emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry },
      });

      sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken })
        .catch(err => console.error('Resend verification email failed:', err.message));

      return reply.send({ success: true });
    } catch (err) {
      console.error('Resend verification error:', err);
      return reply.status(500).send({ error: 'Failed to resend verification email' });
    }
  });

  // POST /auth/join  — employee self-registers using invite code
  fastify.post('/join', async (request, reply) => {
    try {
      const { inviteCode, name, identifier, password } = request.body;

      if (!inviteCode || !name || !identifier || !password) {
        return reply.status(400).send({ error: 'All fields are required' });
      }
      if (password.length < 8 || !/(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return reply.status(400).send({ error: 'Password must be at least 8 characters with one uppercase and one number' });
      }

      const invite = await InviteCode.findOne({ code: inviteCode.toUpperCase() });
      if (!invite) return reply.status(404).send({ error: 'Invalid invite code' });
      if (invite.usedBy) return reply.status(410).send({ error: 'Invite code already used' });
      if (new Date() > invite.expiresAt) return reply.status(410).send({ error: 'Invite code has expired' });

      // Determine if identifier is email or phone
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const isPhone = /^\d{7,15}$/.test(identifier.replace(/\s+/g, ''));

      if (!isEmail && !isPhone) {
        return reply.status(400).send({ error: 'Please enter a valid email or phone number' });
      }

      // Build a unique username
      const base = identifier.replace(/[@.]/g, '_').toLowerCase().substring(0, 20);
      const username = `${base}_${invite.shopId}`;

      const existing = await User.findOne({ shopId: invite.shopId, username });
      if (existing) return reply.status(400).send({ error: 'An account with this email/phone already exists' });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        shopId: invite.shopId,
        name,
        username,
        email:  isEmail ? identifier : null,
        phone:  isPhone ? identifier : null,
        passwordHash,
        role: invite.role,
      });

      // Mark invite as used
      await InviteCode.findByIdAndUpdate(invite._id, { usedBy: user._id, usedAt: new Date() });

      return reply.status(201).send({ success: true, message: 'Account created. You can now sign in.' });
    } catch (err) {
      console.error('Join error:', err);
      return reply.status(500).send({ error: 'Registration failed' });
    }
  });
}
