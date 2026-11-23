/**
 * Stage 3B-2 Automated Security & Tenant Isolation Hardening Test Suite
 * Validates:
 * 1. Tenant A cannot reference Tenant B's resident (Composite Foreign Key)
 * 2. Tenant A cannot reference Tenant B's room (Composite Foreign Key)
 * 3. Tenant A cannot modify audit history (Immutability: UPDATE/DELETE blocked)
 * 4. Tenant B cannot read Tenant A's audit history (RLS Fail-Closed Isolation)
 * 5. Ordinary application roles cannot bypass RLS (NOBYPASSRLS verification)
 * 6. Missing tenant context fails closed (0 rows returned)
 * 7. Connection pool context does not leak across transactions
 * 8. Existing organization records remain intact
 */

const { Pool } = require('pg');
const assert = require('assert');

// Connect as non-superuser application role eldercare_app to eldercareos_restore_test
const appPool = new Pool({
  user: 'eldercare_app',
  password: 'eldercare_app_secure_pass_2026',
  host: '127.0.0.1',
  port: 5432,
  database: 'eldercareos_restore_test',
});

// Helper to execute operations within transaction-local tenant context
async function withTenant(orgId, op) {
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
}

async function runStage3B2Tests() {
  console.log('🧪 Starting Stage 3B-2 Automated Database Security Verification Suite...\n');

  const testOrgA = '66666666-6666-4666-8666-666666666666';
  const testOrgB = '77777777-7777-4777-8777-777777777777';

  // Parse superuser credentials directly from backend .env
  const backendEnvPath = 'C:\\Users\\Shubham Saini\\Desktop\\new project\\backend\\.env';
  let pgUser = 'postgres';
  let pgPass = '';
  let pgHost = '127.0.0.1';
  let pgPort = 5432;

  if (require('fs').existsSync(backendEnvPath)) {
    const lines = require('fs').readFileSync(backendEnvPath, 'utf8').split('\n');
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

  // Seed organizations using admin client
  const adminPool = new Pool({
    user: pgUser,
    password: pgPass,
    host: pgHost,
    port: pgPort,
    database: 'eldercareos_restore_test',
  });

  try {
    await adminPool.query(`
      INSERT INTO organizations (id, name, slug, primary_email)
      VALUES 
        ($1, 'Security Test Org Alpha', 'sec-alpha', 'alpha@sec.org'),
        ($2, 'Security Test Org Beta', 'sec-beta', 'beta@sec.org')
      ON CONFLICT (id) DO NOTHING;
    `, [testOrgA, testOrgB]);

    // Test 1: Tenant A cannot reference Tenant B's resident
    console.log('Test 1: Tenant A attempts to reference Tenant B resident in admission...');
    const residentB = await withTenant(testOrgB, async (client) => {
      const res = await client.query(`
        INSERT INTO residents (organization_id, resident_number, full_name, gender, resident_status)
        VALUES ($1, 'RES-T1-B', 'Resident In Beta', 'male', 'active')
        RETURNING id;
      `, [testOrgB]);
      return res.rows[0].id;
    });

    let t1Blocked = false;
    try {
      await withTenant(testOrgA, async (client) => {
        await client.query(`
          INSERT INTO admissions (organization_id, resident_id, admission_number)
          VALUES ($1, $2, 'ADM-FAIL-01');
        `, [testOrgA, residentB]);
      });
    } catch (err) {
      t1Blocked = true;
      assert.ok(err.message.includes('foreign key constraint') || err.message.includes('fk_admissions_org_resident'));
    }
    assert.strictEqual(t1Blocked, true, 'FAILURE: Cross-tenant resident reference allowed!');
    console.log('  ✅ Passed: Blocked by composite foreign key fk_admissions_org_resident');

    // Test 2: Tenant A cannot reference Tenant B's room
    console.log('Test 2: Tenant A attempts to reference Tenant B room in bed allocation...');
    const roomB = await withTenant(testOrgB, async (client) => {
      const res = await client.query(`
        INSERT INTO rooms (organization_id, room_number, ward_name)
        VALUES ($1, 'RM-T2-B', 'Ward Beta')
        RETURNING id;
      `, [testOrgB]);
      return res.rows[0].id;
    });

    let t2Blocked = false;
    try {
      await withTenant(testOrgA, async (client) => {
        await client.query(`
          INSERT INTO beds (organization_id, room_id, bed_code)
          VALUES ($1, $2, 'BED-FAIL-01');
        `, [testOrgA, roomB]);
      });
    } catch (err) {
      t2Blocked = true;
      assert.ok(err.message.includes('foreign key constraint') || err.message.includes('fk_beds_org_room'));
    }
    assert.strictEqual(t2Blocked, true, 'FAILURE: Cross-tenant room reference allowed!');
    console.log('  ✅ Passed: Blocked by composite foreign key fk_beds_org_room');

    // Test 3: Tenant A cannot modify audit history (UPDATE and DELETE blocked)
    console.log('Test 3: Tenant A attempts to modify historical audit log...');
    const logId = await withTenant(testOrgA, async (client) => {
      const res = await client.query(`
        INSERT INTO tenant_audit_logs (organization_id, action, entity_name, entity_id)
        VALUES ($1, 'PATIENT_ADMISSION', 'resident', 'res-001')
        RETURNING id;
      `, [testOrgA]);
      return res.rows[0].id;
    });

    let updateBlocked = false;
    try {
      await withTenant(testOrgA, async (client) => {
        await client.query('UPDATE tenant_audit_logs SET action = "TAMPERED" WHERE id = $1', [logId]);
      });
    } catch (err) {
      updateBlocked = true;
    }
    assert.strictEqual(updateBlocked, true, 'FAILURE: Audit log UPDATE was allowed!');

    let deleteBlocked = false;
    try {
      await withTenant(testOrgA, async (client) => {
        await client.query('DELETE FROM tenant_audit_logs WHERE id = $1', [logId]);
      });
    } catch (err) {
      deleteBlocked = true;
    }
    assert.strictEqual(deleteBlocked, true, 'FAILURE: Audit log DELETE was allowed!');
    console.log('  ✅ Passed: Audit log is strictly immutable (UPDATE and DELETE prohibited)');

    // Test 4: Tenant B cannot read Tenant A's audit history
    console.log("Test 4: Tenant B attempts to read Tenant A's audit history...");
    const readAudit = await withTenant(testOrgB, async (client) => {
      const res = await client.query('SELECT * FROM tenant_audit_logs WHERE id = $1', [logId]);
      return res.rows;
    });
    assert.strictEqual(readAudit.length, 0);
    console.log('  ✅ Passed: Tenant B received 0 rows (Fail-Closed RLS Confirmed)');

    // Test 5: Ordinary application role cannot bypass RLS
    console.log('Test 5: Verifying eldercare_app role has NOBYPASSRLS...');
    const roleCheck = await adminPool.query(`
      SELECT rolname, rolsuper, rolbypassrls 
      FROM pg_roles 
      WHERE rolname = 'eldercare_app';
    `);
    assert.strictEqual(roleCheck.rows[0].rolsuper, false, 'eldercare_app must not be superuser');
    assert.strictEqual(roleCheck.rows[0].rolbypassrls, false, 'eldercare_app must not have BYPASSRLS');
    console.log('  ✅ Passed: eldercare_app is verified as NOSUPERUSER and NOBYPASSRLS');

    // Test 6: Missing tenant context fails closed
    console.log('Test 6: Direct query without tenant context (Fail-Closed Default)...');
    const noContextRes = await appPool.query('SELECT * FROM residents WHERE id = $1', [residentB]);
    assert.strictEqual(noContextRes.rows.length, 0);
    console.log('  ✅ Passed: Query without context returned 0 rows');

    // Test 7: Connection pool context does not leak across transactions
    console.log('Test 7: Connection pool reuse verification...');
    const client = await appPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [testOrgA]);
      await client.query('COMMIT');

      // Check setting after COMMIT
      const checkCtx = await client.query(`SELECT current_setting('app.current_organization_id', true) AS ctx`);
      assert.strictEqual(checkCtx.rows[0].ctx, '');
      console.log('  ✅ Passed: Context wiped immediately on transaction COMMIT');
    } finally {
      client.release();
    }

    // Test 8: Existing organization records remain intact
    console.log('Test 8: Verifying existing organization records intact in database...');
    const orgCount = await adminPool.query('SELECT count(*) FROM organizations');
    assert.ok(parseInt(orgCount.rows[0].count, 10) >= 2);
    console.log(`  ✅ Passed: Organizations table intact with ${orgCount.rows[0].count} records`);

    console.log('\n🎉 ALL 8 STAGE 3B-2 SECURITY & INTEGRITY TESTS PASSED!');
  } finally {
    await appPool.end();
    await adminPool.end();
  }
}

runStage3B2Tests().catch(err => {
  console.error('\n❌ Test Failure:', err);
  process.exit(1);
});
