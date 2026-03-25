import { tenantResolver } from '../middleware/tenantResolver.js';
import { createRazorpaySubscription, handleRazorpayWebhook, getBillingStatus } from '../services/billing.js';

export default async function billingRoutes(fastify, options) {
  // GET /billing/plans
  fastify.get('/plans', async (request, reply) => {
    try {
      const plans = [
        {
          name: 'starter', displayName: 'Starter', priceMonthly: 499, priceYearly: 4999,
          maxUsers: 3, maxTransactionsPerMonth: 500,
          features: ['Up to 3 staff members', '500 transactions per month', 'Basic analytics', 'Email support']
        },
        {
          name: 'growth', displayName: 'Growth', priceMonthly: 999, priceYearly: 9999,
          maxUsers: 10, maxTransactionsPerMonth: -1,
          features: ['Up to 10 staff members', 'Unlimited transactions', 'Advanced analytics', 'Priority support', 'Export reports']
        },
        {
          name: 'pro', displayName: 'Pro', priceMonthly: 1499, priceYearly: 14999,
          maxUsers: -1, maxTransactionsPerMonth: -1,
          features: ['Unlimited staff members', 'Unlimited transactions', 'Advanced analytics', 'Priority support', 'Export reports', 'Custom integrations', 'Dedicated account manager']
        }
      ];
      return reply.send(plans);
    } catch (err) {
      console.error('Get plans error:', err);
      return reply.status(500).send({ error: 'Failed to fetch plans' });
    }
  });

  // POST /billing/subscribe
  fastify.post('/subscribe', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const { planName, billingCycle } = request.body;

      if (!planName || !billingCycle) {
        return reply.status(400).send({ error: 'Plan name and billing cycle are required' });
      }
      if (!['starter', 'growth', 'pro'].includes(planName)) {
        return reply.status(400).send({ error: 'Invalid plan name' });
      }
      if (!['monthly', 'yearly'].includes(billingCycle)) {
        return reply.status(400).send({ error: 'Invalid billing cycle' });
      }

      const tenantResult = await request.db.query(
        'SELECT razorpay_subscription_id, status FROM public.tenants WHERE shop_id = $1',
        [request.user.shopId]
      );

      if (tenantResult.rows.length > 0) {
        const tenant = tenantResult.rows[0];
        if (tenant.razorpay_subscription_id && tenant.status === 'active') {
          return reply.status(400).send({ error: 'You already have an active subscription' });
        }
      }

      const subscription = await createRazorpaySubscription(request.user.shopId, planName, billingCycle);
      return reply.send({
        subscriptionId: subscription.subscriptionId,
        razorpayKeyId: subscription.razorpayKeyId
      });
    } catch (err) {
      console.error('Create subscription error:', err);
      return reply.status(500).send({ error: 'Failed to create subscription' });
    }
  });

  // POST /billing/webhook
  fastify.post('/webhook', async (request, reply) => {
    try {
      const event = request.body;
      const signature = request.headers['x-razorpay-signature'];

      if (!event || !signature) {
        return reply.status(400).send({ error: 'Webhook event and signature required' });
      }

      await handleRazorpayWebhook(event, signature);
      return reply.status(200).send({ success: true });
    } catch (err) {
      console.error('Webhook error:', err);
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  // GET /billing/status
  fastify.get('/status', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const status = await getBillingStatus(request.user.shopId);
      return reply.send(status);
    } catch (err) {
      console.error('Get billing status error:', err);
      return reply.status(500).send({ error: 'Failed to get billing status' });
    }
  });
}
