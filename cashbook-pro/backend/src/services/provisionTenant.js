import { pool } from './db.js';
import bcrypt from 'bcrypt';

export async function provisionTenant(shopId, ownerName, ownerEmail, password) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Sanitize shopId — only alphanumeric and underscore allowed
    const safeShopId = shopId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    // 2. Create schema for this tenant
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${safeShopId}"`);

    // 3. Create users table in tenant schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeShopId}".users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(500) NOT NULL,
        role VARCHAR(50) DEFAULT 'staff',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 4. Create transactions table in tenant schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeShopId}".transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
        customer_name VARCHAR(200) NOT NULL,
        product_description TEXT,
        amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
        date DATE NOT NULL,
        pay_mode VARCHAR(20) DEFAULT 'cash' CHECK (pay_mode IN ('cash', 'online')),
        staff_id UUID NOT NULL,
        staff_name VARCHAR(200) NOT NULL,
        image_url TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 5. Create settings table in tenant schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${safeShopId}".settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_name VARCHAR(200),
        logo_url TEXT,
        currency VARCHAR(10) DEFAULT 'INR',
        timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 6. Create default admin user
    const passwordHash = await bcrypt.hash(password, 12);
    const username = ownerName.toLowerCase().replace(/\s+/g, '_');
    
    await client.query(`
      INSERT INTO "${safeShopId}".users (name, username, password_hash, role)
      VALUES ($1, $2, $3, 'admin')
    `, [ownerName, username, passwordHash]);

    // 7. Insert default settings
    await client.query(`
      INSERT INTO "${safeShopId}".settings (shop_name, currency, timezone)
      VALUES ($1, 'INR', 'Asia/Kolkata')
    `, [shopId]);

    // 8. Create tenant record in public schema
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial

    await client.query(`
      INSERT INTO public.tenants 
        (shop_id, shop_name, owner_email, owner_name, plan, status, trial_ends_at)
      VALUES ($1, $2, $3, $4, 'starter', 'trial', $5)
    `, [safeShopId, shopId, ownerEmail, ownerName, trialEndsAt]);

    await client.query('COMMIT');
    
    console.log(`✅ Tenant provisioned: ${safeShopId}`);
    return { safeShopId, username };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Tenant provisioning failed: ${err.message}`);
    throw err;
  } finally {
    client.release();
  }
}