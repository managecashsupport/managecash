import Razorpay from 'razorpay';
import Tenant from '../models/Tenant.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

// Lazily initialize Razorpay so env vars are available at call time
let _razorpay;
function getRazorpay() {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}

// Helper function to get plan details
function getPlanDetails(planName) {
  const plans = {
    starter: {
      name: 'Starter',
      priceMonthly: 49900, // in paise (₹499)
      priceYearly: 499900, // in paise (₹4999)
      maxUsers: 3,
      maxTransactionsPerMonth: 500
    },
    growth: {
      name: 'Growth',
      priceMonthly: 99900, // in paise (₹999)
      priceYearly: 999900, // in paise (₹9999)
      maxUsers: 10,
      maxTransactionsPerMonth: -1 // unlimited
    },
    pro: {
      name: 'Pro',
      priceMonthly: 149900, // in paise (₹1499)
      priceYearly: 1499900, // in paise (₹14999)
      maxUsers: -1, // unlimited
      maxTransactionsPerMonth: -1 // unlimited
    }
  };

  return plans[planName];
}

// Create Razorpay plan
export async function createRazorpayPlan(planName, billingCycle) {
  try {
    const planDetails = getPlanDetails(planName);
    if (!planDetails) {
      throw new Error('Invalid plan name');
    }

    const amount = billingCycle === 'yearly' ? planDetails.priceYearly : planDetails.priceMonthly;
    const interval = billingCycle === 'yearly' ? 'yearly' : 'monthly';

    const plan = await getRazorpay().plans.create({
      period: interval,
      interval: 1,
      item: {
        name: `${planDetails.name} Plan - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        description: `${planDetails.name} Plan - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Billing`,
        amount: amount,
        currency: 'INR'
      },
      notes: {
        plan_name: planName,
        billing_cycle: billingCycle
      }
    });

    return plan;
  } catch (error) {
    console.error('Create Razorpay plan error:', error);
    throw error;
  }
}

// Create Razorpay subscription
export async function createRazorpaySubscription(shopId, planName, billingCycle) {
  try {
    const planDetails = getPlanDetails(planName);
    if (!planDetails) throw new Error('Invalid plan name');

    const tenant = await Tenant.findOne({ shopId });
    if (!tenant) throw new Error('Tenant not found');

    const customer = await getRazorpay().customers.create({
      name: tenant.shopName,
      email: tenant.ownerEmail,
      contact: '',
      notes: { shop_id: shopId }
    });

    const plan = await createRazorpayPlan(planName, billingCycle);

    const subscription = await getRazorpay().subscriptions.create({
      plan_id: plan.id,
      customer_id: customer.id,
      total_count: 12,
      notes: { shop_id: shopId, plan_name: planName, billing_cycle: billingCycle }
    });

    return {
      subscriptionId: subscription.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      subscription
    };
  } catch (error) {
    console.error('Create Razorpay subscription error:', error);
    throw error;
  }
}

// Update tenant plan
export async function updateTenantPlan(shopId, planName, subscriptionId) {
  try {
    if (!getPlanDetails(planName)) throw new Error('Invalid plan name');

    const tenant = await Tenant.findOneAndUpdate(
      { shopId },
      { $set: { plan: planName, razorpaySubscriptionId: subscriptionId, status: 'active' } },
      { new: true }
    );
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  } catch (error) {
    console.error('Update tenant plan error:', error);
    throw error;
  }
}

// Handle Razorpay webhook events
export async function handleRazorpayWebhook(event, signature) {
  try {
    const crypto = await import('crypto');
    const expectedSignature = crypto.default
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(event)
      .digest('hex');

    if (expectedSignature !== signature) throw new Error('Invalid webhook signature');

    const payload = JSON.parse(event);
    const { event: eventType, payload: eventPayload } = payload;
    const subscription = eventPayload.subscription;

    const statusMap = {
      'subscription.activated': { status: 'active', plan: subscription?.notes?.plan_name },
      'subscription.halted':    { status: 'grace_period' },
      'subscription.cancelled': { status: 'cancelled', razorpaySubscriptionId: null },
    };

    const update = statusMap[eventType];
    if (update) {
      await Tenant.findOneAndUpdate(
        { razorpaySubscriptionId: subscription.id },
        { $set: update }
      );
      console.log(`Webhook ${eventType} handled for sub: ${subscription.id}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Handle Razorpay webhook error:', error);
    throw error;
  }
}

// Get billing status for tenant
export async function getBillingStatus(shopId) {
  try {
    const tenant = await Tenant.findOne({ shopId });
    if (!tenant) throw new Error('Tenant not found');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [transactionsThisMonth, usersCount] = await Promise.all([
      Transaction.countDocuments({ shopId, deletedAt: null, date: { $gte: monthStart } }),
      User.countDocuments({ shopId, isActive: true }),
    ]);

    const planDetails = getPlanDetails(tenant.plan);

    return {
      plan: tenant.plan,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
      nextBillingDate: null,
      transactionsThisMonth,
      transactionLimit: planDetails.maxTransactionsPerMonth,
      usersCount,
      userLimit: planDetails.maxUsers,
    };
  } catch (error) {
    console.error('Get billing status error:', error);
    throw error;
  }
}