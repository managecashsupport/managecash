import { tenantResolver } from '../middleware/tenantResolver.js';
import { PLANS, createOrder, verifyAndActivate, getBillingStatus } from '../services/billing.js';

export default async function billingRoutes(fastify) {

  // GET /billing/plans — public
  fastify.get('/plans', async (request, reply) => {
    return reply.send(Object.values(PLANS).map(p => ({
      id:       p.id,
      name:     p.name,
      price:    p.price,
      cycle:    p.cycle,
      maxStaff: p.maxStaff,
      badge:    p.badge,
      features: p.features,
    })));
  });

  // GET /billing/status — current subscription info
  fastify.get('/status', { preHandler: [tenantResolver] }, async (request, reply) => {
    try {
      const status = await getBillingStatus(request.user.shopId);
      return reply.send(status);
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to get billing status' });
    }
  });

  // POST /billing/create-order — create Razorpay order
  fastify.post('/create-order', { preHandler: [tenantResolver] }, async (request, reply) => {
    const { planId } = request.body;
    if (!planId || !PLANS[planId]) {
      return reply.status(400).send({ error: 'Invalid plan' });
    }
    try {
      const order = await createOrder(request.user.shopId, planId);
      return reply.send(order);
    } catch (err) {
      console.error('Create order error:', err.message);
      return reply.status(500).send({ error: err.message || 'Failed to create order' });
    }
  });

  // POST /billing/verify — verify payment + activate plan
  fastify.post('/verify', { preHandler: [tenantResolver] }, async (request, reply) => {
    const { planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = request.body;
    if (!planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return reply.status(400).send({ error: 'Missing payment details' });
    }
    try {
      const result = await verifyAndActivate(request.user.shopId, planId, {
        razorpay_order_id, razorpay_payment_id, razorpay_signature,
      });
      return reply.send(result);
    } catch (err) {
      console.error('Verify payment error:', err.message);
      return reply.status(400).send({ error: err.message || 'Payment verification failed' });
    }
  });

  // POST /billing/webhook — Razorpay webhook (for future auto-renewal)
  fastify.post('/webhook', async (request, reply) => {
    // Signature verification handled per event
    return reply.send({ received: true });
  });
}
