/**
 * ElderCare OS — Auth, Registration, Role Approval, Logout & Role-Based Workspace Security Test Suite
 * Tests against isolated database (`eldercareos_restore_test`).
 * NEVER touches production `eldercareos`.
 */

const assert = require('assert');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Pool } = require('pg');

const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  fs.readFileSync(rootEnvPath, 'utf8').split('\n').forEach((line) => {
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

const TEST_PORT = 3206;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DB = process.env.TEST_DB_NAME || 'eldercareos_restore_test';

function getTestDbUrl() {
  const u = new URL(process.env.DATABASE_URL);
  u.pathname = `/${TEST_DB}`;
  return u.toString();
}

function getAdminPool() {
  const backendEnv = 'C:\\Users\\Shubham Saini\\Desktop\\new project\\backend\\.env';
  const line = fs.readFileSync(backendEnv, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
  const raw = line.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
  const m = raw.match(/postgresql:\/\/([^:]+):(.*)@(localhost|127\.0\.0\.1):(\d+)\/([^?]+)/);
  return new Pool({
    user: m[1],
    password: m[2],
    host: m[3] === 'localhost' ? '127.0.0.1' : m[3],
    port: parseInt(m[4], 10),
    database: TEST_DB,
  });
}

async function waitForServer(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Test server did not start in time');
}

async function api(pathUrl, { method = 'GET', token = null, body = null, ip = '10.60.0.1' } = {}) {
  const reqHeaders = { 'x-forwarded-for': ip };
  if (token) reqHeaders['Cookie'] = `eldercare_session=${token}`;
  if (body && typeof body !== 'string') {
    reqHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${pathUrl}`, { method, headers: reqHeaders, body, redirect: 'manual' });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  console.log(`\nStarting Auth & Role-Based Interface Security Suite on ${TEST_DB}...\n`);
  const adminPool = getAdminPool();
  const testDbUrl = getTestDbUrl();

  const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
  const serverProc = spawn(process.execPath, [nextBin, 'dev', '-p', String(TEST_PORT), '-H', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testDbUrl, PORT: String(TEST_PORT), NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer();
    console.log('Next.js test server running on port', TEST_PORT);

    await adminPool.query(`
      TRUNCATE TABLE
        payment_webhook_events, platform_audit_logs, users, organizations
      RESTART IDENTITY CASCADE;
    `);

    await adminPool.query(`
      INSERT INTO subscription_plans (name, slug, description, price_monthly_inr, price_annual_inr, resident_limit, staff_limit, branch_limit, storage_limit_mb, features, is_active)
      VALUES ('Starter', 'starter', 'Starter', 2999, 29990, 30, 15, 5, 5120, '{}', true)
      ON CONFLICT (slug) DO UPDATE SET staff_limit = 15, is_active = true;
    `);

    const pass = 'AuthRole@2026!';
    const hash = await bcrypt.hash(pass, 10);
    const mkUser = async (email, name, isPo = false) =>
      (await adminPool.query(
        `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at)
         VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP) RETURNING id`,
        [email, hash, name, isPo]
      )).rows[0].id;

    const adminAId = await mkUser('ar-admin-a@test.org', 'Admin A');
    const docAId = await mkUser('ar-doc-a@test.org', 'Doctor A');
    const nurseAId = await mkUser('ar-nurse-a@test.org', 'Nurse A');
    const staffAId = await mkUser('ar-staff-a@test.org', 'Staff A');
    const acctAId = await mkUser('ar-acct-a@test.org', 'Accountant A');
    const famAId = await mkUser('ar-fam-a@test.org', 'Family A');
    const adminBId = await mkUser('ar-admin-b@test.org', 'Admin B');
    const poId = await mkUser('ar-po@test.org', 'Platform Owner', true);

    const orgA = (await adminPool.query(
      `SELECT provision_new_ngo_workspace('Auth Org A', 'auth-org-a', 'a@ngo.test', '9111111111', $1, 'starter', 'Branch A1') AS id`,
      [adminAId]
    )).rows[0].id;
    const orgB = (await adminPool.query(
      `SELECT provision_new_ngo_workspace('Auth Org B', 'auth-org-b', 'b@ngo.test', '9222222222', $1, 'starter', 'Branch B1') AS id`,
      [adminBId]
    )).rows[0].id;

    const brA1 = (await adminPool.query('SELECT id FROM branches WHERE organization_id = $1 LIMIT 1', [orgA])).rows[0].id;
    const rolesA = Object.fromEntries(
      (await adminPool.query('SELECT id, slug FROM roles WHERE organization_id = $1', [orgA])).rows.map((r) => [r.slug, r.id])
    );

    await adminPool.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, status) VALUES
       ($1, $2, $3, $4, 'active'),
       ($5, $2, $6, $4, 'active'),
       ($7, $2, $8, $4, 'active'),
       ($9, $2, $10, $4, 'active'),
       ($11, $2, $12, NULL, 'active')`,
      [docAId, orgA, rolesA.doctor, brA1, nurseAId, rolesA.nurse, staffAId, rolesA.staff, acctAId, rolesA.accountant, famAId, rolesA.family_member]
    );

    const login = async (email, orgId, ip) => {
      const r = await api('/api/auth/login', { method: 'POST', ip, body: { email, password: pass, organizationId: orgId } });
      assert.strictEqual(r.status, 200);
      return r.data.token;
    };

    const tokAdminA = await login('ar-admin-a@test.org', orgA, '10.60.1.1');
    const tokDocA = await login('ar-doc-a@test.org', orgA, '10.60.1.2');
    const tokNurseA = await login('ar-nurse-a@test.org', orgA, '10.60.1.3');
    const tokStaffA = await login('ar-staff-a@test.org', orgA, '10.60.1.4');
    const tokAcctA = await login('ar-acct-a@test.org', orgA, '10.60.1.5');
    const tokFamA = await login('ar-fam-a@test.org', orgA, '10.60.1.6');
    const tokAdminB = await login('ar-admin-b@test.org', orgB, '10.60.1.7');

    // 1. Public registration cannot create Super Admin or self-assign NGO Admin
    console.log('Test 1: Super Admin & self-assigned NGO Admin blocked in public registration...');
    const regSuper = await api('/api/auth/register', {
      method: 'POST',
      ip: '10.60.2.1',
      body: { email: 'evil-po@test.org', password: pass, fullName: 'Evil PO', requestedAccountType: 'super_admin' },
    });
    assert.strictEqual(regSuper.status, 403);

    const regNgoAdmin = await api('/api/auth/register', {
      method: 'POST',
      ip: '10.60.2.2',
      body: {
        email: 'new-req@test.org',
        password: pass,
        fullName: 'Pending Applicant',
        phone: '9999988888',
        requestedAccountType: 'ngo_admin',
        organizationSlug: 'auth-org-a',
      },
    });
    assert.strictEqual(regNgoAdmin.status, 201, JSON.stringify(regNgoAdmin.data));
    assert.strictEqual(regNgoAdmin.data.accountStatus, 'pending_approval');

    // Verify email for new-req@test.org, log in, confirm NO active membership yet
    await api('/api/auth/verify-email', { method: 'POST', body: { token: regNgoAdmin.data.devVerificationToken } });
    const pendingLogin = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.60.2.3',
      body: { email: 'new-req@test.org', password: pass },
    });
    assert.strictEqual(pendingLogin.status, 200);
    assert.strictEqual(pendingLogin.data.session.activeOrgId, null);
    assert.strictEqual((await api('/api/residents', { token: pendingLogin.data.token })).status, 403);
    console.log('  ✅ Passed');

    // 2. Role Approval Workflow & Cross-Tenant / Non-Admin Blocks
    console.log('Test 2: NGO Admin approves registration request; non-admin & cross-tenant blocked...');
    assert.strictEqual((await api('/api/staff/registration-requests', { token: tokDocA })).status, 403);
    const reqList = await api('/api/staff/registration-requests', { token: tokAdminA });
    assert.strictEqual(reqList.status, 200);
    assert.strictEqual(reqList.data.requests.length, 1);
    const reqId = reqList.data.requests[0].id;

    // Org B admin cannot approve Org A's request
    assert.strictEqual(
      (await api('/api/staff/registration-requests', {
        method: 'POST',
        token: tokAdminB,
        body: { requestId: reqId, action: 'approve', assignedRoleId: rolesA.staff },
      })).status,
      404
    );

    // Org A admin approves & assigns Staff role (not admin!)
    const appRes = await api('/api/staff/registration-requests', {
      method: 'POST',
      token: tokAdminA,
      body: { requestId: reqId, action: 'approve', assignedRoleId: rolesA.staff, assignedBranchId: brA1 },
    });
    assert.strictEqual(appRes.status, 200);
    assert.strictEqual(appRes.data.request.status, 'approved');
    console.log('  ✅ Passed');

    // 3. Role Boundaries Across Medical, Staff, Accountant, Family & Platform Owner
    console.log('Test 3: Strict server-side role boundaries across all personas...');
    assert.strictEqual((await api('/api/billing/checkout', { method: 'POST', token: tokDocA, body: { targetPlanSlugOrId: 'starter' } })).status, 403);
    assert.strictEqual((await api('/api/medical/records', { token: tokStaffA })).status, 403);
    assert.strictEqual((await api('/api/medical/records', { token: tokAcctA })).status, 403);
    assert.strictEqual((await api('/api/finance/donations', { token: tokNurseA })).status, 403);
    assert.strictEqual((await api('/api/finance/donations', { token: tokFamA })).status, 403);
    assert.strictEqual((await api('/api/platform/plans', { token: tokAdminA })).status, 403);
    console.log('  ✅ Passed');

    // 4. Complete Logout Revokes Current Session & Prevents Back-Access
    console.log('Test 4: Logout revokes current session and blocks further protected API access...');
    const meBefore = await api('/api/auth/me', { token: tokStaffA });
    assert.strictEqual(meBefore.status, 200);
    assert.ok((meBefore.headers.get('cache-control') || '').includes('no-store'));

    const logoutRes = await api('/api/auth/logout', { method: 'POST', token: tokStaffA });
    assert.strictEqual(logoutRes.status, 200);

    // Revoked token cannot access /api/auth/me or /api/residents
    assert.strictEqual((await api('/api/auth/me', { token: tokStaffA })).status, 401);
    assert.strictEqual((await api('/api/residents', { token: tokStaffA })).status, 401);

    // Other users' sessions remain intact
    assert.strictEqual((await api('/api/auth/me', { token: tokDocA })).status, 200);
    console.log('  ✅ Passed');

    // 5. Super Admin MFA Enforcement
    console.log('Test 5: Super Admin MFA enforcement...');
    const poLogin = await api('/api/auth/login', { method: 'POST', ip: '10.60.3.1', body: { email: 'ar-po@test.org', password: pass } });
    assert.strictEqual(poLogin.status, 200);
    assert.strictEqual((await api('/api/platform/plans', { token: poLogin.data.token })).status, 403);
    console.log('  ✅ Passed');

    console.log('\n🎉 ALL AUTH, REGISTRATION, ROLE APPROVAL & LOGOUT SECURITY TESTS PASSED!\n');
  } finally {
    serverProc.kill();
    await adminPool.end();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Auth & Role security suite failed:', err);
  process.exit(1);
});
