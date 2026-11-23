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

async function check() {
  try {
    const migs = await pool.query('SELECT id, name, applied_at FROM schema_migrations ORDER BY id ASC');
    console.log('Applied Migrations:', JSON.stringify(migs.rows, null, 2));

    const policies = await pool.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    console.log(`\nActive PostgreSQL Policies (${policies.rows.length}):`);
    policies.rows.forEach(p => {
      console.log(`  Table: ${p.tablename.padEnd(25)} Policy: ${p.policyname.padEnd(25)} Cmd: ${p.cmd}`);
    });

  } finally {
    await pool.end();
  }
}

check().catch(console.error);
