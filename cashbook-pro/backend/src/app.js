import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import userRoutes from './routes/users.js';
import billingRoutes from './routes/billing.js';
import uploadRoutes from './routes/upload.js';
import superadminRoutes from './routes/superadmin.js';
import customerRoutes from './routes/customers.js';
import stockRoutes from './routes/stock.js';
import purchaseRoutes from './routes/purchases.js';
import salaryRoutes from './routes/salaries.js';
import expenseRoutes from './routes/expenses.js';
import adminDashboardRoutes from './routes/adminDashboard.js';

export async function buildApp() {  
  const fastify = Fastify({ logger: false, trustProxy: true });

  await fastify.register(helmet);    
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'https://managecash-rho.vercel.app',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'fallback-dev-secret',
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({ error: 'Too many requests. Please slow down.' }),
  });

  await fastify.register(authRoutes,        { prefix: '/auth' });
  await fastify.register(transactionRoutes, { prefix: '/transactions' });
  await fastify.register(userRoutes,        { prefix: '/users' });
  await fastify.register(billingRoutes,     { prefix: '/billing' });
  await fastify.register(uploadRoutes,      { prefix: '/upload' });
  await fastify.register(superadminRoutes,  { prefix: '/superadmin' });
  await fastify.register(customerRoutes,    { prefix: '/customers' });
  await fastify.register(stockRoutes,       { prefix: '/stock' });
  await fastify.register(purchaseRoutes,    { prefix: '/purchases' });
  await fastify.register(salaryRoutes,      { prefix: '/salaries' });
  await fastify.register(expenseRoutes,          { prefix: '/expenses' });
  await fastify.register(adminDashboardRoutes,   { prefix: '/admin3636secret' });

  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    if (error.statusCode) {
      return reply.status(error.statusCode).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  });

  return fastify;
}
