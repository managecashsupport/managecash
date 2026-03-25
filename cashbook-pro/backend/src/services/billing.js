import Razorpay from 'razorpay';
import Tenant from '../models/Tenant.js';

// ── Plan definitions ──────────────────────────────────────────────────────────
export const PLANS = {
  monthly: {
    id:        'monthly',
    name:      'Monthly',
    price:     300,        // ₹300
    pricePaise:30000,      // in paise
    cycle:     'monthly',
    months:    1,
    maxStaff:  5,
    badge:     null,
    features: [
      '5 staff members',
      'Unlimited transactions',
      'Customer wallet & passbook',
      'Stock & inventory management',
      'Purchase & vendor tracking',
      'Expense management',
      'Salary management',
      'Analytics & reports',
      'WhatsApp notifications',
      'Village-wise customer filter',
    ],
  },
  yearly: {
    id:        'yearly',
    name:      'Yearly Basic',
    price:     3000,       // ₹3000/year
    pricePaise:300000,
    cycle:     'yearly',
    months:    12,
    maxStaff:  5,
    badge:     'Save ₹600',
    features: [
      '5 staff members',
      'Unlimited transactions',
      'Customer wallet & passbook',
      'Stock & inventory management',
      'Purchase & vendor tracking',
      'Expense management',
      'Salary management',
      'Analytics & reports',
      'WhatsApp notifications',
      'Village-wise customer filter',
      'Priority support',
    ],
  },
  yearly_pro: {
    id:        'yearly_pro',
    name:      'Yearly Pro',
    price:     5000,       // ₹5000/year
    pricePaise:500000,
    cycle:     'yearly',
    months:    12,
    maxStaff:  10,
    badge:     'Most Popular',
    features: [
      '10 staff members',
      'Unlimited transactions',
      'Customer wallet & passbook',
      'Stock & inventory management',
      'Purchase & vendor tracking',
      'Expense management',
      'Salary management',
      'Analytics & reports',
      'WhatsApp notifications',
      'Village-wise customer filter',
      'Priority support',
      'Dedicated account manager',
    ],
  },
};

// ── Lazily init Razorpay ──────────────────────────────────────────────────────
let _razorpay;
function getRazorpay() {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

// ── Create a Razorpay order for a plan ────────────────────────────────────────
export async function createOrder(shopId, planId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan');

  const tenant = await Tenant.findOne({ shopId });
  if (!tenant) throw new Error('Tenant not found');

  const order = await getRazorpay().orders.create({
    amount:   plan.pricePaise,
    currency: 'INR',
    receipt:  `${shopId}_${planId}_${Date.now()}`,
    notes:    { shopId, planId, shopName: tenant.shopName },
  });

  return {
    orderId:  order.id,
    amount:   plan.pricePaise,
    currency: 'INR',
    keyId:    process.env.RAZORPAY_KEY_ID,
    shopName: tenant.shopName,
    email:    tenant.ownerEmail,
  };
}

// ── Verify Razorpay signature and activate subscription ───────────────────────
export async function verifyAndActivate(shopId, planId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const crypto = await import('crypto');
  const body   = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.default
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expected !== razorpay_signature) throw new Error('Invalid payment signature');

  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan');

  const now = new Date();
  const subscriptionEndsAt = new Date(now);
  subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + plan.months);

  const tenant = await Tenant.findOneAndUpdate(
    { shopId },
    { $set: { plan: planId, status: 'active', subscriptionEndsAt, lastPaymentId: razorpay_payment_id } },
    { new: true }
  );
  if (!tenant) throw new Error('Tenant not found');

  return { success: true, plan: planId, subscriptionEndsAt };
}

// ── Get billing status ────────────────────────────────────────────────────────
export async function getBillingStatus(shopId) {
  const tenant = await Tenant.findOne({ shopId });
  if (!tenant) throw new Error('Tenant not found');

  const plan = PLANS[tenant.plan] || null;
  const now  = new Date();

  const daysLeft = tenant.status === 'trial'
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt) - now) / (1000 * 60 * 60 * 24)))
    : tenant.subscriptionEndsAt
      ? Math.max(0, Math.ceil((new Date(tenant.subscriptionEndsAt) - now) / (1000 * 60 * 60 * 24)))
      : null;

  return {
    plan:               tenant.plan,
    planDetails:        plan,
    status:             tenant.status,
    trialEndsAt:        tenant.trialEndsAt,
    subscriptionEndsAt: tenant.subscriptionEndsAt,
    daysLeft,
    shopName:           tenant.shopName,
  };
}
