/**
 * Stage 3B-3 Automated Authentication & Account Security Test Suite
 * Tests all 20 required security vectors against an isolated test database (`eldercareos_restore_test`).
 * NEVER touches production `eldercareos`.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Pool } = require('pg');

// Load .env
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

const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DB = process.env.TEST_DB_NAME || 'eldercareos_restore_test';
const EMAIL_CAPTURE_FILE = path.resolve(__dirname, '../.tmp_test_emails.jsonl');

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

function decodeBase32(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateTotp(secret, timestampMs = Date.now()) {
  const key = decodeBase32(secret);
  const counter = Math.floor(timestampMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

function readCapturedEmails() {
  if (!fs.existsSync(EMAIL_CAPTURE_FILE)) return [];
  const lines = fs.readFileSync(EMAIL_CAPTURE_FILE, 'utf8').trim().split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function extractTokenFromEmail(emailObj) {
  const m = emailObj.text.match(/(?:Verification|Reset) Token:\s*([a-f0-9]{64})/i);
  return m ? m[1] : null;
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
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options.ip) {
    headers['x-forwarded-for'] = options.ip;
  }
  const res = await fetch(`${BASE_URL}${route}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data, headers: res.headers };
}

async function runTests() {
  if (fs.existsSync(EMAIL_CAPTURE_FILE)) fs.unlinkSync(EMAIL_CAPTURE_FILE);

  const testDbUrl = getTestDbUrl();
  const adminPool = getAdminPool();

  // Start isolated Next.js dev server pointing to TEST_DB
  console.log(`🚀 Starting isolated test server on port ${TEST_PORT} (DB: ${TEST_DB})...`);
  const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
  const serverProc = spawn(process.execPath, [nextBin, 'dev', '-p', String(TEST_PORT)], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      EMAIL_TEST_CAPTURE: 'true',
      EMAIL_TEST_CAPTURE_FILE: EMAIL_CAPTURE_FILE,
      NODE_ENV: 'development',
    },
    stdio: 'pipe',
  });

  let serverOut = '';
  serverProc.stderr.on('data', (d) => { serverOut += d.toString(); });

  try {
    await waitForServer();
    console.log('✅ Isolated test server is ready.\n');

    // Clean synthetic test data
    const testSuffix = Date.now();
    const userEmail = `sec.user.${testSuffix}@eldercare-test.org`;
    const adminEmail = `sec.platform.${testSuffix}@eldercare-test.org`;
    const userPass1 = 'StrongPass!123';
    const userPass2 = 'NewStrongPass!456';
    const adminPass = 'PlatformMaster!987';

    // Ensure two orgs exist for workspace switching & membership tests
    const org1Id = '88888888-8888-4888-8888-888888888881';
    const org2Id = '88888888-8888-4888-8888-888888888882';
    await adminPool.query(`
      INSERT INTO organizations (id, name, slug, primary_email, status)
      VALUES
        ($1, 'Test Org Alpha 3B3', 'test-alpha-3b3', 'alpha3b3@test.org', 'active'),
        ($2, 'Test Org Beta 3B3', 'test-beta-3b3', 'beta3b3@test.org', 'active')
      ON CONFLICT (id) DO NOTHING;
    `, [org1Id, org2Id]);

    // Clean rate limit buckets for test IPs
    await adminPool.query("DELETE FROM auth_rate_limits WHERE bucket_key LIKE '%10.99.%'");

    // =========================================================================
    // 1. Register & Email Verification Flow
    // =========================================================================
    console.log('Test 1: Register creates unverified user & dispatches verification token...');
    const regRes = await api('/api/auth/register', {
      method: 'POST',
      ip: '10.99.0.1',
      body: { email: userEmail, password: userPass1, fullName: 'Synthetic Test User' },
    });
    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.data.requiresVerification, true);
    const emailsAfterReg = readCapturedEmails().filter((e) => e.to === userEmail);
    assert.strictEqual(emailsAfterReg.length, 1);
    const verifToken = extractTokenFromEmail(emailsAfterReg[0]);
    assert.ok(verifToken && verifToken.length === 64, 'Verification token must be 64-char hex');
    console.log('  ✅ Passed');

    console.log('Test 2: Unverified user blocked from signing in...');
    const unverifiedLogin = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.0.2',
      body: { email: userEmail, password: userPass1 },
    });
    assert.strictEqual(unverifiedLogin.status, 403);
    assert.strictEqual(unverifiedLogin.data.requiresVerification, true);
    console.log('  ✅ Passed');

    console.log('Test 3: Expired verification token rejected...');
    const expiredRaw = crypto.randomBytes(32).toString('hex');
    const expiredHash = crypto.createHash('sha256').update(expiredRaw).digest('hex');
    const userRow = (await adminPool.query('SELECT id FROM users WHERE email = $1', [userEmail])).rows[0];
    await adminPool.query(
      `INSERT INTO user_verification_tokens (user_id, token_type, token_hash, expires_at)
       VALUES ($1, 'email_verification', $2, CURRENT_TIMESTAMP - INTERVAL '1 hour')`,
      [userRow.id, expiredHash]
    );
    const expVerifRes = await api('/api/auth/verify-email', {
      method: 'POST',
      ip: '10.99.0.3',
      body: { token: expiredRaw },
    });
    assert.strictEqual(expVerifRes.status, 400);
    console.log('  ✅ Passed');

    console.log('Test 4: Valid verification token verifies email & cannot be reused...');
    const verifRes = await api('/api/auth/verify-email', {
      method: 'POST',
      ip: '10.99.0.4',
      body: { token: verifToken },
    });
    assert.strictEqual(verifRes.status, 200);
    const reuseVerifRes = await api('/api/auth/verify-email', {
      method: 'POST',
      ip: '10.99.0.4',
      body: { token: verifToken },
    });
    assert.strictEqual(reuseVerifRes.status, 400, 'Reused verification token must be rejected');
    console.log('  ✅ Passed');

    // Ensure roles exist for org1Id and assign active membership (role: doctor)
    await adminPool.query(
      `INSERT INTO roles (organization_id, name, slug, is_system_role)
       VALUES ($1, 'Doctor', 'doctor', true), ($1, 'NGO Admin', 'admin', true)
       ON CONFLICT (slug, organization_id) DO NOTHING`,
      [org1Id]
    );
    const doctorRoleRes = await adminPool.query(
      "SELECT id FROM roles WHERE slug = 'doctor' AND organization_id = $1 LIMIT 1",
      [org1Id]
    );
    const adminRoleRes = await adminPool.query(
      "SELECT id FROM roles WHERE slug = 'admin' AND organization_id = $1 LIMIT 1",
      [org1Id]
    );
    assert.ok(doctorRoleRes.rows.length > 0 && adminRoleRes.rows.length > 0);
    await adminPool.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT (user_id, organization_id) DO UPDATE SET status = 'active', role_id = $3`,
      [userRow.id, org1Id, doctorRoleRes.rows[0].id]
    );

    // =========================================================================
    // 2. Valid & Invalid Login, Rate Limiting & Brute-Force Protection
    // =========================================================================
    console.log('Test 5: Valid login returns persistent session & invalid login returns generic 401...');
    const badLogin = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.0.5',
      body: { email: userEmail, password: 'WrongPassword!1' },
    });
    assert.strictEqual(badLogin.status, 401);
    assert.strictEqual(badLogin.data.error, 'Invalid email or password');

    const goodLogin = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.0.5',
      body: { email: userEmail, password: userPass1 },
    });
    assert.strictEqual(goodLogin.status, 200);
    assert.ok(goodLogin.data.token && goodLogin.data.session.sessionId);
    const sessionToken1 = goodLogin.data.token;
    console.log('  ✅ Passed');

    console.log('Test 6: Brute-force protection locks account temporarily after 5 failed attempts...');
    for (let i = 0; i < 5; i++) {
      await api('/api/auth/login', {
        method: 'POST',
        ip: `10.99.1.${i + 1}`,
        body: { email: userEmail, password: 'WrongPassword!99' },
      });
    }
    const lockedRes = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.1.10',
      body: { email: userEmail, password: userPass1 },
    });
    assert.strictEqual(lockedRes.status, 429, 'Account must be temporarily rate-limited/locked');
    // Reset lockout for subsequent tests
    await adminPool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [userRow.id]);
    await adminPool.query('DELETE FROM auth_rate_limits WHERE bucket_key = $1', [`login:acct:${userEmail}`]);
    console.log('  ✅ Passed');

    // =========================================================================
    // 3. Unauthorized Workspace Switching & Stale JWT Claims
    // =========================================================================
    console.log('Test 7: Unauthorized workspace switch to Org B rejected with 403...');
    const switchBad = await api('/api/auth/switch-workspace', {
      method: 'POST',
      token: sessionToken1,
      body: { organizationId: org2Id },
    });
    assert.strictEqual(switchBad.status, 403);
    console.log('  ✅ Passed');

    console.log('Test 8: Role change in DB immediately updates permissions (no stale JWT claims)...');
    const meBefore = await api('/api/auth/me', { token: sessionToken1 });
    assert.strictEqual(meBefore.status, 200);
    assert.strictEqual(meBefore.data.session.roleSlug, 'doctor');

    await adminPool.query(
      'UPDATE organization_memberships SET role_id = $1 WHERE user_id = $2 AND organization_id = $3',
      [adminRoleRes.rows[0].id, userRow.id, org1Id]
    );
    const meAfter = await api('/api/auth/me', { token: sessionToken1 });
    assert.strictEqual(meAfter.status, 200);
    assert.strictEqual(meAfter.data.session.roleSlug, 'admin', 'Updated role must reflect immediately');
    console.log('  ✅ Passed');

    console.log('Test 9: Suspended membership revokes workspace access on existing session...');
    await adminPool.query(
      "UPDATE organization_memberships SET status = 'suspended' WHERE user_id = $1 AND organization_id = $2",
      [userRow.id, org1Id]
    );
    const meSuspendedMem = await api('/api/auth/me', { token: sessionToken1 });
    assert.strictEqual(meSuspendedMem.status, 401, 'Suspended membership must immediately reject org-scoped session');
    // Restore membership
    await adminPool.query(
      "UPDATE organization_memberships SET status = 'active' WHERE user_id = $1 AND organization_id = $2",
      [userRow.id, org1Id]
    );
    console.log('  ✅ Passed');

    // =========================================================================
    // 4. Session Revocation, Logout All Devices & Suspended Account
    // =========================================================================
    console.log('Test 10: Individual session revocation & Logout from all devices...');
    const login2 = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.2.1',
      body: { email: userEmail, password: userPass1 },
    });
    const login3 = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.2.2',
      body: { email: userEmail, password: userPass1 },
    });
    assert.strictEqual(login2.status, 200);
    assert.strictEqual(login3.status, 200);

    const listSess = await api('/api/auth/sessions', { token: login3.data.token });
    assert.strictEqual(listSess.status, 200);
    assert.ok(listSess.data.sessions.length >= 2);

    // Revoke session 2 individually
    const revOne = await api(`/api/auth/sessions/${login2.data.session.sessionId}`, {
      method: 'DELETE',
      token: login3.data.token,
    });
    assert.strictEqual(revOne.status, 200);
    const checkRevoked2 = await api('/api/auth/me', { token: login2.data.token });
    assert.strictEqual(checkRevoked2.status, 401, 'Revoked session must fail /api/auth/me');

    // Logout from all devices
    const revAll = await api('/api/auth/revoke-all-sessions', {
      method: 'POST',
      token: login3.data.token,
      body: { keepCurrent: false },
    });
    assert.strictEqual(revAll.status, 200);
    const checkRevoked3 = await api('/api/auth/me', { token: login3.data.token });
    assert.strictEqual(checkRevoked3.status, 401, 'All sessions must be revoked');
    console.log('  ✅ Passed');

    console.log('Test 11: Suspended account blocked at login AND existing session rejected...');
    const login4 = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.2.3',
      body: { email: userEmail, password: userPass1 },
    });
    assert.strictEqual(login4.status, 200);
    await adminPool.query("UPDATE users SET status = 'suspended' WHERE id = $1", [userRow.id]);
    const meSuspAcct = await api('/api/auth/me', { token: login4.data.token });
    assert.strictEqual(meSuspAcct.status, 401);
    const loginSuspAcct = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.2.4',
      body: { email: userEmail, password: userPass1 },
    });
    assert.strictEqual(loginSuspAcct.status, 403);
    await adminPool.query("UPDATE users SET status = 'active' WHERE id = $1", [userRow.id]);
    console.log('  ✅ Passed');

    // =========================================================================
    // 5. Forgot Password & Reset Password (Expired, Valid, Reused, Session Revocation)
    // =========================================================================
    console.log('Test 12: Forgot password generic response, expired/reused reset token rejection, and session revocation...');
    const forgotNonExist = await api('/api/auth/forgot-password', {
      method: 'POST',
      ip: '10.99.3.1',
      body: { email: 'nonexistent.account@eldercare-test.org' },
    });
    assert.strictEqual(forgotNonExist.status, 200);

    const forgotExist = await api('/api/auth/forgot-password', {
      method: 'POST',
      ip: '10.99.3.2',
      body: { email: userEmail },
    });
    assert.strictEqual(forgotExist.status, 200);
    assert.strictEqual(forgotExist.data.message, forgotNonExist.data.message, 'Responses must be identical');

    const resetEmails = readCapturedEmails().filter((e) => e.to === userEmail && e.subject.includes('Password Reset'));
    assert.strictEqual(resetEmails.length, 1);
    const resetToken = extractTokenFromEmail(resetEmails[0]);
    assert.ok(resetToken);

    // Expired reset token test
    const expResetRaw = crypto.randomBytes(32).toString('hex');
    const expResetHash = crypto.createHash('sha256').update(expResetRaw).digest('hex');
    await adminPool.query(
      `INSERT INTO user_verification_tokens (user_id, token_type, token_hash, expires_at)
       VALUES ($1, 'password_reset', $2, CURRENT_TIMESTAMP - INTERVAL '1 hour')`,
      [userRow.id, expResetHash]
    );
    const expResetRes = await api('/api/auth/reset-password', {
      method: 'POST',
      ip: '10.99.3.3',
      body: { token: expResetRaw, newPassword: userPass2 },
    });
    assert.strictEqual(expResetRes.status, 400);

    // Valid reset token
    const validResetRes = await api('/api/auth/reset-password', {
      method: 'POST',
      ip: '10.99.3.4',
      body: { token: resetToken, newPassword: userPass2 },
    });
    assert.strictEqual(validResetRes.status, 200);

    // Reused reset token rejected
    const reusedResetRes = await api('/api/auth/reset-password', {
      method: 'POST',
      ip: '10.99.3.5',
      body: { token: resetToken, newPassword: 'AnotherPass!789' },
    });
    assert.strictEqual(reusedResetRes.status, 400);

    // Prior session invalidated after password reset
    const oldSessionCheck = await api('/api/auth/me', { token: login4.data.token });
    assert.strictEqual(oldSessionCheck.status, 401);

    // New password works
    const newPassLogin = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.3.6',
      body: { email: userEmail, password: userPass2 },
    });
    assert.strictEqual(newPassLogin.status, 200);
    console.log('  ✅ Passed');

    // =========================================================================
    // 6. Platform Owner MFA & Privilege Separation
    // =========================================================================
    console.log('Test 13: Normal NGO user cannot enroll MFA or access Platform Owner routes...');
    const normalMfaAttempt = await api('/api/auth/mfa/enroll', {
      method: 'POST',
      token: newPassLogin.data.token,
    });
    assert.strictEqual(normalMfaAttempt.status, 403);
    const normalPlatformAttempt = await api('/api/platform/metrics', {
      token: newPassLogin.data.token,
    });
    assert.strictEqual(normalPlatformAttempt.status, 403);
    console.log('  ✅ Passed');

    console.log('Test 14: Platform Owner MFA enrollment, invalid code rejection, TOTP verification & recovery code single-use...');
    const bcrypt = require('bcryptjs');
    const adminHash = await bcrypt.hash(adminPass, 10);
    await adminPool.query(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at)
       VALUES ($1, $2, 'Synthetic Platform Admin', true, 'active', CURRENT_TIMESTAMP)`,
      [adminEmail, adminHash]
    );

    const adminLogin = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.4.1',
      body: { email: adminEmail, password: adminPass },
    });
    assert.strictEqual(adminLogin.status, 200);
    assert.strictEqual(adminLogin.data.mfaSetupRequired, true);
    const adminPreMfaToken = adminLogin.data.token;

    // Platform metrics must be blocked before MFA verification
    const metricsBeforeMfa = await api('/api/platform/metrics', { token: adminPreMfaToken });
    assert.strictEqual(metricsBeforeMfa.status, 403);

    // Enroll MFA
    const enrollRes = await api('/api/auth/mfa/enroll', {
      method: 'POST',
      token: adminPreMfaToken,
    });
    assert.strictEqual(enrollRes.status, 200);
    assert.ok(enrollRes.data.qrDataUrl.startsWith('data:image/png;base64,'));
    const totpSecret = enrollRes.data.manualSecret;

    // Invalid MFA code rejected
    const badMfa = await api('/api/auth/mfa/verify', {
      method: 'POST',
      token: adminPreMfaToken,
      body: { code: '000000' },
    });
    assert.strictEqual(badMfa.status, 401);

    // Valid TOTP code activates MFA and returns recovery codes
    const validTotp = generateTotp(totpSecret);
    const goodMfa = await api('/api/auth/mfa/verify', {
      method: 'POST',
      token: adminPreMfaToken,
      body: { code: validTotp },
    });
    assert.strictEqual(goodMfa.status, 200);
    assert.strictEqual(goodMfa.data.mfaVerified, true);
    assert.strictEqual(goodMfa.data.recoveryCodes.length, 8);
    const adminVerifiedToken = goodMfa.data.token;

    // Platform metrics now succeeds
    const metricsAfterMfa = await api('/api/platform/metrics', { token: adminVerifiedToken });
    assert.strictEqual(metricsAfterMfa.status, 200);

    // Recovery code single-use enforcement
    const adminLogin2 = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.4.2',
      body: { email: adminEmail, password: adminPass },
    });
    assert.strictEqual(adminLogin2.data.mfaRequired, true);
    const firstRecoveryCode = goodMfa.data.recoveryCodes[0];

    const recUse1 = await api('/api/auth/mfa/verify', {
      method: 'POST',
      token: adminLogin2.data.token,
      body: { recoveryCode: firstRecoveryCode },
    });
    assert.strictEqual(recUse1.status, 200);
    assert.strictEqual(recUse1.data.mfaVerified, true);

    const adminLogin3 = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.99.4.3',
      body: { email: adminEmail, password: adminPass },
    });
    const recUse2 = await api('/api/auth/mfa/verify', {
      method: 'POST',
      token: adminLogin3.data.token,
      body: { recoveryCode: firstRecoveryCode },
    });
    assert.strictEqual(recUse2.status, 401, 'Reused recovery code must be rejected');
    console.log('  ✅ Passed');

    // Cleanup synthetic test records
    await adminPool.query('DELETE FROM users WHERE email IN ($1, $2)', [userEmail, adminEmail]);
    await adminPool.query('DELETE FROM organizations WHERE id IN ($1, $2)', [org1Id, org2Id]);
    await adminPool.query("DELETE FROM auth_rate_limits WHERE bucket_key LIKE '%10.99.%' OR bucket_key LIKE $1", [`%${userEmail}%`]);

    console.log('\n🎉 ALL 14 END-TO-END STAGE 3B-3 SECURITY SUITES PASSED (100%)!');
  } finally {
    serverProc.kill();
    await adminPool.end();
    if (fs.existsSync(EMAIL_CAPTURE_FILE)) fs.unlinkSync(EMAIL_CAPTURE_FILE);
  }
}

runTests().catch((err) => {
  console.error('❌ Stage 3B-3 Security Test Failed:', err);
  process.exit(1);
});
