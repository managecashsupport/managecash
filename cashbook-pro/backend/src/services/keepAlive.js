import mongoose from 'mongoose';

export function startKeepAlive() {
  const interval = setInterval(async () => {
    try {
      await mongoose.connection.db.admin().ping();
      console.log(`✅ [${new Date().toISOString()}] DB keep-alive ping sent`);
    } catch (err) {
      console.error(`❌ Keep-alive failed: ${err.message}`);
    }
  }, 4 * 60 * 1000);

  console.log('🔄 Keep-alive service started');

  process.on('SIGTERM', () => clearInterval(interval));
  process.on('SIGINT',  () => clearInterval(interval));
}
