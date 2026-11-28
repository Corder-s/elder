/**
 * Stage 3B-6 Automated Subscription Lifecycle, Billing & Payment Integration Test Suite
 * Tests against isolated test database (`eldercareos_restore_test`).
 * NEVER touches production `eldercareos`.
 */

const assert = require('assert');
const crypto = require('crypto');
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

const TEST_PORT = 3203;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DB = process.env.TEST_DB_NAME || 'eldercareos_restore_test';
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || RZP_SECRET;

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
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Test server did not start in time');
}

async function api(pathUrl, { method = 'GET', token = null, body = null, headers = {}, ip = '10.88.0.1' } = {}) {
  const reqHeaders = {
    'x-forwarded-for': ip,
    ...headers,
  };
  if (token) reqHeaders['Cookie'] = `eldercare_session=${token}`;
  if (body && typeof body !== 'string') {
    reqHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${pathUrl}`, {
    method,
    headers: reqHeaders,
    body,
    redirect: 'manual',
  });
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) {
    data = await res.json();
  } else if (ct.includes('application/pdf')) {
    data = Buffer.from(await res.arrayBuffer());
  } else {
    data = await res.text();
  }
  return { status: res.status, data, headers: res.headers };
}

function signCheckout(orderId, paymentId) {
  return crypto.createHmac('sha256', RZP_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

function signWebhook(rawBody) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
}

async function runTests() {
  console.log(`\nStarting Stage 3B-6 Billing & Subscription Integration Suite on ${TEST_DB}...\n`);
  const adminPool = getAdminPool();
  const testDbUrl = getTestDbUrl();

  const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
  const serverProc = spawn(process.execPath, [nextBin, 'start', '-p', String(TEST_PORT), '-H', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      PORT: String(TEST_PORT),
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
      RAZORPAY_KEY_SECRET: RZP_SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer();
    console.log('Next.js test server running on port', TEST_PORT);

    // Clean test tables (CASCADE clears all org-scoped tables)
    await adminPool.query(`
      TRUNCATE TABLE
        payment_webhook_events, platform_audit_logs, users, organizations
      RESTART IDENTITY CASCADE;
    `);

    // Ensure baseline plans exist (Starter, Professional, Enterprise)
    await adminPool.query(`
      INSERT INTO subscription_plans (name, slug, description, price_monthly_inr, price_annual_inr, resident_limit, staff_limit, branch_limit, storage_limit_mb, features, is_active)
      VALUES
        ('Starter', 'starter', 'Starter NGO plan', 2999, 29990, 30, 5, 1, 5120, '{"custom_branding": false, "advanced_reports": false}', true),
        ('Professional', 'professional', 'Pro NGO plan', 7999, 79990, 150, 25, 5, 51200, '{"custom_branding": true, "advanced_reports": true}', true),
        ('Enterprise', 'enterprise', 'Enterprise NGO plan', 19999, 199990, 1000, 200, 50, 512000, '{"custom_branding": true, "advanced_reports": true, "api_access": true}', true)
      ON CONFLICT (slug) DO UPDATE SET is_active = true;
    `);

    const starterRes = await adminPool.query("SELECT id FROM subscription_plans WHERE slug = 'starter'");
    const proRes = await adminPool.query("SELECT id FROM subscription_plans WHERE slug = 'professional'");
    const starterPlanId = starterRes.rows[0].id;
    const proPlanId = proRes.rows[0].id;

    const pass = 'TestPass@3B6!';
    const hash = await bcrypt.hash(pass, 10);

    const adminARes = await adminPool.query(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at) VALUES ('admin-a@3b6.test', $1, 'Admin A', false, 'active', CURRENT_TIMESTAMP) RETURNING id`,
      [hash]
    );
    const docARes = await adminPool.query(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at) VALUES ('doc-a@3b6.test', $1, 'Doctor A', false, 'active', CURRENT_TIMESTAMP) RETURNING id`,
      [hash]
    );
    const adminBRes = await adminPool.query(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at) VALUES ('admin-b@3b6.test', $1, 'Admin B', false, 'active', CURRENT_TIMESTAMP) RETURNING id`,
      [hash]
    );
    const poRes = await adminPool.query(
      `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at) VALUES ('owner@3b6.test', $1, 'Platform Owner', true, 'active', CURRENT_TIMESTAMP) RETURNING id`,
      [hash]
    );

    const orgA = (await adminPool.query(
      `SELECT provision_new_ngo_workspace('Billing Org A', 'billing-org-a', 'billing-a@ngo.test', '9111111111', $1, 'starter', 'Main Branch A') AS id`,
      [adminARes.rows[0].id]
    )).rows[0].id;
    const orgB = (await adminPool.query(
      `SELECT provision_new_ngo_workspace('Billing Org B', 'billing-org-b', 'billing-b@ngo.test', '9222222222', $1, 'professional', 'Main Branch B') AS id`,
      [adminBRes.rows[0].id]
    )).rows[0].id;

    const brA = (await adminPool.query('SELECT id FROM branches WHERE organization_id = $1 LIMIT 1', [orgA])).rows[0].id;
    const docRoleA = (await adminPool.query("SELECT id FROM roles WHERE organization_id = $1 AND slug = 'doctor'", [orgA])).rows[0].id;

    await adminPool.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, status) VALUES ($1, $2, $3, $4, 'active')`,
      [docARes.rows[0].id, orgA, docRoleA, brA]
    );

    // Log in users
    const loginAdminA = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.88.1.1',
      body: { email: 'admin-a@3b6.test', password: pass, organizationId: orgA },
    });
    assert.strictEqual(loginAdminA.status, 200);
    const tokAdminA = loginAdminA.data.token;

    const loginDocA = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.88.1.2',
      body: { email: 'doc-a@3b6.test', password: pass, organizationId: orgA },
    });
    assert.strictEqual(loginDocA.status, 200);
    const tokDocA = loginDocA.data.token;

    const loginAdminB = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.88.1.3',
      body: { email: 'admin-b@3b6.test', password: pass, organizationId: orgB },
    });
    assert.strictEqual(loginAdminB.status, 200);
    const tokAdminB = loginAdminB.data.token;

    // Platform Owner login without MFA
    const loginPoNoMfa = await api('/api/auth/login', {
      method: 'POST',
      ip: '10.88.1.4',
      body: { email: 'owner@3b6.test', password: pass },
    });
    assert.strictEqual(loginPoNoMfa.status, 200);
    const tokPoNoMfa = loginPoNoMfa.data.token;

    // Mint MFA-verified Platform Owner session token using existing JWT helper via MFA setup/verify or jose
    const { SignJWT } = require('jose');
    const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);
    const tokPoMfa = await new SignJWT({
      userId: poRes.rows[0].id,
      email: 'owner@3b6.test',
      fullName: 'Platform Owner',
      isPlatformAdmin: true,
      mfaVerified: true,
      tokenType: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(jwtSecret);

    // 1. Unauthenticated 401 checks
    console.log('Test 1: Unauthenticated requests return 401...');
    for (const ep of [
      '/api/billing/subscription',
      '/api/billing/invoices',
      '/api/platform/plans',
      '/api/platform/subscriptions',
      '/api/platform/billing',
    ]) {
      assert.strictEqual((await api(ep)).status, 401, `${ep} must return 401`);
    }
    console.log('  ✅ Passed');

    // 2. NGO RBAC & Platform Owner MFA checks
    console.log('Test 2: NGO RBAC & Platform Owner MFA enforcement...');
    assert.strictEqual((await api('/api/billing/subscription', { token: tokDocA })).status, 403);
    assert.strictEqual((await api('/api/billing/checkout', { method: 'POST', token: tokDocA, body: { targetPlanSlugOrId: 'professional' } })).status, 403);
    assert.strictEqual((await api('/api/platform/plans', { token: tokAdminA })).status, 403);
    assert.strictEqual((await api('/api/platform/plans', { token: tokPoNoMfa })).status, 403);
    const poPlans = await api('/api/platform/plans', { token: tokPoMfa });
    assert.strictEqual(poPlans.status, 200);
    assert.ok(poPlans.data.plans.length >= 3);
    console.log('  ✅ Passed');

    // 3. Plan creation, update, and deactivation guard
    console.log('Test 3: Platform Owner plan creation & deactivation protection...');
    const createPlan = await api('/api/platform/plans', {
      method: 'POST',
      token: tokPoMfa,
      body: {
        name: `Micro NGO ${Date.now()}`,
        slug: `micro-test-${Date.now()}`,
        priceMonthlyInr: 999,
        priceAnnualInr: 9990,
        residentLimit: 1,
        staffLimit: 2,
        branchLimit: 1,
        storageLimitMb: 1,
      },
    });
    assert.strictEqual(createPlan.status, 201);
    const microPlanId = createPlan.data.plan.id;

    // Cannot deactivate Starter plan because Org A uses it
    const deactStarter = await api('/api/platform/plans', {
      method: 'PATCH',
      token: tokPoMfa,
      body: { planId: starterPlanId, isActive: false },
    });
    assert.strictEqual(deactStarter.status, 400);
    console.log('  ✅ Passed');

    // 4. Checkout order creation + invalid signature rejection + valid signature activation + idempotency
    console.log('Test 4: Razorpay test checkout, signature validation & idempotency...');
    const checkoutRes = await api('/api/billing/checkout', {
      method: 'POST',
      token: tokAdminA,
      body: { targetPlanSlugOrId: proPlanId, billingInterval: 'monthly' },
    });
    assert.strictEqual(checkoutRes.status, 201);
    const orderId = checkoutRes.data.razorpayOrder.orderId;
    const invoiceId = checkoutRes.data.invoice.id;

    // Invalid signature -> 401
    const badVerify = await api('/api/billing/verify', {
      method: 'POST',
      token: tokAdminA,
      body: {
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_test_001',
        razorpaySignature: 'forged_sig_123',
        targetPlanId: proPlanId,
      },
    });
    assert.strictEqual(badVerify.status, 401);

    // Valid signature -> 200 & activates subscription
    const goodSig = signCheckout(orderId, 'pay_test_001');
    const goodVerify = await api('/api/billing/verify', {
      method: 'POST',
      token: tokAdminA,
      body: {
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_test_001',
        razorpaySignature: goodSig,
        targetPlanId: proPlanId,
        billingInterval: 'monthly',
      },
    });
    assert.strictEqual(goodVerify.status, 200);
    assert.strictEqual(goodVerify.data.alreadySettled, false);

    // Retry same verification -> idempotent
    const retryVerify = await api('/api/billing/verify', {
      method: 'POST',
      token: tokAdminA,
      body: {
        razorpayOrderId: orderId,
        razorpayPaymentId: 'pay_test_001',
        razorpaySignature: goodSig,
      },
    });
    assert.strictEqual(retryVerify.status, 200);
    assert.strictEqual(retryVerify.data.alreadySettled, true);
    console.log('  ✅ Passed');

    // 5. Invoice immutability & PDF download & cross-tenant isolation
    console.log('Test 5: Invoice immutability, PDF export & cross-tenant isolation...');
    let triggerBlocked = false;
    try {
      await adminPool.query(`UPDATE subscription_invoices SET total = 1 WHERE id = $1`, [invoiceId]);
    } catch (e) {
      triggerBlocked = true;
    }
    assert.strictEqual(triggerBlocked, true, 'DB trigger must block modifying paid invoice');

    const pdfRes = await api(`/api/billing/invoices/${invoiceId}/pdf`, { token: tokAdminA });
    assert.strictEqual(pdfRes.status, 200);
    assert.ok(pdfRes.data.toString('utf8', 0, 8).startsWith('%PDF-1.4'));

    const crossPdf = await api(`/api/billing/invoices/${invoiceId}/pdf`, { token: tokAdminB });
    assert.strictEqual(crossPdf.status, 404);
    console.log('  ✅ Passed');

    // 6. Webhook security, deduplication & out-of-order protection
    console.log('Test 6: Razorpay webhook signature verification, deduplication & out-of-order safety...');
    const forgedWh = await api('/api/webhooks/razorpay', {
      method: 'POST',
      body: JSON.stringify({ event: 'payment.captured' }),
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'bad_sig', 'x-razorpay-event-id': 'evt_bad_1' },
    });
    assert.strictEqual(forgedWh.status, 401);

    // Create second checkout order to test webhook capture + duplicate + out-of-order failure
    const co2 = await api('/api/billing/checkout', {
      method: 'POST',
      token: tokAdminA,
      body: { targetPlanSlugOrId: proPlanId, billingInterval: 'monthly' },
    });
    const order2Id = co2.data.razorpayOrder.orderId;

    const whBody = JSON.stringify({
      id: 'evt_cap_2',
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_wh_002', order_id: order2Id } } },
    });
    const wh1 = await api('/api/webhooks/razorpay', {
      method: 'POST',
      body: whBody,
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signWebhook(whBody), 'x-razorpay-event-id': 'evt_cap_2' },
    });
    assert.strictEqual(wh1.status, 200);
    assert.strictEqual(wh1.data.processed, true);

    // Duplicate event
    const whDup = await api('/api/webhooks/razorpay', {
      method: 'POST',
      body: whBody,
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signWebhook(whBody), 'x-razorpay-event-id': 'evt_cap_2' },
    });
    assert.strictEqual(whDup.status, 200);
    assert.strictEqual(whDup.data.duplicate, true);

    // Out-of-order failure for already-paid order2Id must NOT mark invoice failed
    const whFailBody = JSON.stringify({
      id: 'evt_fail_late',
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_wh_002', order_id: order2Id } } },
    });
    const whFail = await api('/api/webhooks/razorpay', {
      method: 'POST',
      body: whFailBody,
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signWebhook(whFailBody), 'x-razorpay-event-id': 'evt_fail_late' },
    });
    assert.strictEqual(whFail.status, 200);
    const inv2Status = await adminPool.query('SELECT status FROM subscription_invoices WHERE id = $1', [co2.data.invoice.id]);
    assert.strictEqual(inv2Status.rows[0].status, 'paid');
    console.log('  ✅ Passed');

    // 7. Quota enforcement (residents, branches, staff, storage) & concurrency
    console.log('Test 7: Transactional quota enforcement & concurrency...');
    // Switch Org A to Micro NGO plan (resident_limit=1, staff_limit=2, branch_limit=1, storage_limit_mb=1)
    await adminPool.query('UPDATE tenant_subscriptions SET plan_id = $1 WHERE organization_id = $2', [microPlanId, orgA]);

    // Concurrent resident admissions: only 1 should succeed
    const concurrentRes = await Promise.all([
      api('/api/residents', { method: 'POST', token: tokAdminA, body: { fullName: 'Resident One', gender: 'male' } }),
      api('/api/residents', { method: 'POST', token: tokAdminA, body: { fullName: 'Resident Two', gender: 'female' } }),
      api('/api/residents', { method: 'POST', token: tokAdminA, body: { fullName: 'Resident Three', gender: 'male' } }),
    ]);
    const createdCount = concurrentRes.filter((r) => r.status === 201).length;
    const blockedCount = concurrentRes.filter((r) => r.status === 403).length;
    assert.strictEqual(createdCount, 1, 'Exactly 1 resident allowed under concurrent quota=1');
    assert.strictEqual(blockedCount, 2, 'Other 2 concurrent admissions must be blocked with 403');

    // Branch quota (1 already exists)
    const branchOver = await api('/api/settings', {
      method: 'PATCH',
      token: tokAdminA,
      body: { action: 'create_branch', name: 'Branch Two', code: 'BR-2' },
    });
    assert.strictEqual(branchOver.status, 403);

    // Staff quota (2 active already exist: adminA & docA)
    const staffOver = await api('/api/staff', {
      method: 'POST',
      token: tokAdminA,
      body: { email: 'extra@3b6.test', roleId: docRoleA },
    });
    assert.strictEqual(staffOver.status, 403);

    // Storage quota (1 MB = 1048576 bytes): upload 2MB document -> 403
    const docOver = await api('/api/documents', {
      method: 'POST',
      token: tokAdminA,
      body: { title: 'Too Big', fileName: 'big.pdf', mimeType: 'application/pdf', fileSizeBytes: 2 * 1024 * 1024 },
    });
    assert.strictEqual(docOver.status, 403);
    console.log('  ✅ Passed');

    // 8. Healthcare Safety Mode during Suspension + Credit Note + Reactivation
    console.log('Test 8: Healthcare Safety Mode during suspension, credit note & reactivation...');
    // First move Org A back to Pro plan so quota isn't the blocker
    await adminPool.query('UPDATE tenant_subscriptions SET plan_id = $1 WHERE organization_id = $2', [proPlanId, orgA]);

    const suspRes = await api('/api/platform/subscriptions', {
      method: 'PATCH',
      token: tokPoMfa,
      body: { organizationId: orgA, action: 'suspend', reason: 'Non-payment test' },
    });
    assert.strictEqual(suspRes.status, 200);
    assert.strictEqual(suspRes.data.status, 'suspended');

    // Blocked in safety mode: new admissions, staff, documents
    assert.strictEqual((await api('/api/residents', { method: 'POST', token: tokAdminA, body: { fullName: 'Blocked While Suspended', gender: 'male' } })).status, 403);
    assert.strictEqual((await api('/api/staff', { method: 'POST', token: tokAdminA, body: { email: 'b@3b6.test', roleId: docRoleA } })).status, 403);
    assert.strictEqual((await api('/api/documents', { method: 'POST', token: tokAdminA, body: { title: 'Blocked Doc', fileName: 'd.pdf', mimeType: 'application/pdf', fileSizeBytes: 1000 } })).status, 403);

    // Preserved in safety mode: clinical reads & daily care logs
    assert.strictEqual((await api('/api/residents', { token: tokDocA })).status, 200);
    assert.strictEqual((await api('/api/medicines', { token: tokDocA })).status, 200);
    assert.strictEqual((await api('/api/diary', { method: 'POST', token: tokAdminA, body: { shift: 'morning', content: 'BP normal during safety mode' } })).status, 201);

    // Issue credit note
    const cnRes = await api('/api/platform/subscriptions', {
      method: 'PATCH',
      token: tokPoMfa,
      body: { organizationId: orgA, action: 'issue_credit_note', creditAmountInr: 500, reason: 'Goodwill credit' },
    });
    assert.strictEqual(cnRes.status, 200);
    assert.ok(cnRes.data.creditNote.invoice_number.startsWith('CN-'));

    // Reactivate
    const reactRes = await api('/api/platform/subscriptions', {
      method: 'PATCH',
      token: tokPoMfa,
      body: { organizationId: orgA, action: 'reactivate' },
    });
    assert.strictEqual(reactRes.status, 200);
    assert.strictEqual(reactRes.data.status, 'active');

    // Platform billing settings & medical privacy check
    const platBilling = await api('/api/platform/billing', { token: tokPoMfa });
    assert.strictEqual(platBilling.status, 200);
    assert.strictEqual(platBilling.data.medicalRecords, undefined);
    console.log('  ✅ Passed');

    console.log('\n🎉 ALL STAGE 3B-6 BILLING & SUBSCRIPTION TESTS PASSED!\n');
  } finally {
    serverProc.kill();
    await adminPool.end();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Stage 3B-6 test suite failed:', err);
  process.exit(1);
});
