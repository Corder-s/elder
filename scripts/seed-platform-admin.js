/**
 * Seed Platform Super Admin User
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    const email = 'platform.admin@eldercareos.com';
    const password = 'ElderCare@Admin2026!';
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const res = await pool.query(`
      INSERT INTO users (
        email, password_hash, full_name, is_platform_admin, status, email_verified_at
      ) VALUES (
        $1, $2, 'Platform Super Admin', true, 'active', CURRENT_TIMESTAMP
      )
      ON CONFLICT (email) DO UPDATE SET
        is_platform_admin = true,
        password_hash = EXCLUDED.password_hash
      RETURNING id, email, full_name, is_platform_admin;
    `, [email, passwordHash]);

    console.log('✅ Platform Super Admin Seeded successfully:');
    console.log(res.rows[0]);
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
