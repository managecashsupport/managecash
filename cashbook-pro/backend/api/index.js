import 'dotenv/config';
import { connectDB } from '../src/services/db.js';
import { buildApp } from '../src/app.js';

let app;
let isReady = false;

export default async function handler(req, res) {
  if (!isReady) {
    await connectDB();
    app = await buildApp();
    await app.ready();
    isReady = true;
  }
  app.server.emit('request', req, res);
}
