import 'dotenv/config';
import { connectDB } from './services/db.js';
import { buildApp } from './app.js';
import { startKeepAlive } from './services/keepAlive.js';

const start = async () => {
  try {
    await connectDB();
    const fastify = await buildApp();
    await fastify.listen({
      port: parseInt(process.env.PORT) || 5000,
      host: '0.0.0.0',
    });
    startKeepAlive();
    console.log(`🚀 CashBook Pro backend running on port ${process.env.PORT || 5000}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
