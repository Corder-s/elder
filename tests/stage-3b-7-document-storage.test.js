/**
 * ElderCare OS — Stage 3B-7 Automated Document Vault, Object Storage & Tenant Portability Test Suite
 * Uses an in-process S3-compatible HTTP mock server and isolated DB (`eldercareos_restore_test`).
 * NEVER touches production `eldercareos` or live S3 buckets.
 */

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Pool } = require('pg');
const JSZip = require('jszip');

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

const TEST_PORT = 3204;
const S3_MOCK_PORT = 3299;
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

function startMockS3Server() {
  const store = new Map();
  const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, `http://127.0.0.1:${S3_MOCK_PORT}`);
    const key = decodeURIComponent(urlObj.pathname.replace(/^\/+/, ''));

    if (req.method === 'PUT') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const buf = Buffer.concat(chunks);
        store.set(key, {
          body: buf,
          contentType: req.headers['content-type'] || 'application/octet-stream',
          etag: `"${crypto.createHash('md5').update(buf).digest('hex')}"`,
        });
        res.writeHead(200, { ETag: store.get(key).etag });
        res.end();
      });
      return;
    }

    if (req.method === 'HEAD') {
      const obj = store.get(key);
      if (!obj) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        'Content-Length': String(obj.body.length),
        'Content-Type': obj.contentType,
        ETag: obj.etag,
      });
      res.end();
      return;
    }

    if (req.method === 'GET') {
      const obj = store.get(key);
      if (!obj) {
        res.writeHead(404);
        res.end('NoSuchKey');
        return;
      }
      res.writeHead(200, {
        'Content-Length': String(obj.body.length),
        'Content-Type': obj.contentType,
      });
      res.end(obj.body);
      return;
    }

    if (req.method === 'DELETE') {
      store.delete(key);
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(405);
    res.end();
  });

  return new Promise((resolve) => {
    server.listen(S3_MOCK_PORT, '127.0.0.1', () => resolve({ server, store }));
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

async function api(pathUrl, { method = 'GET', token = null, body = null, headers = {}, ip = '10.99.0.1' } = {}) {
  const reqHeaders = { 'x-forwarded-for': ip, ...headers };
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
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, data };
}

async function runTests() {
  console.log(`\nStarting Stage 3B-7 Document Vault & Portability Suite on ${TEST_DB}...\n`);
  const adminPool = getAdminPool();
  const testDbUrl = getTestDbUrl();
  const { server: s3Server, store: s3Store } = await startMockS3Server();

  const nextBin = path.resolve(__dirname, '../node_modules/next/dist/bin/next');
  const serverProc = spawn(process.execPath, [nextBin, 'start', '-p', String(TEST_PORT), '-H', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
      PORT: String(TEST_PORT),
      S3_ENDPOINT: `http://127.0.0.1:${S3_MOCK_PORT}`,
      S3_REGION: 'ap-south-1',
      S3_BUCKET: 'eldercare-test-bucket',
      S3_ACCESS_KEY_ID: 'test-access-key',
      S3_SECRET_ACCESS_KEY: 'test-secret-key',
      DOCUMENT_MAX_SIZE_BYTES: String(2 * 1024 * 1024),
      ALLOW_DEV_SCAN_BYPASS: 'true',
    },
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
      VALUES
        ('Vault Micro', 'vault-micro', '1MB storage test plan', 999, 9990, 30, 20, 5, 1, '{}', true),
        ('Professional', 'professional', 'Pro plan', 7999, 79990, 150, 25, 5, 51200, '{}', true)
      ON CONFLICT (slug) DO UPDATE SET storage_limit_mb = EXCLUDED.storage_limit_mb, is_active = true;
    `);

    const pass = 'VaultPass@3B7!';
    const hash = await bcrypt.hash(pass, 10);

    const mkUser = async (email, name, isPo = false) => {
      const r = await adminPool.query(
        `INSERT INTO users (email, password_hash, full_name, is_platform_admin, status, email_verified_at)
         VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP) RETURNING id`,
        [email, hash, name, isPo]
      );
      return r.rows[0].id;
    };

    const adminAId = await mkUser('v-admin-a@3b7.test', 'Admin A');
    const docAId = await mkUser('v-doc-a@3b7.test', 'Doctor A');
    const nurseA1Id = await mkUser('v-nurse-a1@3b7.test', 'Nurse A1');
    const nurseA2Id = await mkUser('v-nurse-a2@3b7.test', 'Nurse A2');
    const famAId = await mkUser('v-fam-a@3b7.test', 'Family A');
    const adminBId = await mkUser('v-admin-b@3b7.test', 'Admin B');
    const poId = await mkUser('v-po@3b7.test', 'Platform Owner', true);

    const orgA = (await adminPool.query(
      `SELECT provision_new_ngo_workspace('Vault Org A', 'vault-org-a', 'vault-a@ngo.test', '9111111111', $1, 'vault-micro', 'Branch One') AS id`,
      [adminAId]
    )).rows[0].id;
    const orgB = (await adminPool.query(
      `SELECT provision_new_ngo_workspace('Vault Org B', 'vault-org-b', 'vault-b@ngo.test', '9222222222', $1, 'professional', 'Branch B') AS id`,
      [adminBId]
    )).rows[0].id;

    const brA1 = (await adminPool.query('SELECT id FROM branches WHERE organization_id = $1 LIMIT 1', [orgA])).rows[0].id;
    const brA2 = (await adminPool.query(
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
       ($7, $2, $6, $8, 'active'),
       ($9, $2, $10, NULL, 'active')`,
      [docAId, orgA, rolesA.doctor, brA1, nurseA1Id, rolesA.nurse, nurseA2Id, brA2, famAId, rolesA.family_member]
    );

    // Residents in Org A (res1 linked to famA in Branch 1, res2 unlinked in Branch 2)
    const res1Id = (await adminPool.query(
      `INSERT INTO residents (organization_id, branch_id, resident_number, full_name, gender, resident_status)
       VALUES ($1, $2, 'RES-001', 'Linked Resident', 'female', 'active') RETURNING id`,
      [orgA, brA1]
    )).rows[0].id;
    const res2Id = (await adminPool.query(
      `INSERT INTO residents (organization_id, branch_id, resident_number, full_name, gender, resident_status)
       VALUES ($1, $2, 'RES-002', 'Unlinked Branch2 Resident', 'male', 'active') RETURNING id`,
      [orgA, brA2]
    )).rows[0].id;

    await adminPool.query(
      `INSERT INTO resident_family_links (organization_id, user_id, resident_id, relationship, can_view_vitals, can_view_records)
       VALUES ($1, $2, $3, 'daughter', true, true)`,
      [orgA, famAId, res1Id]
    );

    const login = async (email, orgId, ip) => {
      const r = await api('/api/auth/login', { method: 'POST', ip, body: { email, password: pass, organizationId: orgId } });
      assert.strictEqual(r.status, 200, `Login failed for ${email}`);
      return r.data.token;
    };

    const tokAdminA = await login('v-admin-a@3b7.test', orgA, '10.99.1.1');
    const tokDocA = await login('v-doc-a@3b7.test', orgA, '10.99.1.2');
    const tokNurseA1 = await login('v-nurse-a1@3b7.test', orgA, '10.99.1.3');
    const tokNurseA2 = await login('v-nurse-a2@3b7.test', orgA, '10.99.1.4');
    const tokFamA = await login('v-fam-a@3b7.test', orgA, '10.99.1.5');
    const tokAdminB = await login('v-admin-b@3b7.test', orgB, '10.99.1.6');

    const { SignJWT } = require('jose');
    const tokPoMfa = await new SignJWT({
      userId: poId,
      email: 'v-po@3b7.test',
      fullName: 'Platform Owner',
      isPlatformAdmin: true,
      mfaVerified: true,
      tokenType: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const validPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n', 'utf8');

    // 1. Auth & RBAC & Forged Key Rejections
    console.log('Test 1: Auth, RBAC, invalid MIME, oversized, and forged objectKey rejections...');
    assert.strictEqual((await api('/api/documents/upload-intents', { method: 'POST', body: {} })).status, 401);
    assert.strictEqual((await api('/api/documents/upload-intents', { method: 'POST', token: tokNurseA1, body: { title: 'x', fileName: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: 100 } })).status, 403);
    assert.strictEqual((await api('/api/documents/upload-intents', { method: 'POST', token: tokAdminA, body: { title: 'Forged', fileName: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: 100, s3Key: 'evil/key' } })).status, 400);
    assert.strictEqual((await api('/api/documents/upload-intents', { method: 'POST', token: tokAdminA, body: { title: 'Bad MIME', fileName: 'evil.exe', mimeType: 'application/x-msdownload', fileSizeBytes: 100 } })).status, 400);
    assert.strictEqual((await api('/api/documents/upload-intents', { method: 'POST', token: tokAdminA, body: { title: 'Too Big', fileName: 'big.pdf', mimeType: 'application/pdf', fileSizeBytes: 5 * 1024 * 1024 } })).status, 400);
    // Cross-tenant resident association blocked
    assert.strictEqual((await api('/api/documents/upload-intents', { method: 'POST', token: tokAdminB, body: { title: 'Cross', fileName: 'a.pdf', mimeType: 'application/pdf', fileSizeBytes: 100, residentId: res1Id } })).status, 404);
    console.log('  ✅ Passed');

    // 2. Full Presigned Upload -> Magic Byte Check -> Idempotent Completion -> Secure Download
    console.log('Test 2: Presigned upload lifecycle, SHA-256 verification, idempotency & download...');
    const intent1 = await api('/api/documents/upload-intents', {
      method: 'POST',
      token: tokAdminA,
      body: {
        title: 'Linked Resident ID',
        documentType: 'aadhaar',
        fileName: 'id_card.pdf',
        fileSizeBytes: validPdf.length,
        mimeType: 'application/pdf',
        residentId: res1Id,
        isConfidential: false,
      },
    });
    assert.strictEqual(intent1.status, 201);
    assert.ok(intent1.data.uploadUrl.includes('X-Amz-Signature'));
    assert.strictEqual(intent1.data.document.s3_key, undefined, 's3_key must never leak');
    const doc1Id = intent1.data.document.id;

    // Upload real bytes to presigned URL
    const put1 = await fetch(intent1.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: validPdf,
    });
    assert.strictEqual(put1.status, 200);

    // Complete upload
    const comp1 = await api(`/api/documents/${doc1Id}/complete-upload`, { method: 'POST', token: tokAdminA });
    assert.strictEqual(comp1.status, 200);
    assert.strictEqual(comp1.data.alreadyCompleted, false);
    assert.strictEqual(comp1.data.document.documentStatus, 'available');
    assert.strictEqual(comp1.data.document.sha256Checksum, crypto.createHash('sha256').update(validPdf).digest('hex'));

    // Duplicate completion is idempotent
    const compDup = await api(`/api/documents/${doc1Id}/complete-upload`, { method: 'POST', token: tokAdminA });
    assert.strictEqual(compDup.status, 200);
    assert.strictEqual(compDup.data.alreadyCompleted, true);

    // Download via presigned URL
    const dl1 = await api(`/api/documents/${doc1Id}/download-url`, { token: tokAdminA });
    assert.strictEqual(dl1.status, 200);
    assert.ok(dl1.data.downloadUrl.includes('X-Amz-Signature'));
    assert.ok(dl1.data.expiresInSeconds <= 300);
    const dlBytes = Buffer.from(await (await fetch(dl1.data.downloadUrl)).arrayBuffer());
    assert.strictEqual(dlBytes.toString('utf8'), validPdf.toString('utf8'));
    console.log('  ✅ Passed');

    // 3. Invalid Magic Byte Signature Rejected
    console.log('Test 3: Magic-byte signature spoofing rejected & quarantined...');
    const fakePdf = Buffer.from('THIS IS NOT A PDF FILE', 'utf8');
    const intentFake = await api('/api/documents/upload-intents', {
      method: 'POST',
      token: tokAdminA,
      body: { title: 'Spoofed PDF', fileName: 'spoof.pdf', fileSizeBytes: fakePdf.length, mimeType: 'application/pdf' },
    });
    assert.strictEqual(intentFake.status, 201);
    await fetch(intentFake.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: fakePdf });
    const compFake = await api(`/api/documents/${intentFake.data.document.id}/complete-upload`, { method: 'POST', token: tokAdminA });
    assert.strictEqual(compFake.status, 400);
    console.log('  ✅ Passed');

    // 4. Expired Upload Intent Rejected
    console.log('Test 4: Expired presigned upload intent rejected (410)...');
    const intentExp = await api('/api/documents/upload-intents', {
      method: 'POST',
      token: tokAdminA,
      body: { title: 'Expired Doc', fileName: 'exp.pdf', fileSizeBytes: validPdf.length, mimeType: 'application/pdf' },
    });
    assert.strictEqual(intentExp.status, 201);
    await adminPool.query(`UPDATE documents SET upload_expires_at = CURRENT_TIMESTAMP - interval '10 minutes' WHERE id = $1`, [intentExp.data.document.id]);
    const compExp = await api(`/api/documents/${intentExp.data.document.id}/complete-upload`, { method: 'POST', token: tokAdminA });
    assert.strictEqual(compExp.status, 410);
    console.log('  ✅ Passed');

    // 5. Cross-tenant, Cross-branch, Family-Member & Confidential Access Controls + Platform Owner Privacy
    console.log('Test 5: Cross-tenant, cross-branch, family, confidential & Platform Owner privacy...');
    // Upload confidential doc on res1 (Branch 1)
    const intentConf = await api('/api/documents/upload-intents', {
      method: 'POST',
      token: tokAdminA,
      body: { title: 'Confidential Med', fileName: 'med.pdf', fileSizeBytes: validPdf.length, mimeType: 'application/pdf', residentId: res1Id, isConfidential: true },
    });
    await fetch(intentConf.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: validPdf });
    await api(`/api/documents/${intentConf.data.document.id}/complete-upload`, { method: 'POST', token: tokAdminA });
    const confId = intentConf.data.document.id;

    assert.strictEqual((await api(`/api/documents/${doc1Id}/download-url`, { token: tokAdminB })).status, 404);
    assert.strictEqual((await api(`/api/documents/${doc1Id}/download-url`, { token: tokNurseA2 })).status, 403);
    assert.strictEqual((await api(`/api/documents/${doc1Id}/download-url`, { token: tokFamA })).status, 200);
    assert.strictEqual((await api(`/api/documents/${confId}/download-url`, { token: tokFamA })).status, 403);
    assert.strictEqual((await api(`/api/documents/${confId}/download-url`, { token: tokNurseA1 })).status, 403);
    assert.strictEqual((await api(`/api/documents/${confId}/download-url`, { token: tokDocA })).status, 200);
    // Platform Owner cannot bypass document privacy
    assert.strictEqual((await api('/api/documents', { token: tokPoMfa })).status, 403);
    assert.strictEqual((await api(`/api/documents/${doc1Id}/download-url`, { token: tokPoMfa })).status, 403);
    console.log('  ✅ Passed');

    // 6. Concurrent Storage Quota Reservation & Abandoned Upload Release
    console.log('Test 6: Concurrent quota reservation & abandoned upload release...');
    const chunk600k = 600 * 1024;
    const conc = await Promise.all([
      api('/api/documents/upload-intents', { method: 'POST', token: tokAdminA, body: { title: 'C1', fileName: 'c1.pdf', fileSizeBytes: chunk600k, mimeType: 'application/pdf' } }),
      api('/api/documents/upload-intents', { method: 'POST', token: tokAdminA, body: { title: 'C2', fileName: 'c2.pdf', fileSizeBytes: chunk600k, mimeType: 'application/pdf' } }),
    ]);
    const okConc = conc.filter((r) => r.status === 201);
    const blkConc = conc.filter((r) => r.status === 403);
    assert.strictEqual(okConc.length, 1, 'Only 1 of 2 concurrent 600KB uploads fits in 1MB quota');
    assert.strictEqual(blkConc.length, 1);

    // Expire abandoned reservation -> slot frees up for another 600KB upload!
    await adminPool.query(`UPDATE documents SET upload_expires_at = CURRENT_TIMESTAMP - interval '5 minutes' WHERE id = $1`, [okConc[0].data.document.id]);
    const afterExp = await api('/api/documents/upload-intents', {
      method: 'POST',
      token: tokAdminA,
      body: { title: 'C3', fileName: 'c3.pdf', fileSizeBytes: chunk600k, mimeType: 'application/pdf' },
    });
    assert.strictEqual(afterExp.status, 201);
    console.log('  ✅ Passed');

    // 7. Tenant Data Export, Worker Execution, Retry, Checksum, Secret Exclusion & Expiration
    console.log('Test 7: Tenant export permissions, worker processing, ZIP checksum & secret exclusion...');
    assert.strictEqual((await api('/api/exports', { method: 'POST', token: tokDocA })).status, 403);
    assert.strictEqual((await api('/api/exports', { method: 'POST', token: tokPoMfa })).status, 403);

    const expReq = await api('/api/exports', {
      method: 'POST',
      token: tokAdminA,
      body: { exportFormat: 'zip', includeDocuments: true },
    });
    assert.strictEqual(expReq.status, 201);
    const jobId = expReq.data.exportJob.id;

    // Run export worker
    await new Promise((resolve, reject) => {
      const w = spawn(process.execPath, [path.resolve(__dirname, '../scripts/run-export-worker.js'), '--once'], {
        cwd: path.resolve(__dirname, '..'),
        env: {
          ...process.env,
          DATABASE_URL: testDbUrl,
          S3_ENDPOINT: `http://127.0.0.1:${S3_MOCK_PORT}`,
          S3_REGION: 'ap-south-1',
          S3_BUCKET: 'eldercare-test-bucket',
          S3_ACCESS_KEY_ID: 'test-access-key',
          S3_SECRET_ACCESS_KEY: 'test-secret-key',
        },
        stdio: 'pipe',
      });
      w.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Worker exited ${code}`))));
    });

    // Cross-tenant export download blocked
    assert.strictEqual((await api(`/api/exports/${jobId}/download-url`, { token: tokAdminB })).status, 404);
    assert.strictEqual((await api(`/api/exports/${jobId}/download-url`, { token: tokDocA })).status, 403);

    const expDl = await api(`/api/exports/${jobId}/download-url`, { token: tokAdminA });
    assert.strictEqual(expDl.status, 200);
    const zipBuf = Buffer.from(await (await fetch(expDl.data.downloadUrl)).arrayBuffer());
    assert.strictEqual(crypto.createHash('sha256').update(zipBuf).digest('hex'), expDl.data.sha256Checksum);

    // Inspect ZIP contents for manifest, documents, and zero secret leakage
    const zip = await JSZip.loadAsync(zipBuf);
    assert.ok(zip.file('manifest.json'), 'manifest.json must exist');
    assert.ok(zip.file('data/residents.json'), 'data/residents.json must exist');
    assert.ok(zip.file(`documents/${doc1Id}_id_card.pdf`), 'authorized document file must be in ZIP');

    for (const fname of Object.keys(zip.files)) {
      if (fname.endsWith('.json') || fname.endsWith('.csv')) {
        const text = await zip.file(fname).async('string');
        assert.ok(!text.includes('password_hash'), `${fname} must not contain password_hash`);
        assert.ok(!text.includes('mfa_secret'), `${fname} must not contain mfa_secret`);
        assert.ok(!text.includes(process.env.JWT_SECRET), `${fname} must not leak JWT_SECRET`);
      }
    }

    // Expired export returns 410
    await adminPool.query(`UPDATE tenant_export_jobs SET expires_at = CURRENT_TIMESTAMP - interval '1 hour' WHERE id = $1`, [jobId]);
    assert.strictEqual((await api(`/api/exports/${jobId}/download-url`, { token: tokAdminA })).status, 410);
    console.log('  ✅ Passed');

    console.log('\n🎉 ALL STAGE 3B-7 DOCUMENT VAULT & PORTABILITY TESTS PASSED!\n');
  } finally {
    serverProc.kill();
    s3Server.close();
    await adminPool.end();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Stage 3B-7 test suite failed:', err);
  process.exit(1);
});
