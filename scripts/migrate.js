/**
 * ElderCare OS Database Migration Runner
 * Production-grade migration engine executing versioned SQL files within ACID transactions.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Read .env if present
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🚀 Connecting to database for migration...');
    
    // Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Fetch applied migrations
    const res = await client.query('SELECT name FROM schema_migrations ORDER BY id ASC');
    const applied = new Set(res.rows.map(r => r.name));

    // Read migration files from migrations directory
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`📂 Found ${files.length} migration files.`);

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`⏩ [Skipped] Already applied: ${file}`);
        continue;
      }

      console.log(`⚙️ [Applying] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ [Success] Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ [Failed] Error applying migration ${file}:`, err);
        process.exit(1);
      }
    }

    console.log('🎉 All migrations applied successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
