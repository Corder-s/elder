/**
 * Automated Tenant Isolation & Row-Level Security (RLS) Test Suite
 * Validates fail-closed multi-tenancy, cross-tenant attack prevention, and connection pool safety.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load environment variables
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

async function withTenant(orgId, op) {
  const client = await pool.connect();
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

async function runTests() {
  console.log('🧪 Starting Multi-Tenant RLS Security Test Suite...\n');

  const testOrgA = '11111111-1111-4111-8111-111111111111';
  const testOrgB = '22222222-2222-4222-8222-222222222222';
  let residentIdA = null;

  try {
    // 0. Seed Test Organizations
    await pool.query(`
      INSERT INTO organizations (id, name, slug, primary_email)
      VALUES 
        ($1, 'Test NGO Alpha', 'test-alpha', 'alpha@test.org'),
        ($2, 'Test NGO Beta', 'test-beta', 'beta@test.org')
      ON CONFLICT (id) DO NOTHING;
    `, [testOrgA, testOrgB]);

    // Test 1: Tenant A Inserts its own resident
    console.log('Test 1: Tenant A inserts resident...');
    const insertRes = await withTenant(testOrgA, async (client) => {
      const res = await client.query(`
        INSERT INTO residents (
          organization_id, resident_number, full_name, gender, resident_status
        ) VALUES ($1, 'RES-A-001', 'Resident In Alpha', 'male', 'active')
        RETURNING id, full_name;
      `, [testOrgA]);
      return res.rows[0];
    });
    residentIdA = insertRes.id;
    assert.strictEqual(insertRes.full_name, 'Resident In Alpha');
    console.log('  ✅ Passed: Resident created in Tenant A with ID', residentIdA);

    // Test 2: Tenant A Reads its own resident
    console.log('Test 2: Tenant A reads its own resident...');
    const readA = await withTenant(testOrgA, async (client) => {
      const res = await client.query('SELECT * FROM residents WHERE id = $1', [residentIdA]);
      return res.rows;
    });
    assert.strictEqual(readA.length, 1);
    assert.strictEqual(readA[0].id, residentIdA);
    console.log('  ✅ Passed: Tenant A successfully read its own resident');

    // Test 3: Tenant B CANNOT read Tenant A's resident
    console.log("Test 3: Tenant B attempts to read Tenant A's resident (Cross-Tenant Read Attack)...");
    const readB = await withTenant(testOrgB, async (client) => {
      const res = await client.query('SELECT * FROM residents WHERE id = $1', [residentIdA]);
      return res.rows;
    });
    assert.strictEqual(readB.length, 0, 'SECURITY VIOLATION: Tenant B was able to read Tenant A data!');
    console.log('  ✅ Passed: Tenant B received 0 rows (Fail-Closed RLS Confirmed)');

    // Test 4: Tenant B CANNOT update Tenant A's resident
    console.log("Test 4: Tenant B attempts to update Tenant A's resident (Cross-Tenant Write Attack)...");
    const updateB = await withTenant(testOrgB, async (client) => {
      const res = await client.query(
        "UPDATE residents SET full_name = 'HACKED BY BETA' WHERE id = $1",
        [residentIdA]
      );
      return res.rowCount;
    });
    assert.strictEqual(updateB, 0, 'SECURITY VIOLATION: Tenant B updated Tenant A data!');
    console.log('  ✅ Passed: Tenant B updated 0 rows (Write Blocked)');

    // Test 5: Tenant B CANNOT delete Tenant A's resident
    console.log("Test 5: Tenant B attempts to delete Tenant A's resident (Cross-Tenant Delete Attack)...");
    const deleteB = await withTenant(testOrgB, async (client) => {
      const res = await client.query('DELETE FROM residents WHERE id = $1', [residentIdA]);
      return res.rowCount;
    });
    assert.strictEqual(deleteB, 0, 'SECURITY VIOLATION: Tenant B deleted Tenant A data!');
    console.log('  ✅ Passed: Tenant B deleted 0 rows (Delete Blocked)');

    // Test 6: Tenant B CANNOT insert a resident with Tenant A's organization_id (Spoofing)
    console.log("Test 6: Tenant B attempts to insert record spoofing Tenant A's organization_id...");
    let spoofBlocked = false;
    try {
      await withTenant(testOrgB, async (client) => {
        await client.query(`
          INSERT INTO residents (
            organization_id, resident_number, full_name, gender, resident_status
          ) VALUES ($1, 'RES-SPOOF', 'Spoofed Resident', 'female', 'active');
        `, [testOrgA]); // Passing Org A ID while context is Org B
      });
    } catch (err) {
      spoofBlocked = true;
      assert.ok(err.message.includes('row-level security policy'), 'Unexpected error message: ' + err.message);
    }
    assert.strictEqual(spoofBlocked, true, 'SECURITY VIOLATION: Cross-tenant insert succeeded!');
    console.log('  ✅ Passed: RLS WITH CHECK policy blocked spoofed organization_id insert');

    // Test 7: Missing tenant context returns 0 rows
    console.log('Test 7: Direct query without tenant context (Fail-Closed Default)...');
    const noContextRes = await pool.query('SELECT * FROM residents WHERE id = $1', [residentIdA]);
    assert.strictEqual(noContextRes.rows.length, 0, 'SECURITY VIOLATION: Query without context returned data!');
    console.log('  ✅ Passed: Query without context returned 0 rows');

    // Test 8: Connection Pool Safety - Verify transaction-local context does not persist on pooled client
    console.log('Test 8: Connection pool cleanup (is_local = true validation)...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [testOrgA]);
      await client.query('COMMIT');

      // Next query on the same physical client after commit should have empty context
      const postContextVal = await client.query(`SELECT current_setting('app.current_organization_id', true) AS ctx`);
      assert.strictEqual(
        postContextVal.rows[0].ctx,
        '',
        'SECURITY VIOLATION: Tenant context leaked across transaction boundaries!'
      );
      console.log('  ✅ Passed: Transaction-local context was completely reset on COMMIT');
    } finally {
      client.release();
    }

    console.log('\n🎉 ALL 8 TENANT ISOLATION & RLS SECURITY TESTS PASSED!');
  } finally {
    // Cleanup test data
    try {
      await pool.query('DELETE FROM residents WHERE organization_id IN ($1, $2)', [testOrgA, testOrgB]);
      await pool.query('DELETE FROM organizations WHERE id IN ($1, $2)', [testOrgA, testOrgB]);
    } catch (e) {}
    await pool.end();
  }
}

runTests().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
