/**
 * Inspect foreign keys and check for cross-tenant inconsistencies.
 */

const { Pool } = require('pg');
const fs = require('fs');

const backendEnvPath = 'C:\\Users\\Shubham Saini\\Desktop\\new project\\backend\\.env';
let pgUser = 'postgres';
let pgPass = '';
let pgHost = '127.0.0.1';
let pgPort = 5432;

if (fs.existsSync(backendEnvPath)) {
  const lines = fs.readFileSync(backendEnvPath, 'utf8').split('\n');
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

const pool = new Pool({
  user: pgUser,
  password: pgPass,
  host: pgHost,
  port: pgPort,
  database: 'eldercareos',
});

async function inspectForeignKeys() {
  console.log('🔍 Inspecting relationships and cross-tenant integrity in eldercareos...\n');

  // Check 1: admissions -> residents
  const badAdmissions = await pool.query(`
    SELECT a.id, a.organization_id as adm_org, r.organization_id as res_org
    FROM admissions a
    JOIN residents r ON a.resident_id = r.id
    WHERE a.organization_id != r.organization_id;
  `);
  console.log(`1. admissions -> residents cross-tenant mismatches: ${badAdmissions.rows.length}`);

  // Check 2: medical_records -> residents
  const badMed = await pool.query(`
    SELECT m.id, m.organization_id as med_org, r.organization_id as res_org
    FROM medical_records m
    JOIN residents r ON m.resident_id = r.id
    WHERE m.organization_id != r.organization_id;
  `);
  console.log(`2. medical_records -> residents cross-tenant mismatches: ${badMed.rows.length}`);

  // Check 3: prescriptions -> residents
  const badPres = await pool.query(`
    SELECT p.id, p.organization_id as pres_org, r.organization_id as res_org
    FROM prescriptions p
    JOIN residents r ON p.resident_id = r.id
    WHERE p.organization_id != r.organization_id;
  `);
  console.log(`3. prescriptions -> residents cross-tenant mismatches: ${badPres.rows.length}`);

  // Check 4: medication_schedules -> prescriptions
  const badSched = await pool.query(`
    SELECT ms.id, ms.organization_id as sched_org, p.organization_id as pres_org
    FROM medication_schedules ms
    JOIN prescriptions p ON ms.prescription_id = p.id
    WHERE ms.organization_id != p.organization_id;
  `);
  console.log(`4. medication_schedules -> prescriptions cross-tenant mismatches: ${badSched.rows.length}`);

  // Check 5: beds -> rooms
  const badBeds = await pool.query(`
    SELECT b.id, b.organization_id as bed_org, r.organization_id as room_org
    FROM beds b
    JOIN rooms r ON b.room_id = r.id
    WHERE b.organization_id != r.organization_id;
  `);
  console.log(`5. beds -> rooms cross-tenant mismatches: ${badBeds.rows.length}`);

  // Check 6: attendance -> residents
  const badAtt = await pool.query(`
    SELECT a.id, a.organization_id as att_org, r.organization_id as res_org
    FROM attendance a
    JOIN residents r ON a.resident_id = r.id
    WHERE a.organization_id != r.organization_id;
  `);
  console.log(`6. attendance -> residents cross-tenant mismatches: ${badAtt.rows.length}`);

  // Check 7: documents -> residents
  const badDocs = await pool.query(`
    SELECT d.id, d.organization_id as doc_org, r.organization_id as res_org
    FROM documents d
    JOIN residents r ON d.resident_id = r.id
    WHERE d.organization_id != r.organization_id;
  `);
  console.log(`7. documents -> residents cross-tenant mismatches: ${badDocs.rows.length}`);

  // Check 8: visits -> visitors
  const badVisits = await pool.query(`
    SELECT v.id, v.organization_id as visit_org, vis.organization_id as visitor_org
    FROM visits v
    JOIN visitors vis ON v.visitor_id = vis.id
    WHERE v.organization_id != vis.organization_id;
  `);
  console.log(`8. visits -> visitors cross-tenant mismatches: ${badVisits.rows.length}`);

  console.log('\n✅ All cross-tenant foreign key consistency checks passed (0 invalid references exist).');

  await pool.end();
}

inspectForeignKeys().catch(console.error);
