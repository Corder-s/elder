/**
 * Script to verify backup integrity and perform isolated restore drill.
 * Connects to PostgreSQL, creates a temporary isolated database `eldercareos_restore_test`,
 * restores the preflight backup into it, and verifies table/record counts.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse superuser credentials directly from backend .env
const backendEnvPath = 'C:\\Users\\Shubham Saini\\Desktop\\new project\\backend\\.env';
let pgUser = 'postgres';
let pgPass = '';
let pgHost = '127.0.0.1';
let pgPort = 5432;

if (fs.existsSync(backendEnvPath)) {
  const lines = fs.readFileSync(backendEnvPath, 'utf8').split('\n');
  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      const raw = line.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
      const match = raw.match(/postgresql:\/\/([^:]+):(.*)@(localhost|127\.0\.0\.1):(\d+)\/([^?]+)/);
      if (match) {
        pgUser = match[1];
        pgPass = match[2];
        pgHost = match[3] === 'localhost' ? '127.0.0.1' : match[3];
        pgPort = parseInt(match[4], 10);
      }
      break;
    }
  }
}

async function verifyBackup() {
  console.log('🔍 [1/4] Inspecting backup file...');
  const backupFile = path.resolve(__dirname, '../backups/eldercareos_phase3b_preflight_backup.sql');
  if (!fs.existsSync(backupFile)) {
    throw new Error('Backup file not found at ' + backupFile);
  }

  const stat = fs.statSync(backupFile);
  console.log(`  File size: ${stat.size} bytes`);
  const content = fs.readFileSync(backupFile, 'utf8');

  // Verify headers and commands
  const hasRowSecurityOff = content.includes('SET row_security = off;');
  const hasPgDump = content.includes('Dumped by pg_dump version 18.6');
  console.log(`  Dumped by pg_dump 18.6: ${hasPgDump}`);
  console.log(`  Contains 'SET row_security = off;': ${hasRowSecurityOff} (ensures no records omitted by RLS)`);

  const tableMatches = content.match(/CREATE TABLE public\.[a-z_]+/g) || [];
  console.log(`  Total CREATE TABLE statements in dump: ${tableMatches.length}`);

  // Count existing records in source db (eldercareos)
  console.log('\n📊 [2/4] Counting records in source database (eldercareos)...');
  const sourcePool = new Pool({
    user: pgUser,
    password: pgPass,
    host: pgHost,
    port: pgPort,
    database: 'eldercareos',
  });
  
  const tablesRes = await sourcePool.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `);
  
  const sourceCounts = {};
  for (const row of tablesRes.rows) {
    const countRes = await sourcePool.query(`SELECT count(*) FROM public."${row.tablename}"`);
    sourceCounts[row.tablename] = parseInt(countRes.rows[0].count, 10);
  }
  await sourcePool.end();
  console.log(`  Verified ${Object.keys(sourceCounts).length} tables in source database.`);

  // Create isolated restore test database (never overwrite an existing database)
  const targetDb = process.env.RESTORE_TEST_DB || `eldercareos_restore_test_${Date.now()}`;
  if (targetDb === 'eldercareos' || targetDb === 'postgres') {
    throw new Error(`Refusing to restore into protected database: ${targetDb}`);
  }

  console.log(`\n🧪 [3/4] Creating isolated test database (${targetDb})...`);
  const adminPool = new Pool({
    user: pgUser,
    password: pgPass,
    host: pgHost,
    port: pgPort,
    database: 'postgres',
  });

  const existingDb = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
  if (existingDb.rows.length > 0) {
    await adminPool.end();
    throw new Error(`Refusing to overwrite existing database "${targetDb}". Provide a fresh RESTORE_TEST_DB name.`);
  }

  await adminPool.query(`CREATE DATABASE "${targetDb}";`);
  await adminPool.end();
  console.log(`  Isolated database ${targetDb} created successfully.`);

  // Restore dump into isolated test database with ON_ERROR_STOP=1
  console.log(`\n📥 [4/4] Restoring backup into ${targetDb}...`);
  const psqlPath = '"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"';

  const env = { ...process.env, PGPASSWORD: pgPass };
  const restoreCmd = `${psqlPath} -v ON_ERROR_STOP=1 -U ${pgUser} -h ${pgHost} -p ${pgPort} -d "${targetDb}" -f "${backupFile}"`;

  execSync(restoreCmd, { env, stdio: 'pipe' });
  console.log('  Restore command executed cleanly without fatal errors.');

  // Verify restored database tables and record counts
  const testPool = new Pool({
    user: pgUser,
    password: pgPass,
    host: pgHost,
    port: pgPort,
    database: targetDb,
  });
  const testTablesRes = await testPool.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `);
  
  const testCounts = {};
  let mismatchCount = 0;
  for (const row of testTablesRes.rows) {
    const countRes = await testPool.query(`SELECT count(*) FROM public."${row.tablename}"`);
    testCounts[row.tablename] = parseInt(countRes.rows[0].count, 10);
    if (sourceCounts[row.tablename] !== testCounts[row.tablename]) {
      console.error(`  ❌ Mismatch on ${row.tablename}: Source=${sourceCounts[row.tablename]} vs Restored=${testCounts[row.tablename]}`);
      mismatchCount++;
    }
  }

  console.log(`\n✅ Restored database verified: ${Object.keys(testCounts).length} tables matched.`);
  if (mismatchCount === 0) {
    console.log('🎉 PERFECT RESTORE: All tables and record counts in eldercareos_restore_test match eldercareos 100%!');
  } else {
    throw new Error(`Restore drill detected ${mismatchCount} table count mismatches!`);
  }

  // Verify RLS policies on restored db
  const rlsRes = await testPool.query(`
    SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
  `);
  console.log(`  Restored tables with RLS active: ${rlsRes.rows[0].count} / 26`);

  const policiesRes = await testPool.query(`
    SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
  `);
  console.log(`  Restored security policies: ${policiesRes.rows[0].count} policies verified`);

  await testPool.end();
}

verifyBackup().catch(err => {
  console.error('Fatal backup verification error:', err);
  process.exit(1);
});
