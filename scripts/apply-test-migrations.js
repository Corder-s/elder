/**
 * Helper to apply specified migrations to the isolated test database `eldercareos_restore_test`
 * (NEVER touches `eldercareos`).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendEnvPath = 'C:\\Users\\Shubham Saini\\Desktop\\new project\\backend\\.env';
if (!fs.existsSync(backendEnvPath)) {
  throw new Error('Backend .env not found');
}
const line = fs.readFileSync(backendEnvPath, 'utf8').split('\n').find(l => l.startsWith('DATABASE_URL='));
const raw = line.substring('DATABASE_URL='.length).trim().replace(/^['"]|['"]$/g, '');
const match = raw.match(/postgresql:\/\/([^:]+):(.*)@(localhost|127\.0\.0\.1):(\d+)\/([^?]+)/);
if (!match) throw new Error('Could not parse superuser DATABASE_URL');

const pgUser = match[1];
const pgPass = match[2];
const pgHost = match[3] === 'localhost' ? '127.0.0.1' : match[3];
const pgPort = match[4];
const targetDb = process.env.TEST_DB_NAME || 'eldercareos_restore_test';

if (targetDb === 'eldercareos' || targetDb === 'postgres') {
  throw new Error(`Refusing to run test migrations against protected DB: ${targetDb}`);
}

const env = { ...process.env, PGPASSWORD: pgPass };
const psql = '"C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe"';

const migrations = process.argv.slice(2);
if (migrations.length === 0) {
  migrations.push('migrations/009_auth_security_mfa.sql');
}

for (const m of migrations) {
  const fullPath = path.resolve(__dirname, '..', m);
  console.log(`Applying ${m} to ${targetDb}...`);
  execSync(`${psql} -v ON_ERROR_STOP=1 -U ${pgUser} -h ${pgHost} -p ${pgPort} -d "${targetDb}" -f "${fullPath}"`, {
    env,
    stdio: 'inherit',
  });
  console.log(`✅ Applied ${m} cleanly to ${targetDb}`);
}
