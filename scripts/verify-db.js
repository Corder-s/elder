const { Pool } = require('pg');
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

async function verify() {
  try {
    const res = await pool.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    console.log(`\nVerified ${res.rows.length} tables in database:`);
    let rlsCount = 0;
    res.rows.forEach(r => {
      if (r.rowsecurity) rlsCount++;
      console.log(`  - ${r.tablename.padEnd(28)} RLS Enabled: ${r.rowsecurity}`);
    });
    console.log(`\nTotal tables with RLS active: ${rlsCount}`);

    const plans = await pool.query('SELECT name, slug, price_monthly_inr, resident_limit FROM subscription_plans ORDER BY price_monthly_inr ASC');
    console.log('\nSeeded Subscription Plans:');
    plans.rows.forEach(p => console.log(`  - ${p.name} (${p.slug}): INR ${p.price_monthly_inr}/mo, Max Residents: ${p.resident_limit}`));

    const perms = await pool.query('SELECT count(*) FROM permissions');
    console.log(`\nTotal Granular Permissions Seeded: ${perms.rows[0].count}`);
  } finally {
    await pool.end();
  }
}

verify().catch(console.error);
