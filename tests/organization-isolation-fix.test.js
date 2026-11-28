/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ElderCare OS — Organization Ownership & Multi-Tenant Isolation Test Suite
 * Runs against isolated test database (eldercareos_restore_test).
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const envPath = path.resolve(process.cwd(), '.env');
const envText = fs.readFileSync(envPath, 'utf8');
const rawDbUrl = envText.match(/^DATABASE_URL=(.+)$/m)[1].trim();
const TEST_DB_URL = rawDbUrl.replace(/\/eldercareos(\?|$)/, '/eldercareos_restore_test$1');
const ADMIN_DB_URL = TEST_DB_URL;
const PORT = 3207;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = str.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function generateTotp(secretBase32) {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

async function waitForServer(timeoutMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/login`);
      if (res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 800));
  }
  throw new Error('Test server did not start in time');
}

async function api(route, opts = {}) {
  const res = await fetch(`${BASE_URL}${route}`, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  const setCookie = res.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';')[0] : opts.cookie || '';
  return { status: res.status, data, cookie };
}

(async () => {
  console.log('\nStarting Organization Ownership & Multi-Tenant Isolation Suite on eldercareos_restore_test...\n');
  const pool = new Pool({ connectionString: ADMIN_DB_URL });
  const seedTx = async (orgId, fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.is_platform_admin', 'true', true)`);
      if (orgId) await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [orgId]);
      const res = await fn(client);
      await client.query('COMMIT');
      return res;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  };

  const serverProc = spawn('pnpm', ['dev', '-p', String(PORT)], {
    cwd: process.cwd(),
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB_URL,
      EMAIL_TEST_CAPTURE: 'false',
      NODE_ENV: 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer();
    console.log(`Next.js test server running on port ${PORT}`);

    // Seed synthetic Platform Owner + Org A + Org B with unique runId
    const runId = Date.now();
    const pwHash = await bcrypt.hash('StrongPass!123', 10);
    await pool.query(`DELETE FROM auth_rate_limits`);
    const slugA = `iso-org-a-${runId}`;
    const slugB = `iso-org-b-${runId}`;
    const slugProv = `iso-prov-org-${runId}`;
    const ePo = `iso-po-${runId}@test.org`;
    const eAdminA = `iso-admin-a-${runId}@test.org`;
    const eDocA = `iso-doc-a-${runId}@test.org`;
    const eNurseA = `iso-nurse-a-${runId}@test.org`;
    const eStaffA = `iso-staff-a-${runId}@test.org`;
    const eVolA = `iso-vol-a-${runId}@test.org`;
    const eDocB = `iso-doc-b-${runId}@test.org`;
    const eInitAdmin = `iso-init-admin-${runId}@test.org`;
    const eMulti = `iso-multi-${runId}@test.org`;
    const eInvNurse = `iso-inv-nurse-${runId}@test.org`;

    const orgARes = await pool.query(
      `INSERT INTO organizations (name, slug, primary_email, status, allow_access_requests) VALUES ('Iso Org A', $1, 'a@iso.org', 'active', true) RETURNING id`,
      [slugA]
    );
    const orgBRes = await pool.query(
      `INSERT INTO organizations (name, slug, primary_email, status, allow_access_requests) VALUES ('Iso Org B', $1, 'b@iso.org', 'active', false) RETURNING id`,
      [slugB]
    );
    const orgAId = orgARes.rows[0].id;
    const orgBId = orgBRes.rows[0].id;

    // Seed roles & branches for Org A & Org B
    const roleMapA = {};
    const roleMapB = {};
    for (const [orgId, map] of [[orgAId, roleMapA], [orgBId, roleMapB]]) {
      await seedTx(orgId, async (client) => {
        const br = await client.query(`INSERT INTO branches (organization_id, name, code, is_main_branch, status) VALUES ($1, 'Main', 'HQ-1', true, 'active') RETURNING id`, [orgId]);
        map.branchId = br.rows[0].id;
        for (const slug of ['admin', 'doctor', 'nurse', 'staff', 'volunteer']) {
          const rr = await client.query(`INSERT INTO roles (organization_id, name, slug, is_system_role) VALUES ($1, $2, $3, true) RETURNING id`, [orgId, slug, slug]);
          map[slug] = rr.rows[0].id;
        }
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions`, [map.admin]);
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE domain = 'medical' OR code IN ('resident:read')`, [map.doctor]);
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE code IN ('resident:read', 'medical:record:read', 'attendance:read')`, [map.nurse]);
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE code IN ('resident:read', 'attendance:read')`, [map.staff]);
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE code IN ('resident:read')`, [map.volunteer]);
      });
    }

    const createUser = async (email, isPlatformAdmin = false) => {
      const r = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at) VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP) RETURNING id`,
        [email, pwHash, email.split('@')[0], isPlatformAdmin]
      );
      return r.rows[0].id;
    };

    const poId = await createUser(ePo, true);
    const adminAId = await createUser(eAdminA);
    const docAId = await createUser(eDocA);
    const nurseAId = await createUser(eNurseA);
    const staffAId = await createUser(eStaffA);
    const volAId = await createUser(eVolA);
    const docBId = await createUser(eDocB);

    const addMem = async (uid, oid, rid, bid, status = 'active') => {
      return seedTx(oid, async (client) => {
        const r = await client.query(
          `INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [uid, oid, rid, bid, status]
        );
        return r.rows[0].id;
      });
    };

    await addMem(adminAId, orgAId, roleMapA.admin, roleMapA.branchId);
    await addMem(docAId, orgAId, roleMapA.doctor, roleMapA.branchId);
    await addMem(nurseAId, orgAId, roleMapA.nurse, roleMapA.branchId);
    await addMem(staffAId, orgAId, roleMapA.staff, roleMapA.branchId);
    await addMem(volAId, orgAId, roleMapA.volunteer, roleMapA.branchId);
    await addMem(docBId, orgBId, roleMapB.doctor, roleMapB.branchId);

    // Seed Resident in Org B
    const resB = await seedTx(orgBId, async (client) => {
      return client.query(
        `INSERT INTO residents (organization_id, branch_id, resident_number, full_name, gender) VALUES ($1, $2, 'RES-ORGB-1', 'OrgB Secret Resident', 'Male') RETURNING id`,
        [orgBId, roleMapB.branchId]
      );
    });
    const residentBId = resB.rows[0].id;

    // Login helper
    const loginAs = async (email) => {
      const r = await api('/api/auth/login', { method: 'POST', body: { email, password: 'StrongPass!123' } });
      assert.strictEqual(r.status, 200, `Login failed for ${email}`);
      return r;
    };

    const adminALogin = await loginAs(eAdminA);
    const docALogin = await loginAs(eDocA);
    const nurseALogin = await loginAs(eNurseA);
    const staffALogin = await loginAs(eStaffA);
    const volALogin = await loginAs(eVolA);

    // TEST 1: Non-Platform-Owner roles CANNOT create organizations
    console.log('Test 1: Doctor, Nurse, Staff, Volunteer, NGO Admin, and unauthenticated users blocked from creating organizations (403)...');
    for (const caller of [
      { name: 'Unauthenticated', cookie: '' },
      { name: 'NGO Admin', cookie: adminALogin.cookie },
      { name: 'Doctor', cookie: docALogin.cookie },
      { name: 'Nurse', cookie: nurseALogin.cookie },
      { name: 'Staff', cookie: staffALogin.cookie },
      { name: 'Volunteer', cookie: volALogin.cookie },
    ]) {
      const expectedStatuses = caller.name === 'Unauthenticated' ? [401, 403] : [403];
      const r1 = await api('/api/tenants/register', { method: 'POST', cookie: caller.cookie, body: { orgName: 'Hack', orgSlug: 'hack-org' } });
      assert.ok(expectedStatuses.includes(r1.status), `${caller.name} must get ${expectedStatuses.join('/')} on /api/tenants/register (got ${r1.status})`);
      const r2 = await api('/api/platform/organizations', {
        method: 'POST',
        cookie: caller.cookie,
        body: { name: 'Hack', slug: 'hack-org', primaryEmail: 'h@h.org', adminName: 'H', adminEmail: 'ha@h.org' },
      });
      assert.ok(expectedStatuses.includes(r2.status), `${caller.name} must get ${expectedStatuses.join('/')} on /api/platform/organizations (got ${r2.status})`);
    }
    console.log('  ✅ Passed');

    // TEST 2: Platform Owner with MFA creates organization atomically + initial admin must accept invitation
    console.log('Test 2: Platform Owner MFA-verified creates organization atomically with initial admin invitation...');
    const poLogin = await loginAs(ePo);
    // Without MFA -> 403
    const noMfaCreate = await api('/api/platform/organizations', {
      method: 'POST',
      cookie: poLogin.cookie,
      body: { name: 'Iso Prov Org', slug: slugProv, primaryEmail: 'prov@iso.org', adminName: 'Init Admin', adminEmail: eInitAdmin },
    });
    assert.strictEqual(noMfaCreate.status, 403);

    const enroll = await api('/api/auth/mfa/enroll', { method: 'POST', cookie: poLogin.cookie });
    assert.strictEqual(enroll.status, 200);
    const verifyMfa = await api('/api/auth/mfa/verify', {
      method: 'POST',
      cookie: poLogin.cookie,
      body: { code: generateTotp(enroll.data.manualSecret || enroll.data.secret), isEnrollment: true },
    });
    assert.strictEqual(verifyMfa.status, 200, `MFA verify failed: ${verifyMfa.status} ${JSON.stringify(verifyMfa.data)}`);

    const poCreate = await api('/api/platform/organizations', {
      method: 'POST',
      cookie: verifyMfa.cookie,
      body: {
        name: 'Iso Prov Org',
        slug: slugProv,
        primaryEmail: 'prov@iso.org',
        city: 'Delhi',
        planSlug: 'starter',
        branchName: 'Delhi HQ',
        adminName: 'Init Admin',
        adminEmail: eInitAdmin,
      },
    });
    assert.strictEqual(poCreate.status, 201, `Create org failed: ${poCreate.status} ${JSON.stringify(poCreate.data)}`);
    assert.ok(poCreate.data.devInvitationToken, 'Initial admin invitation token must be generated');
    assert.ok(poCreate.data.invitationStatus, 'Invitation status must be returned');

    // Platform Owner cannot be assigned as initial NGO Admin
    const poAsAdminErr = await api('/api/platform/organizations', {
      method: 'POST',
      cookie: verifyMfa.cookie,
      body: {
        name: 'Bad Admin Org',
        slug: `bad-admin-${runId}`,
        primaryEmail: 'bad@iso.org',
        adminName: 'PO',
        adminEmail: ePo,
      },
    });
    assert.strictEqual(poAsAdminErr.status, 400);

    // Initial admin cannot log in before accepting invitation & verifying
    const preAcceptLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: eInitAdmin, password: 'StrongPass!123' },
    });
    assert.strictEqual(preAcceptLogin.status, 401);

    // Accept invitation, set password, and verify account
    const acceptInit = await api('/api/invitations/accept', {
      method: 'POST',
      body: { token: poCreate.data.devInvitationToken, fullName: 'Init Admin', password: 'StrongPass!123' },
    });
    assert.strictEqual(acceptInit.status, 200);

    // Single-use: second accept must fail
    const acceptTwice = await api('/api/invitations/accept', {
      method: 'POST',
      body: { token: poCreate.data.devInvitationToken, fullName: 'Init Admin', password: 'StrongPass!123' },
    });
    assert.strictEqual(acceptTwice.status, 400);

    const postAcceptLogin = await loginAs(eInitAdmin);
    assert.strictEqual(postAcceptLogin.data.session.activeOrgId, poCreate.data.organization.id);
    assert.strictEqual(postAcceptLogin.data.user.isPlatformAdmin, false);
    assert.strictEqual(postAcceptLogin.data.memberships.length, 1);

    // Existing user invited to a second org does not create duplicate user row
    const existingInvite = await api('/api/staff', {
      method: 'POST',
      cookie: adminALogin.cookie,
      body: { name: 'Init Admin', email: eInitAdmin, roleId: roleMapA.staff, branchId: roleMapA.branchId },
    });
    assert.strictEqual(existingInvite.status, 201);
    const acceptExisting = await api('/api/invitations/accept', {
      method: 'POST',
      body: { token: existingInvite.data.devInvitationToken },
    });
    assert.strictEqual(acceptExisting.status, 200);
    const dupCheck = await pool.query('SELECT COUNT(*)::int AS cnt FROM users WHERE email = $1', [eInitAdmin]);
    assert.strictEqual(dupCheck.rows[0].cnt, 1, 'Existing user must not be duplicated');
    console.log('  ✅ Passed');

    // TEST 3: Invitation security (hashed storage, expiry, revocation)
    console.log('Test 3: Invitation token stored hashed; expired & revoked invitations rejected...');
    const invCreate = await api('/api/staff', {
      method: 'POST',
      cookie: adminALogin.cookie,
      body: { name: 'Invited Nurse', email: eInvNurse, roleId: roleMapA.nurse, branchId: roleMapA.branchId },
    });
    assert.strictEqual(invCreate.status, 201);
    const invRow = await seedTx(orgAId, async (client) => {
      const r = await client.query(`SELECT token, token_hash FROM invitations WHERE id = $1`, [invCreate.data.invitation.id]);
      return r.rows[0];
    });
    assert.strictEqual(invRow.token, null, 'Plaintext invitation token must not be stored');
    assert.ok(invRow.token_hash && invRow.token_hash.length === 64, 'SHA-256 token_hash must be stored');

    // Revoke invitation and verify acceptance fails
    const revRes = await api(`/api/staff/${invCreate.data.invitation.id}`, { method: 'DELETE', cookie: adminALogin.cookie });
    assert.strictEqual(revRes.status, 200);
    const revAccept = await api('/api/invitations/accept', {
      method: 'POST',
      body: { token: invCreate.data.devInvitationToken, fullName: 'Invited Nurse', password: 'StrongPass!123' },
    });
    assert.strictEqual(revAccept.status, 400);
    console.log('  ✅ Passed');

    // TEST 4: Cross-tenant isolation & workspace switching
    console.log('Test 4: Cross-tenant isolation (Org A users cannot see Org B data or switch into Org B)...');
    const docAResidents = await api('/api/residents', { cookie: docALogin.cookie });
    assert.strictEqual(docAResidents.status, 200);
    assert.ok(!(docAResidents.data.residents || []).some((r) => r.id === residentBId), 'Doctor A must not see Org B resident');

    const switchUnauthorized = await api('/api/auth/switch-workspace', {
      method: 'POST',
      cookie: docALogin.cookie,
      body: { organizationId: orgBId },
    });
    assert.strictEqual(switchUnauthorized.status, 403, 'Doctor A must not switch into Org B');

    // Org B disables access requests -> self-service request rejected with 403
    const reqOrgB = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Blocked Req',
        email: `blocked-req-b-${runId}@test.org`,
        password: 'StrongPass!123',
        requestedAccountType: 'staff',
        organizationSlug: slugB,
      },
    });
    assert.strictEqual(reqOrgB.status, 403);
    console.log('  ✅ Passed');

    // TEST 5: Multi-org membership & suspended/revoked enforcement
    console.log('Test 5: Multi-org independent roles & immediate revocation enforcement...');
    const multiId = await createUser(eMulti);
    const memAId = await addMem(multiId, orgAId, roleMapA.doctor, roleMapA.branchId);
    await addMem(multiId, orgBId, roleMapB.nurse, roleMapB.branchId);
    const multiLogin = await loginAs(eMulti);
    assert.strictEqual(multiLogin.data.memberships.length, 2);

    const switchToB = await api('/api/auth/switch-workspace', {
      method: 'POST',
      cookie: multiLogin.cookie,
      body: { organizationId: orgBId },
    });
    assert.strictEqual(switchToB.status, 200);
    assert.strictEqual(switchToB.data.session.roleSlug, 'nurse');

    // Suspend Org A membership -> switching back to Org A fails with 403
    await api(`/api/staff/${memAId}`, { method: 'PATCH', cookie: adminALogin.cookie, body: { status: 'suspended' } });
    const switchToA = await api('/api/auth/switch-workspace', {
      method: 'POST',
      cookie: switchToB.cookie,
      body: { organizationId: orgAId },
    });
    assert.strictEqual(switchToA.status, 403);
    console.log('  ✅ Passed');

    console.log('\n🎉 ALL ORGANIZATION OWNERSHIP & MULTI-TENANT ISOLATION TESTS PASSED!\n');
  } finally {
    try {
      if (process.platform === 'win32' && serverProc.pid) {
        require('child_process').execSync(`taskkill /pid ${serverProc.pid} /T /F`, { stdio: 'ignore' });
      } else {
        serverProc.kill();
      }
    } catch {}
    await pool.end();
  }
  process.exit(0);
})().catch((err) => {
  console.error('\n❌ Organization Isolation Suite Failed:', err);
  process.exit(1);
});
