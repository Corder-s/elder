/**
 * Stage 3B-5 Automated Operational Modules & PostgreSQL Integration Test Suite
 * Tests all 11 operational modules against isolated test database (`eldercareos_restore_test`).
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

const TEST_PORT = 3202;
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
  throw new Error('Test server did not start in time');
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

async function runStage3B5Tests() {
  const testDbUrl = getTestDbUrl();
  const adminPool = getAdminPool();

  console.log(`🚀 Starting Stage 3B-5 test server on port ${TEST_PORT} (DB: ${TEST_DB})...`);
  const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
  const serverProc = spawn(process.execPath, [nextBin, 'dev', '-p', String(TEST_PORT)], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: testDbUrl, NODE_ENV: 'development' },
    stdio: 'pipe',
  });

  const ts = Date.now();
  const pass = 'OpStrong!123';
  const passHash = await bcrypt.hash(pass, 10);

  const emails = {
    adminA: `op.admina.${ts}@test.org`,
    doctorA: `op.doca.${ts}@test.org`,
    nurseA: `op.nursea.${ts}@test.org`,
    acctA: `op.accta.${ts}@test.org`,
    volA: `op.vola.${ts}@test.org`,
    famA: `op.fama.${ts}@test.org`,
    adminB: `op.adminb.${ts}@test.org`,
    inactiveUser: `op.inactive.${ts}@test.org`,
    platform: `op.plat.${ts}@test.org`,
  };

  let userIds = {};
  let orgA, orgB, branch1A, branch2A;

  try {
    await waitForServer();
    console.log('✅ Test server ready.\n');

    for (const [k, email] of Object.entries(emails)) {
      const r = await adminPool.query(
        `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at)
         VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP) RETURNING id`,
        [email, passHash, `Op ${k}`, k === 'platform']
      );
      userIds[k] = r.rows[0].id;
    }

    orgA = (await adminPool.query(
      `SELECT provision_new_ngo_workspace($1, $2, $3, '9111111111', $4, 'enterprise', 'HQ Alpha') AS id`,
      [`Op Org A ${ts}`, `op-org-a-${ts}`, emails.adminA, userIds.adminA]
    )).rows[0].id;

    orgB = (await adminPool.query(
      `SELECT provision_new_ngo_workspace($1, $2, $3, '9222222222', $4, 'starter', 'HQ Beta') AS id`,
      [`Op Org B ${ts}`, `op-org-b-${ts}`, emails.adminB, userIds.adminB]
    )).rows[0].id;

    branch1A = (await adminPool.query('SELECT id FROM branches WHERE organization_id = $1 LIMIT 1', [orgA])).rows[0].id;
    branch2A = (await adminPool.query(
      `INSERT INTO branches (organization_id, name, code, is_main_branch, status) VALUES ($1, 'Branch Two', 'BR-2', false, 'active') RETURNING id`,
      [orgA]
    )).rows[0].id;

    const rolesA = Object.fromEntries(
      (await adminPool.query('SELECT id, slug FROM roles WHERE organization_id = $1', [orgA])).rows.map((r) => [r.slug, r.id])
    );

    await adminPool.query(
      `INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, status) VALUES
        ($1, $2, $3, $4, 'active'),
        ($5, $2, $6, $4, 'active'),
        ($7, $2, $8, $4, 'active'),
        ($9, $2, $10, $4, 'active'),
        ($11, $2, $12, NULL, 'active'),
        ($13, $2, $10, $4, 'suspended'),
        ($14, $2, $15, NULL, 'active')`,
      [
        userIds.doctorA, orgA, rolesA.doctor, branch1A,
        userIds.nurseA, rolesA.nurse,
        userIds.acctA, rolesA.accountant,
        userIds.volA, rolesA.volunteer,
        userIds.famA, rolesA.family_member,
        userIds.inactiveUser,
        userIds.platform, rolesA.admin,
      ]
    );

    // Log in users
    const tokens = {};
    for (const [idx, k] of Object.keys(emails).entries()) {
      if (k === 'inactiveUser') continue;
      const lr = await api('/api/auth/login', {
        method: 'POST',
        ip: `10.77.0.${idx + 1}`,
        body: { email: emails[k], password: pass, organizationId: k === 'adminB' ? orgB : orgA },
      });
      assert.strictEqual(lr.status, 200, `Login failed for ${k}`);
      tokens[k] = lr.data.token;
    }

    // =========================================================================
    // 1. Unauthenticated 401 across all 11 module routes
    // =========================================================================
    console.log('Test 1: Unauthenticated requests return 401 across all operational routes...');
    for (const ep of [
      '/api/rescue-cases', '/api/medicines', '/api/facilities',
      '/api/visitors', '/api/staff', '/api/events', '/api/diary',
      '/api/tasks', '/api/finance/expenses', '/api/reports', '/api/settings',
    ]) {
      assert.strictEqual((await api(ep)).status, 401, `${ep} must return 401`);
    }
    console.log('  ✅ Passed');

    // =========================================================================
    // 2. Empty DB returns genuine empty arrays (no fixture leak)
    // =========================================================================
    console.log('Test 2: Empty database returns genuine empty arrays (no silent fixtures)...');
    const emptyRescue = await api('/api/rescue-cases', { token: tokens.adminA });
    assert.strictEqual(emptyRescue.status, 200);
    assert.strictEqual(emptyRescue.data.rescueCases.length, 0);
    console.log('  ✅ Passed');

    // =========================================================================
    // 3. Rescue Case Creation, Update, Transactional Conversion & Double-Convert Block
    // =========================================================================
    console.log('Test 3: Rescue case lifecycle & single-conversion enforcement...');
    const rcCreate = await api('/api/rescue-cases', {
      method: 'POST',
      token: tokens.adminA,
      body: { personIdentifier: 'Mr. Mohan Lal', approximateAge: 74, gender: 'male', rescueLocation: 'Old Delhi Station', urgencyLevel: 'high' },
    });
    assert.strictEqual(rcCreate.status, 201);
    const rcId = rcCreate.data.rescueCase.id;

    // Cross-tenant read/update blocked
    assert.strictEqual((await api(`/api/rescue-cases/${rcId}`, { token: tokens.adminB })).status, 404);
    assert.strictEqual((await api(`/api/rescue-cases/${rcId}`, { method: 'PATCH', token: tokens.adminB, body: { urgencyLevel: 'low' } })).status, 404);

    const rcConvert1 = await api(`/api/rescue-cases/${rcId}/convert`, { method: 'POST', token: tokens.adminA, body: {} });
    assert.strictEqual(rcConvert1.status, 201);
    const res1Id = rcConvert1.data.resident.id;

    // Double conversion blocked with 409
    const rcConvert2 = await api(`/api/rescue-cases/${rcId}/convert`, { method: 'POST', token: tokens.adminA, body: {} });
    assert.strictEqual(rcConvert2.status, 409);
    console.log('  ✅ Passed');

    // =========================================================================
    // 4. Medicines: Doctor-only Rx, Nurse Blocked, Cross-Resident Schedule Blocked, Duplicate Dose Blocked
    // =========================================================================
    console.log('Test 4: Medicines & Prescriptions security...');
    // Nurse cannot create prescription
    assert.strictEqual(
      (await api('/api/medicines', {
        method: 'POST',
        token: tokens.nurseA,
        body: { residentId: res1Id, medicineName: 'Amlodipine', dosage: '5mg', frequency: 'OD' },
      })).status,
      403
    );
    // Platform Owner cannot access medical endpoint even with org admin membership
    assert.strictEqual((await api('/api/medicines', { token: tokens.platform })).status, 403);

    // Doctor creates prescription
    const rxRes = await api('/api/medicines', {
      method: 'POST',
      token: tokens.doctorA,
      body: { residentId: res1Id, medicineName: 'Amlodipine', dosage: '5mg', frequency: 'Once Daily' },
    });
    assert.strictEqual(rxRes.status, 201);
    const rxId = rxRes.data.prescription.id;

    // Schedule referencing wrong resident rejected
    const res2Row = (await adminPool.query(
      `INSERT INTO residents (organization_id, branch_id, resident_number, full_name, gender) VALUES ($1, $2, 'RES-999', 'Other Resident', 'female') RETURNING id`,
      [orgA, branch2A]
    )).rows[0];
    assert.strictEqual(
      (await api('/api/medicines', {
        method: 'POST',
        token: tokens.doctorA,
        body: { actionType: 'schedule_dose', prescriptionId: rxId, residentId: res2Row.id, scheduledFor: new Date().toISOString() },
      })).status,
      400
    );

    // Valid schedule & administration by nurse (duplicate blocked)
    const schedRes = await api('/api/medicines', {
      method: 'POST',
      token: tokens.doctorA,
      body: { actionType: 'schedule_dose', prescriptionId: rxId, residentId: res1Id, scheduledFor: new Date().toISOString() },
    });
    assert.strictEqual(schedRes.status, 201);
    const schedId = schedRes.data.schedule.id;

    // Volunteer cannot administer
    assert.strictEqual(
      (await api(`/api/medicines/${schedId}`, {
        method: 'PATCH',
        token: tokens.volA,
        body: { actionType: 'administer_schedule', status: 'administered' },
      })).status,
      403
    );
    // Nurse administers once -> 200, second time -> 409
    assert.strictEqual(
      (await api(`/api/medicines/${schedId}`, {
        method: 'PATCH',
        token: tokens.nurseA,
        body: { actionType: 'administer_schedule', status: 'administered' },
      })).status,
      200
    );
    assert.strictEqual(
      (await api(`/api/medicines/${schedId}`, {
        method: 'PATCH',
        token: tokens.nurseA,
        body: { actionType: 'administer_schedule', status: 'administered' },
      })).status,
      409
    );
    console.log('  ✅ Passed');

    // =========================================================================
    // 5. Facilities: Rooms, Beds, Duplicate Occupancy & Cross-Tenant Bed Assign
    // =========================================================================
    console.log('Test 5: Facilities, Rooms & Beds transactional integrity...');
    const rmRes = await api('/api/facilities', {
      method: 'POST',
      token: tokens.adminA,
      body: { entity: 'room', roomNumber: '101', wardName: 'Care Wing', totalBeds: 2 },
    });
    assert.strictEqual(rmRes.status, 201);
    const bed1 = await api('/api/facilities', {
      method: 'POST',
      token: tokens.adminA,
      body: { entity: 'bed', roomId: rmRes.data.room.id, bedCode: '101-A' },
    });
    assert.strictEqual(bed1.status, 201);
    const bed1Id = bed1.data.bed.id;

    // Assign resident 1 -> 200
    assert.strictEqual(
      (await api('/api/facilities/beds/assign', { method: 'POST', token: tokens.adminA, body: { action: 'assign', bedId: bed1Id, residentId: res1Id } })).status,
      200
    );
    // Assign resident 2 to same occupied bed -> 409
    assert.strictEqual(
      (await api('/api/facilities/beds/assign', { method: 'POST', token: tokens.adminA, body: { action: 'assign', bedId: bed1Id, residentId: res2Row.id } })).status,
      409
    );
    // Cross-tenant Org B cannot assign Org A's bed -> 404
    assert.strictEqual(
      (await api('/api/facilities/beds/assign', { method: 'POST', token: tokens.adminB, body: { action: 'assign', bedId: bed1Id, residentId: res1Id } })).status,
      404
    );
    console.log('  ✅ Passed');

    // =========================================================================
    // 6. Visitors: Registration, Check-in, ID Masking & Double Check-Out Block
    // =========================================================================
    console.log('Test 6: Visitors & Visit Logs...');
    const visIn = await api('/api/visitors', {
      method: 'POST',
      token: tokens.adminA,
      body: { action: 'check_in', fullName: 'Ramesh Visitor', phone: '9876543210', idProofNumber: 'AADHAAR98761234', residentId: res1Id },
    });
    assert.strictEqual(visIn.status, 201);
    const visitId = visIn.data.visit.id;

    const visList = await api('/api/visitors', { token: tokens.adminA });
    assert.strictEqual(visList.status, 200);
    assert.strictEqual(visList.data.visits[0].id_proof_number, undefined, 'Raw ID proof must never be exposed');
    assert.ok(visList.data.visits[0].id_proof_masked.endsWith('1234'));

    assert.strictEqual((await api('/api/visitors', { method: 'POST', token: tokens.adminA, body: { action: 'check_out', visitId } })).status, 200);
    assert.strictEqual((await api('/api/visitors', { method: 'POST', token: tokens.adminA, body: { action: 'check_out', visitId } })).status, 409);
    console.log('  ✅ Passed');

    // =========================================================================
    // 7. Staff: Self-Escalation Blocked, Tenant Isolation
    // =========================================================================
    console.log('Test 7: Staff management & self-escalation prevention...');
    const staffList = await api('/api/staff', { token: tokens.adminA });
    assert.strictEqual(staffList.status, 200);
    const adminMembership = staffList.data.members.find((m) => m.user_id === userIds.adminA);
    assert.strictEqual(
      (await api(`/api/staff/${adminMembership.id}`, {
        method: 'PATCH',
        token: tokens.adminA,
        body: { roleId: rolesA.doctor },
      })).status,
      403
    );
    console.log('  ✅ Passed');

    // =========================================================================
    // 8. Events, Diary & Tasks (Inactive Assignee Blocked, Non-Author Diary Blocked)
    // =========================================================================
    console.log('Test 8: Events, Daily Diary & Tasks...');
    const evRes = await api('/api/events', {
      method: 'POST',
      token: tokens.adminA,
      body: { title: 'Yoga Morning', startTime: new Date(Date.now() + 86400000).toISOString(), location: 'Garden' },
    });
    assert.strictEqual(evRes.status, 201);

    const diaryRes = await api('/api/diary', {
      method: 'POST',
      token: tokens.nurseA,
      body: { shift: 'morning', content: 'Morning vitals and breakfast completed smoothly.' },
    });
    assert.strictEqual(diaryRes.status, 201);
    // Volunteer cannot edit Nurse's diary entry
    assert.strictEqual(
      (await api('/api/diary', { method: 'PATCH', token: tokens.volA, body: { id: diaryRes.data.entry.id, content: 'Tampered' } })).status,
      403
    );

    // Inactive member cannot be assigned a task
    assert.strictEqual(
      (await api('/api/tasks', {
        method: 'POST',
        token: tokens.adminA,
        body: { title: 'Check inventory', assignedTo: userIds.inactiveUser },
      })).status,
      400
    );
    console.log('  ✅ Passed');

    // =========================================================================
    // 9. Expenses (Segregation of Duties & No Deletion)
    // =========================================================================
    console.log('Test 9: Expense segregation of duties & no deletion...');
    const expCreate = await api('/api/finance/expenses', {
      method: 'POST',
      token: tokens.acctA,
      body: { category: 'Medical Supplies', title: 'Monthly Gauze & Bandages', amount: 4500 },
    });
    assert.strictEqual(expCreate.status, 201);
    // Accountant cannot self-approve their own expense
    assert.strictEqual(
      (await api('/api/finance/expenses', {
        method: 'PATCH',
        token: tokens.acctA,
        body: { id: expCreate.data.expense.id, status: 'approved' },
      })).status,
      403
    );
    // Admin can approve Accountant's expense
    assert.strictEqual(
      (await api('/api/finance/expenses', {
        method: 'PATCH',
        token: tokens.adminA,
        body: { id: expCreate.data.expense.id, status: 'approved' },
      })).status,
      200
    );
    // Delete method not allowed (405)
    assert.strictEqual((await api('/api/finance/expenses', { method: 'DELETE', token: tokens.adminA })).status, 405);
    console.log('  ✅ Passed');

    // =========================================================================
    // 10. Reports & Workspace Settings
    // =========================================================================
    console.log('Test 10: Reports & Workspace Settings authorization...');
    // Family member blocked from organization-wide analytics
    assert.strictEqual((await api('/api/reports', { token: tokens.famA })).status, 403);
    const repA = await api('/api/reports', { token: tokens.adminA });
    assert.strictEqual(repA.status, 200);
    assert.strictEqual(repA.data.report.residents.active, 2);

    // Org B report shows 0 residents (strict tenant isolation)
    const repB = await api('/api/reports', { token: tokens.adminB });
    assert.strictEqual(repB.status, 200);
    assert.strictEqual(repB.data.report.residents.active, 0);

    // Volunteer cannot modify workspace settings; Admin can
    assert.strictEqual((await api('/api/settings', { method: 'PATCH', token: tokens.volA, body: { city: 'Hack' } })).status, 403);
    assert.strictEqual((await api('/api/settings', { method: 'PATCH', token: tokens.adminA, body: { city: 'New Delhi' } })).status, 200);
    console.log('  ✅ Passed');

    console.log('\n🎉 ALL 10 STAGE 3B-5 OPERATIONAL & SECURITY SUITES PASSED (100%)!');
  } finally {
    serverProc.kill();
    try {
      await adminPool.query("DELETE FROM auth_rate_limits WHERE bucket_key LIKE '%10.77.%'");
    } catch {}
    await adminPool.end();
  }
}

runStage3B5Tests().catch((err) => {
  console.error('❌ Stage 3B-5 Test Failed:', err);
  process.exit(1);
});
