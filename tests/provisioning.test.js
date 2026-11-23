/**
 * Automated Dynamic NGO Workspace Provisioning Test
 * Verifies end-to-end atomic provisioning of organizations, roles, memberships, and subscriptions.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

async function run() {
  console.log('🧪 Testing Dynamic NGO Workspace Provisioning...\n');

  const testEmail = `admin-${Date.now()}@testdynamic.org`;
  const testSlug = `dyn-ngo-${Date.now()}`;
  let adminUserId = null;
  let orgId = null;

  try {
    // 1. Create Admin User
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Secret123!', salt);
    const userRes = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone)
      VALUES ($1, $2, 'Dynamic Admin User', '9876543210')
      RETURNING id;
    `, [testEmail, hash]);
    adminUserId = userRes.rows[0].id;
    console.log('  ✅ Admin user created with ID:', adminUserId);

    // 2. Invoke provision_new_ngo_workspace
    const provRes = await pool.query(`
      SELECT provision_new_ngo_workspace(
        $1, $2, $3, $4, $5, 'professional', 'North Campus Branch'
      ) AS organization_id;
    `, ['Dynamic Elder Haven', testSlug, testEmail, '9876543210', adminUserId]);

    orgId = provRes.rows[0].organization_id;
    assert.ok(orgId, 'Organization ID should be returned');
    console.log('  ✅ Organization atomically provisioned with ID:', orgId);

    // 3. Verify Organization record (Global table)
    const orgRes = await pool.query('SELECT name, slug, status FROM organizations WHERE id = $1', [orgId]);
    assert.strictEqual(orgRes.rows[0].slug, testSlug);
    assert.strictEqual(orgRes.rows[0].status, 'trial');
    console.log('  ✅ Organization verified with trial status');

    // 4. Verify Branch record (Tenant RLS table - query in tenant context)
    const branchRes = await withTenant(orgId, async (client) => {
      const res = await client.query('SELECT name, is_main_branch FROM branches WHERE organization_id = $1', [orgId]);
      return res.rows;
    });
    assert.strictEqual(branchRes.length, 1);
    assert.strictEqual(branchRes[0].name, 'North Campus Branch');
    assert.strictEqual(branchRes[0].is_main_branch, true);
    console.log('  ✅ Default Main Branch provisioned and readable within tenant context');

    // 5. Verify Roles provisioned
    const rolesRes = await withTenant(orgId, async (client) => {
      const res = await client.query('SELECT slug, name FROM roles WHERE organization_id = $1', [orgId]);
      return res.rows;
    });
    assert.strictEqual(rolesRes.length, 8); // 8 standard roles
    console.log(`  ✅ All 8 standard tenant roles provisioned for workspace`);

    // 6. Verify Admin Membership
    const memRes = await withTenant(orgId, async (client) => {
      const res = await client.query(`
        SELECT m.status, r.slug AS role_slug
        FROM organization_memberships m
        JOIN roles r ON m.role_id = r.id
        WHERE m.organization_id = $1 AND m.user_id = $2
      `, [orgId, adminUserId]);
      return res.rows;
    });
    assert.strictEqual(memRes.length, 1);
    assert.strictEqual(memRes[0].role_slug, 'admin');
    assert.strictEqual(memRes[0].status, 'active');
    console.log('  ✅ Admin membership verified with active admin role');

    // 7. Verify Subscription (Professional plan with 14-day trial)
    const subRes = await withTenant(orgId, async (client) => {
      const res = await client.query(`
        SELECT ts.status, sp.slug AS plan_slug, sp.resident_limit
        FROM tenant_subscriptions ts
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE ts.organization_id = $1
      `, [orgId]);
      return res.rows;
    });
    assert.strictEqual(subRes[0].status, 'trial');
    assert.strictEqual(subRes[0].plan_slug, 'professional');
    assert.strictEqual(subRes[0].resident_limit, 100);
    console.log('  ✅ Professional subscription attached with 100 resident quota & trial status');

    console.log('\n🎉 DYNAMIC PROVISIONING TEST PASSED COMPLETELY!');
  } finally {
    if (orgId) {
      await pool.query('DELETE FROM organizations WHERE id = $1', [orgId]);
    }
    if (adminUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    }
    await pool.end();
  }
}

run().catch(err => {
  console.error('\n❌ Provisioning Test Failed:', err);
  process.exit(1);
});
