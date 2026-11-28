/**
 * ElderCare OS — Local CLI Worker for Tenant Data Exports & Retention Cleanup
 * Usage:
 *   npx tsx scripts/run-export-worker.ts --once
 *   npx tsx scripts/run-export-worker.ts --watch
 */

import fs from 'fs';
import path from 'path';
import { runExportWorkerBatch } from '../src/lib/export/tenant-export-service';
import { runGlobalRetentionCleanup } from '../src/lib/storage/retention-cleanup';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

async function runOnce() {
  const workerRes = await runExportWorkerBatch();
  const cleanupRes = await runGlobalRetentionCleanup();
  console.log(
    `[ExportWorker] processedExports=${workerRes.processedCount}, releasedPendingUploads=${cleanupRes.totalReleased}, expiredExports=${cleanupRes.totalExpired}`
  );
}

async function main() {
  const watch = process.argv.includes('--watch');
  await runOnce();
  if (watch) {
    setInterval(() => {
      runOnce().catch((err) => console.error('[ExportWorker] cycle error:', err));
    }, 10000);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('[ExportWorker] fatal error:', err);
  process.exit(1);
});
