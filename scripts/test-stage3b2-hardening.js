/**
 * Script to test Migration 008, audit log immutability, and composite foreign key enforcement
 * on the isolated test database `eldercareos_restore_test`.
 * LEAVES `eldercareos` UNTOUCHED.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  fs.readFileSync(rootEnvPath, 'utf8').split('\n').forEach(line => {
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

const psqlPath = '"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"';
const migrationPath = path.resolve(__dirname, '../migrations/008_security_hardening.sql');
const rollbackPath = path.resolve(__dirname, '../migrations/008_security_hardening_rollback.sql');

async function testStage3B2() {
  console.log('🧪 Testing Stage 3B-2 Security Hardening against isolated database eldercareos_restore_test...\n');

  // 1. Apply Migration 008 to eldercareos_restore_test
  console.log('⚙️ [Step 1] Applying migration 008 to eldercareos_restore_test...');
  const env = { ...process.env, PGPASSWORD: pgPass };
  execSync(`${psqlPath} -U ${pgUser} -h ${pgHost} -p ${pgPort} -d eldercareos_restore_test -f "${migrationPath}"`, { env });
  console.log('  ✅ Migration 008 executed successfully on eldercareos_restore_test.');

  // Connect to eldercareos_restore_test using non-superuser eldercare_app
  // Grant connection & permissions on eldercareos_restore_test
  const superPool = new Pool({
    user: pgUser,
    password: pgPass,
    host: pgHost,
    port: pgPort,
    database: 'eldercareos_restore_test',
  });
  await superPool.query('GRANT CONNECT ON DATABASE eldercareos_restore_test TO eldercare_app;');
  await superPool.query('GRANT USAGE ON SCHEMA public TO eldercare_app;');
  await superPool.query('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO eldercare_app;');
  await superPool.query('REVOKE UPDATE, DELETE, TRUNCATE ON tenant_audit_logs FROM eldercare_app;');
  await superPool.query('REVOKE UPDATE, DELETE, TRUNCATE ON platform_audit_logs FROM eldercare_app;');

  const appUrl = process.env.DATABASE_URL;
  if (!appUrl) {
    throw new Error('DATABASE_URL must be configured in .env or environment');
  }
  const parsedAppUrl = new URL(appUrl);
  const appPool = new Pool({
    user: decodeURIComponent(parsedAppUrl.username),
    password: decodeURIComponent(parsedAppUrl.password),
    host: parsedAppUrl.hostname === 'localhost' ? '127.0.0.1' : parsedAppUrl.hostname,
    port: parseInt(parsedAppUrl.port || '5432', 10),
    database: 'eldercareos_restore_test',
  });

  const testOrgA = '44444444-4444-4444-8444-444444444444';
  const testOrgB = '55555555-5555-4555-8555-555555555555';

  try {
    // Seed Org A & Org B in eldercareos_restore_test
    await superPool.query(`
      INSERT INTO organizations (id, name, slug, primary_email)
      VALUES 
        ($1, 'Audit Test Org A', 'audit-test-a', 'audita@test.org'),
        ($2, 'Audit Test Org B', 'audit-test-b', 'auditb@test.org')
      ON CONFLICT (id) DO NOTHING;
    `, [testOrgA, testOrgB]);

    // Helper for tenant context
    const withAppTenant = async (orgId, op) => {
      const client = await appPool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [orgId]);
        const res = await op(client);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };

    // 2. Test Audit Log Immutability
    console.log('\n🔒 [Step 2] Testing Audit Log Immutability (Append-Only)...');
    
    // Test 2A: Authorized INSERT into tenant_audit_logs
    const insertLogRes = await withAppTenant(testOrgA, async (client) => {
      const res = await client.query(`
        INSERT INTO tenant_audit_logs (organization_id, action, entity_name, entity_id)
        VALUES ($1, 'TEST_AUDIT_ACTION', 'resident', 'res-123')
        RETURNING id, action;
      `, [testOrgA]);
      return res.rows[0];
    });
    console.log(`  ✅ INSERT audit log succeeded with ID: ${insertLogRes.id}`);

    // Test 2B: Attempted UPDATE on tenant_audit_logs (MUST BE BLOCKED)
    let updateBlocked = false;
    try {
      await withAppTenant(testOrgA, async (client) => {
        await client.query(`
          UPDATE tenant_audit_logs SET action = 'HACKED_ACTION' WHERE id = $1;
        `, [insertLogRes.id]);
      });
    } catch (err) {
      updateBlocked = true;
      assert.ok(
        err.message.includes('immutable') || err.message.includes('permission denied'),
        'Unexpected error message: ' + err.message
      );
      console.log(`  ✅ UPDATE blocked as expected: "${err.message.split('\n')[0]}"`);
    }
    assert.strictEqual(updateBlocked, true, 'CRITICAL SECURITY FAILURE: Audit log UPDATE was permitted!');

    // Test 2C: Attempted DELETE on tenant_audit_logs (MUST BE BLOCKED)
    let deleteBlocked = false;
    try {
      await withAppTenant(testOrgA, async (client) => {
        await client.query(`
          DELETE FROM tenant_audit_logs WHERE id = $1;
        `, [insertLogRes.id]);
      });
    } catch (err) {
      deleteBlocked = true;
      assert.ok(
        err.message.includes('immutable') || err.message.includes('permission denied'),
        'Unexpected error message: ' + err.message
      );
      console.log(`  ✅ DELETE blocked as expected: "${err.message.split('\n')[0]}"`);
    }
    assert.strictEqual(deleteBlocked, true, 'CRITICAL SECURITY FAILURE: Audit log DELETE was permitted!');

    // Test 2D: Tenant B cannot read Tenant A's audit history
    const readAuditB = await withAppTenant(testOrgB, async (client) => {
      const res = await client.query('SELECT * FROM tenant_audit_logs WHERE id = $1', [insertLogRes.id]);
      return res.rows;
    });
    assert.strictEqual(readAuditB.length, 0, 'SECURITY VIOLATION: Tenant B read Tenant A audit log!');
    console.log('  ✅ Tenant B read 0 rows of Tenant A audit logs (Fail-Closed RLS Confirmed)');

    // 3. Test Composite Tenant-Aware Foreign Keys
    console.log('\n🔗 [Step 3] Testing Composite Tenant-Aware Foreign Keys...');

    // Seed Resident in Tenant B
    const residentB = await withAppTenant(testOrgB, async (client) => {
      const res = await client.query(`
        INSERT INTO residents (organization_id, resident_number, full_name, gender, resident_status)
        VALUES ($1, 'RES-B-FK', 'Resident in Org B', 'female', 'active')
        RETURNING id;
      `, [testOrgB]);
      return res.rows[0].id;
    });
    console.log(`  Seeded Resident in Tenant B with ID: ${residentB}`);

    // Seed Room in Tenant B
    const roomB = await withAppTenant(testOrgB, async (client) => {
      const res = await client.query(`
        INSERT INTO rooms (organization_id, room_number, ward_name)
        VALUES ($1, 'ROOM-B-101', 'Ward B')
        RETURNING id;
      `, [testOrgB]);
      return res.rows[0].id;
    });
    console.log(`  Seeded Room in Tenant B with ID: ${roomB}`);

    // Test 3A: Tenant A attempts to create admission referencing Tenant B's resident
    let crossTenantAdmissionBlocked = false;
    try {
      await withAppTenant(testOrgA, async (client) => {
        await client.query(`
          INSERT INTO admissions (organization_id, resident_id, admission_number)
          VALUES ($1, $2, 'ADM-CROSS-001');
        `, [testOrgA, residentB]);
      });
    } catch (err) {
      crossTenantAdmissionBlocked = true;
      assert.ok(
        err.message.includes('fk_admissions_org_resident') || err.message.includes('violates foreign key'),
        'Unexpected error message: ' + err.message
      );
      console.log(`  ✅ Cross-tenant admission blocked at FK constraint level: "${err.message.split('\n')[0]}"`);
    }
    assert.strictEqual(crossTenantAdmissionBlocked, true, 'CRITICAL FAILURE: Cross-tenant admission succeeded!');

    // Test 3B: Tenant A attempts to create bed referencing Tenant B's room
    let crossTenantBedBlocked = false;
    try {
      await withAppTenant(testOrgA, async (client) => {
        await client.query(`
          INSERT INTO beds (organization_id, room_id, bed_code)
          VALUES ($1, $2, 'BED-CROSS-001');
        `, [testOrgA, roomB]);
      });
    } catch (err) {
      crossTenantBedBlocked = true;
      assert.ok(
        err.message.includes('fk_beds_org_room') || err.message.includes('violates foreign key'),
        'Unexpected error message: ' + err.message
      );
      console.log(`  ✅ Cross-tenant bed allocation blocked at FK constraint level: "${err.message.split('\n')[0]}"`);
    }
    assert.strictEqual(crossTenantBedBlocked, true, 'CRITICAL FAILURE: Cross-tenant bed allocation succeeded!');

    // 4. Test Rollback Script on eldercareos_restore_test
    console.log('\n🔄 [Step 4] Testing Rollback Script on eldercareos_restore_test...');
    execSync(`${psqlPath} -U ${pgUser} -h ${pgHost} -p ${pgPort} -d eldercareos_restore_test -f "${rollbackPath}"`, { env });
    console.log('  ✅ Rollback script executed cleanly without errors.');

    // Verify constraints removed by rollback
    const rollbackCheck = await superPool.query(`
      SELECT count(*) FROM pg_constraint WHERE conname IN ('fk_admissions_org_resident', 'fk_beds_org_room');
    `);
    assert.strictEqual(parseInt(rollbackCheck.rows[0].count, 10), 0);
    console.log('  ✅ Confirmed composite foreign keys cleanly removed by rollback.');

    // 5. Re-apply migration 008 on eldercareos_restore_test
    console.log('\n⚙️ [Step 5] Re-applying migration 008 to eldercareos_restore_test for permanent test readiness...');
    execSync(`${psqlPath} -U ${pgUser} -h ${pgHost} -p ${pgPort} -d eldercareos_restore_test -f "${migrationPath}"`, { env });
    console.log('  ✅ Migration 008 re-applied cleanly.');

    console.log('\n🎉 ALL STAGE 3B-2 SECURITY & INTEGRITY TESTS PASSED 100%!');
  } finally {
    await appPool.end();
    await superPool.end();
  }
}

testStage3B2().catch(err => {
  console.error('\n❌ Stage 3B-2 Test Failed:', err);
  process.exit(1);
});
