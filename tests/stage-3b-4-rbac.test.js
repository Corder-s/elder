/**
 * Stage 3B-4 Automated Server-Side RBAC, Family Scoping, Branch Isolation & IDOR Test Suite
 * Runs against isolated test database (`eldercareos_restore_test`) using non-superuser `eldercare_app`.
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

const TEST_PORT = 3201;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DB = process.env.TEST_DB_NAME || 'eldercareos_restore_test';

function getTestDbUrl() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL must be configured');
  const u = new URL(baseUrl);
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
  throw new Error('Test Next.js server did not start in time');
}

async function api(route, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  if (options.ip) headers['x-forwarded-for'] = options.ip;
  const res = await fetch(`${BASE_URL}${route}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

async function runRbacTests() {
  const testDbUrl = getTestDbUrl();
  const adminPool = getAdminPool();

  console.log(`🚀 Starting Stage 3B-4 RBAC test server on port ${TEST_PORT} (DB: ${TEST_DB})...`);
  const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
  const serverProc = spawn(process.execPath, [nextBin, 'dev', '-p', String(TEST_PORT)], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      NODE_ENV: 'development',
    },
    stdio: 'pipe',
  });

  const ts = Date.now();
  const pass = 'RbacStrong!123';
  const passHash = await bcrypt.hash(pass, 10);

  // Synthetic Users
  const emails = {
    admin: `rbac.admin.${ts}@test.org`,
    doctor: `rbac.doctor.${ts}@test.org`,
    accountant: `rbac.acct.${ts}@test.org`,
    nurse: `rbac.nurse.${ts}@test.org`,
    family: `rbac.family.${ts}@test.org`,
    platform: `rbac.platform.${ts}@test.org`,
  };

  let orgId;
  let orgBId;
  let branch1Id;
  let branch2Id;
  let resAId;
  let resBId;
  let userIds = {};

  try {
    await waitForServer();
    console.log('✅ Test server ready.\n');

    // Create synthetic users
    for (const [key, email] of Object.entries(emails)) {
      const r = await adminPool.query(
        `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at)
         VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP) RETURNING id`,
        [email, passHash, `Synthetic ${key}`, key === 'platform']
      );
      userIds[key] = r.rows[0].id;
    }

    // Provision Org A via stored procedure (creates all 8 roles + permissions + main branch HQ-01)
    const provA = await adminPool.query(
      `SELECT provision_new_ngo_workspace($1, $2, $3, '9999999999', $4, 'enterprise', 'Branch Alpha') AS org_id`,
      [`RBAC Test NGO ${ts}`, `rbac-ngo-${ts}`, emails.admin, userIds.admin]
    );
    orgId = provA.rows[0].org_id;

    // Provision Org B
    const provB = await adminPool.query(
      `SELECT provision_new_ngo_workspace($1, $2, $3, '8888888888', $4, 'starter', 'Branch Beta') AS org_id`,
      [`RBAC Other NGO ${ts}`, `rbac-other-${ts}`, emails.platform, userIds.admin]
    );
    orgBId = provB.rows[0].org_id;

    // Fetch branches & roles for Org A
    const br1 = await adminPool.query('SELECT id FROM branches WHERE organization_id = $1 LIMIT 1', [orgId]);
    branch1Id = br1.rows[0].id;
    const br2 = await adminPool.query(
      `INSERT INTO branches (organization_id, name, code, is_main_branch, status)
       VALUES ($1, 'Branch Two', 'BR-02', false, 'active') RETURNING id`,
      [orgId]
    );
    branch2Id = br2.rows[0].id;

    const rolesRes = await adminPool.query(
      'SELECT id, slug FROM roles WHERE organization_id = $1',
      [orgId]
    );
    const roleMap = Object.fromEntries(rolesRes.rows.map((r) => [r.slug, r.id]));

    // Assign memberships in Org A
    await adminPool.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, status)
       VALUES
         ($1, $2, $3, $4, 'active'),
         ($5, $2, $6, $4, 'active'),
         ($7, $2, $8, $4, 'active'),
         ($9, $2, $10, NULL, 'active')
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [
        userIds.doctor, orgId, roleMap.doctor, branch1Id,
        userIds.accountant, roleMap.accountant,
        userIds.nurse, roleMap.nurse,
        userIds.family, roleMap.family_member,
      ]
    );

    // Seed two residents in Org A (Resident A in Branch 1, Resident B in Branch 2)
    const rA = await adminPool.query(
      `INSERT INTO residents (organization_id, branch_id, resident_number, full_name, gender, resident_status)
       VALUES ($1, $2, 'RES-RBAC-A', 'Resident Alpha', 'male', 'active') RETURNING id`,
      [orgId, branch1Id]
    );
    resAId = rA.rows[0].id;

    const rB = await adminPool.query(
      `INSERT INTO residents (organization_id, branch_id, resident_number, full_name, gender, resident_status)
       VALUES ($1, $2, 'RES-RBAC-B', 'Resident Beta', 'female', 'active') RETURNING id`,
      [orgId, branch2Id]
    );
    resBId = rB.rows[0].id;

    // Seed medical records for Resident A and Resident B, plus confidential & public docs, plus donation
    await adminPool.query(
      `INSERT INTO medical_records (organization_id, resident_id, doctor_id, diagnosis, clinical_notes)
       VALUES
         ($1, $2, $4, 'Hypertension', 'Stable on meds'),
         ($1, $3, $4, 'Diabetes Type 2', 'Confidential clinical note')`,
      [orgId, resAId, resBId, userIds.doctor]
    );
    await adminPool.query(
      `INSERT INTO documents (organization_id, resident_id, uploaded_by, title, document_type, file_name, file_size_bytes, mime_type, s3_key, is_confidential)
       VALUES
         ($1, $2, $4, 'Public Summary A', 'general', 'a.pdf', 1024, 'application/pdf', 'k1', false),
         ($1, $3, $4, 'Secret Legal B', 'legal', 'b.pdf', 2048, 'application/pdf', 'k2', true)`,
      [orgId, resAId, resBId, userIds.admin]
    );
    await adminPool.query(
      `INSERT INTO donations (organization_id, donor_name, donor_pan, amount, receipt_number, status)
       VALUES ($1, 'Generous Donor', 'ABCDE1234F', 50000, '80G-TEST-001', 'completed')`,
      [orgId]
    );

    // Link family member ONLY to Resident A (with can_view_records = true)
    await adminPool.query(
      `INSERT INTO resident_family_links (organization_id, user_id, resident_id, relationship, can_view_vitals, can_view_records)
       VALUES ($1, $2, $3, 'Son', true, true)`,
      [orgId, userIds.family, resAId]
    );

    // Log in all synthetic users
    const tokens = {};
    for (const [idx, key] of Object.keys(emails).entries()) {
      const loginRes = await api('/api/auth/login', {
        method: 'POST',
        ip: `10.88.0.${idx + 1}`,
        body: { email: emails[key], password: pass, organizationId: key === 'platform' ? undefined : orgId },
      });
      assert.strictEqual(loginRes.status, 200, `Login failed for ${key}: ${JSON.stringify(loginRes.data)}`);
      tokens[key] = loginRes.data.token;
    }

    // =========================================================================
    // Test 1: Unauthenticated requests rejected (401)
    // =========================================================================
    console.log('Test 1: Unauthenticated requests rejected across all operational routes...');
    for (const ep of ['/api/residents', '/api/admissions', '/api/medical/records', '/api/finance/donations', '/api/documents', '/api/attendance', '/api/subscription/usage']) {
      const r = await api(ep);
      assert.strictEqual(r.status, 401, `${ep} should return 401 without token`);
    }
    console.log('  ✅ Passed');

    // =========================================================================
    // Test 2: Financial data restricted from non-finance roles
    // =========================================================================
    console.log('Test 2: Nurse & Family cannot read or write donations; Accountant can...');
    assert.strictEqual((await api('/api/finance/donations', { token: tokens.nurse })).status, 403);
    assert.strictEqual((await api('/api/finance/donations', { token: tokens.family })).status, 403);
    assert.strictEqual((await api('/api/finance/donations', { token: tokens.doctor })).status, 403);
    const acctDon = await api('/api/finance/donations', { token: tokens.accountant });
    assert.strictEqual(acctDon.status, 200);
    assert.strictEqual(acctDon.data.donations.length, 1);
    console.log('  ✅ Passed');

    // =========================================================================
    // Test 3: Medical records restricted to clinicians + Platform Owner blocked
    // =========================================================================
    console.log('Test 3: Accountant & Platform Owner blocked from medical records; Doctor allowed...');
    assert.strictEqual((await api('/api/medical/records', { token: tokens.accountant })).status, 403);
    assert.strictEqual((await api('/api/medical/records', { token: tokens.platform })).status, 403);
    // Even if Platform Owner has an NGO membership, medical records MUST remain blocked
    await adminPool.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [userIds.platform, orgId, roleMap.admin]
    );
    const platLoginOrg = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.88.0.50',
      body: { email: emails.platform, password: pass, organizationId: orgId },
    });
    assert.strictEqual((await api('/api/medical/records', { token: platLoginOrg.data.token })).status, 403);

    // Nurse can read medical records but cannot write clinical diagnoses
    assert.strictEqual((await api('/api/medical/records', { token: tokens.nurse })).status, 200);
    assert.strictEqual(
      (await api('/api/medical/records', {
        method: 'POST',
        token: tokens.nurse,
        body: { residentId: resAId, diagnosis: 'Unauthorized diagnosis' },
      })).status,
      403
    );
    // Doctor can write medical records
    const docPost = await api('/api/medical/records', {
      method: 'POST',
      token: tokens.doctor,
      body: { residentId: resAId, diagnosis: 'Doctor diagnosis' },
    });
    assert.strictEqual(docPost.status, 201);
    console.log('  ✅ Passed');

    // =========================================================================
    // Test 4: Family Member Scoping & IDOR Prevention
    // =========================================================================
    console.log('Test 4: Family member sees ONLY linked Resident A and gets 403 on Resident B IDOR...');
    const famRes = await api('/api/residents', { token: tokens.family });
    assert.strictEqual(famRes.status, 200);
    assert.strictEqual(famRes.data.residents.length, 1);
    assert.strictEqual(famRes.data.residents[0].id, resAId);

    const famMedA = await api(`/api/medical/records?residentId=${resAId}`, { token: tokens.family });
    assert.strictEqual(famMedA.status, 200);
    assert.ok(famMedA.data.records.every((r) => r.resident_id === resAId));

    const famMedB = await api(`/api/medical/records?residentId=${resBId}`, { token: tokens.family });
    assert.strictEqual(famMedB.status, 403, 'Family IDOR to unlinked resident medical records must return 403');

    const famDocB = await api(`/api/documents?residentId=${resBId}`, { token: tokens.family });
    assert.strictEqual(famDocB.status, 403, 'Family IDOR to unlinked resident documents must return 403');
    console.log('  ✅ Passed');

    // =========================================================================
    // Test 5: Branch Isolation & Confidential Documents
    // =========================================================================
    console.log('Test 5: Branch-scoped nurse sees Branch 1 resident only; confidential docs restricted...');
    const nurseRes = await api('/api/residents', { token: tokens.nurse });
    assert.strictEqual(nurseRes.status, 200);
    assert.strictEqual(nurseRes.data.residents.length, 1);
    assert.strictEqual(nurseRes.data.residents[0].id, resAId);

    const adminRes = await api('/api/residents', { token: tokens.admin });
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.data.residents.length, 2);

    const famDocs = await api('/api/documents', { token: tokens.family });
    assert.strictEqual(famDocs.status, 200);
    assert.ok(famDocs.data.documents.every((d) => d.is_confidential === false));
    console.log('  ✅ Passed');

    // =========================================================================
    // Test 6: Live DB Role Change Immediately Enforced (No Stale JWT)
    // =========================================================================
    console.log('Test 6: Live DB role downgrade immediately revokes medical access on existing JWT...');
    await adminPool.query(
      'UPDATE organization_memberships SET role_id = $1 WHERE user_id = $2 AND organization_id = $3',
      [roleMap.accountant, userIds.doctor, orgId]
    );
    const downgradedMed = await api('/api/medical/records', { token: tokens.doctor });
    assert.strictEqual(downgradedMed.status, 403, 'Downgraded user must immediately lose medical:record:read');
    console.log('  ✅ Passed');

    console.log('\n🎉 ALL 6 STAGE 3B-4 RBAC & ISOLATION SUITES PASSED (100%)!');
  } finally {
    serverProc.kill();
    try {
      await adminPool.query("DELETE FROM auth_rate_limits WHERE bucket_key LIKE '%10.88.%'");
    } catch {}
    await adminPool.end();
  }
}

runRbacTests().catch((err) => {
  console.error('❌ Stage 3B-4 RBAC Test Failed:', err);
  process.exit(1);
});
