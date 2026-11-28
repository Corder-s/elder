/**
 * ElderCare OS — Transactional Quota Enforcement Engine
 * Enforces Resident, Staff, Branch, and Storage quotas using PostgreSQL row locks (`FOR UPDATE`)
 * inside `withTenantContext()` to prevent concurrent race conditions.
 */

import type { PoolClient } from 'pg';
import { getDbPool, withTenantContext } from '@/lib/db';
import { evaluateHealthcareSafetyPolicy, LifecycleStatus } from './entitlements';

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  utilizationPercentage: number;
  warningLevel: 'none' | 'warning_80' | 'critical_95' | 'blocked_100';
  errorMessage?: string;
}

export interface UsageSnapshot {
  status: LifecycleStatus;
  planName: string;
  planSlug: string;
  residents: QuotaCheckResult;
  staff: QuotaCheckResult;
  branches: QuotaCheckResult;
  storageMb: QuotaCheckResult;
  safetyPolicy: ReturnType<typeof evaluateHealthcareSafetyPolicy>;
}

function computeWarningLevel(pct: number): QuotaCheckResult['warningLevel'] {
  if (pct >= 100) return 'blocked_100';
  if (pct >= 95) return 'critical_95';
  if (pct >= 80) return 'warning_80';
  return 'none';
}

async function lockSubscriptionAndPlan(client: PoolClient, organizationId: string) {
  const res = await client.query(
    `
    SELECT ts.id, ts.status, sp.name AS plan_name, sp.slug AS plan_slug,
           sp.resident_limit, sp.staff_limit, sp.branch_limit, sp.storage_limit_mb
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.organization_id = $1
    FOR UPDATE OF ts
    `,
    [organizationId]
  );
  return res.rows[0] || null;
}

export async function enforceResidentQuotaTx(
  client: PoolClient,
  organizationId: string
): Promise<QuotaCheckResult> {
  const sub = await lockSubscriptionAndPlan(client, organizationId);
  if (!sub) {
    return { allowed: true, currentCount: 0, limit: 30, utilizationPercentage: 0, warningLevel: 'none' };
  }

  const policy = evaluateHealthcareSafetyPolicy(sub.status);
  if (!policy.allowNewAdmissions) {
    return {
      allowed: false,
      currentCount: 0,
      limit: sub.resident_limit,
      utilizationPercentage: 100,
      warningLevel: 'blocked_100',
      errorMessage: `Subscription is ${sub.status}. Healthcare Safety Mode is active: cannot admit new residents.`,
    };
  }

  const cntRes = await client.query(
    `
    SELECT count(*) AS cnt
    FROM residents
    WHERE organization_id = $1 AND is_deleted = false
      AND resident_status IN ('active', 'hospitalized', 'temporary_leave')
    `,
    [organizationId]
  );
  const currentCount = parseInt(cntRes.rows[0].cnt, 10);
  const limit = parseInt(sub.resident_limit, 10);
  const pct = limit > 0 ? Math.round((currentCount / limit) * 100) : 100;
  const allowed = currentCount < limit;

  return {
    allowed,
    currentCount,
    limit,
    utilizationPercentage: pct,
    warningLevel: computeWarningLevel(pct),
    errorMessage: allowed
      ? undefined
      : `Resident quota reached (${currentCount}/${limit}). Please upgrade your subscription plan.`,
  };
}

export async function enforceStaffQuotaTx(
  client: PoolClient,
  organizationId: string
): Promise<QuotaCheckResult> {
  const sub = await lockSubscriptionAndPlan(client, organizationId);
  if (!sub) {
    return { allowed: true, currentCount: 0, limit: 5, utilizationPercentage: 0, warningLevel: 'none' };
  }

  const policy = evaluateHealthcareSafetyPolicy(sub.status);
  if (!policy.allowNewStaffInvites) {
    return {
      allowed: false,
      currentCount: 0,
      limit: sub.staff_limit,
      utilizationPercentage: 100,
      warningLevel: 'blocked_100',
      errorMessage: `Subscription is ${sub.status}. Cannot invite or activate new staff members.`,
    };
  }

  const cntRes = await client.query(
    `SELECT count(*) AS cnt FROM organization_memberships WHERE organization_id = $1 AND status = 'active'`,
    [organizationId]
  );
  const currentCount = parseInt(cntRes.rows[0].cnt, 10);
  const limit = parseInt(sub.staff_limit, 10);
  const pct = limit > 0 ? Math.round((currentCount / limit) * 100) : 100;
  const allowed = currentCount < limit;

  return {
    allowed,
    currentCount,
    limit,
    utilizationPercentage: pct,
    warningLevel: computeWarningLevel(pct),
    errorMessage: allowed
      ? undefined
      : `Staff quota reached (${currentCount}/${limit}). Please upgrade your subscription plan.`,
  };
}

export async function enforceBranchQuotaTx(
  client: PoolClient,
  organizationId: string
): Promise<QuotaCheckResult> {
  const sub = await lockSubscriptionAndPlan(client, organizationId);
  if (!sub) {
    return { allowed: true, currentCount: 0, limit: 1, utilizationPercentage: 0, warningLevel: 'none' };
  }

  const policy = evaluateHealthcareSafetyPolicy(sub.status);
  if (!policy.allowNewBranches) {
    return {
      allowed: false,
      currentCount: 0,
      limit: sub.branch_limit,
      utilizationPercentage: 100,
      warningLevel: 'blocked_100',
      errorMessage: `Subscription is ${sub.status}. Cannot create new branches.`,
    };
  }

  const cntRes = await client.query(
    `SELECT count(*) AS cnt FROM branches WHERE organization_id = $1 AND status = 'active'`,
    [organizationId]
  );
  const currentCount = parseInt(cntRes.rows[0].cnt, 10);
  const limit = parseInt(sub.branch_limit, 10);
  const pct = limit > 0 ? Math.round((currentCount / limit) * 100) : 100;
  const allowed = currentCount < limit;

  return {
    allowed,
    currentCount,
    limit,
    utilizationPercentage: pct,
    warningLevel: computeWarningLevel(pct),
    errorMessage: allowed
      ? undefined
      : `Branch quota reached (${currentCount}/${limit}). Please upgrade your subscription plan.`,
  };
}

export async function enforceStorageQuotaTx(
  client: PoolClient,
  organizationId: string,
  additionalBytes: number
): Promise<QuotaCheckResult> {
  if (!Number.isFinite(additionalBytes) || additionalBytes < 0) {
    return {
      allowed: false,
      currentCount: 0,
      limit: 0,
      utilizationPercentage: 100,
      warningLevel: 'blocked_100',
      errorMessage: 'Invalid file size: negative or non-finite byte values are rejected.',
    };
  }

  const sub = await lockSubscriptionAndPlan(client, organizationId);
  if (!sub) {
    return { allowed: true, currentCount: 0, limit: 5120, utilizationPercentage: 0, warningLevel: 'none' };
  }

  const policy = evaluateHealthcareSafetyPolicy(sub.status);
  if (!policy.allowNewUploads) {
    return {
      allowed: false,
      currentCount: 0,
      limit: sub.storage_limit_mb,
      utilizationPercentage: 100,
      warningLevel: 'blocked_100',
      errorMessage: `Subscription is ${sub.status}. Document uploads are paused.`,
    };
  }

  const sumRes = await client.query(
    `
    SELECT COALESCE(SUM(
      CASE
        WHEN document_status = 'pending_upload' AND (upload_expires_at IS NULL OR upload_expires_at >= CURRENT_TIMESTAMP)
          THEN GREATEST(reserved_bytes, file_size_bytes)
        WHEN document_status IN ('pending_scan', 'available', 'archived')
          THEN COALESCE(verified_size_bytes, file_size_bytes)
        ELSE 0
      END
    ), 0) AS total_bytes
    FROM documents
    WHERE organization_id = $1 AND is_deleted = false
    `,
    [organizationId]
  );
  const currentBytes = parseInt(sumRes.rows[0].total_bytes, 10);
  const limitMb = parseInt(sub.storage_limit_mb, 10);
  const limitBytes = limitMb * 1024 * 1024;
  const currentMb = Math.round((currentBytes / (1024 * 1024)) * 100) / 100;
  const projectedBytes = currentBytes + additionalBytes;
  const pct = limitBytes > 0 ? Math.round((projectedBytes / limitBytes) * 100) : 100;
  const allowed = projectedBytes <= limitBytes;

  return {
    allowed,
    currentCount: currentMb,
    limit: limitMb,
    utilizationPercentage: pct,
    warningLevel: computeWarningLevel(pct),
    errorMessage: allowed
      ? undefined
      : `Storage quota exceeded (${currentMb} MB used of ${limitMb} MB limit). Please upgrade your plan.`,
  };
}

export async function getOrganizationUsageSnapshot(organizationId: string): Promise<UsageSnapshot> {
  return withTenantContext(organizationId, async (client) => {
    const subRes = await client.query(
      `
      SELECT ts.status, sp.name AS plan_name, sp.slug AS plan_slug,
             sp.resident_limit, sp.staff_limit, sp.branch_limit, sp.storage_limit_mb
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.organization_id = $1
      `,
      [organizationId]
    );
    const sub = subRes.rows[0] || {
      status: 'trial',
      plan_name: 'Starter',
      plan_slug: 'starter',
      resident_limit: 30,
      staff_limit: 5,
      branch_limit: 1,
      storage_limit_mb: 5120,
    };

    const [resCnt, staffCnt, brCnt, docBytes] = await Promise.all([
      client.query(
        `SELECT count(*) AS cnt FROM residents WHERE organization_id = $1 AND is_deleted = false AND resident_status IN ('active', 'hospitalized', 'temporary_leave')`,
        [organizationId]
      ),
      client.query(
        `SELECT count(*) AS cnt FROM organization_memberships WHERE organization_id = $1 AND status = 'active'`,
        [organizationId]
      ),
      client.query(
        `SELECT count(*) AS cnt FROM branches WHERE organization_id = $1 AND status = 'active'`,
        [organizationId]
      ),
      client.query(
        `
        SELECT COALESCE(SUM(
          CASE
            WHEN document_status = 'pending_upload' AND (upload_expires_at IS NULL OR upload_expires_at >= CURRENT_TIMESTAMP)
              THEN GREATEST(reserved_bytes, file_size_bytes)
            WHEN document_status IN ('pending_scan', 'available', 'archived')
              THEN COALESCE(verified_size_bytes, file_size_bytes)
            ELSE 0
          END
        ), 0) AS total_bytes
        FROM documents
        WHERE organization_id = $1 AND is_deleted = false
        `,
        [organizationId]
      ),
    ]);

    const rCount = parseInt(resCnt.rows[0].cnt, 10);
    const sCount = parseInt(staffCnt.rows[0].cnt, 10);
    const bCount = parseInt(brCnt.rows[0].cnt, 10);
    const storageMbVal = Math.round((parseInt(docBytes.rows[0].total_bytes, 10) / (1024 * 1024)) * 100) / 100;

    const makeQuota = (cur: number, lim: number): QuotaCheckResult => {
      const pct = lim > 0 ? Math.round((cur / lim) * 100) : 100;
      return {
        allowed: cur < lim,
        currentCount: cur,
        limit: lim,
        utilizationPercentage: pct,
        warningLevel: computeWarningLevel(pct),
      };
    };

    const status = sub.status as LifecycleStatus;
    return {
      status,
      planName: sub.plan_name,
      planSlug: sub.plan_slug,
      residents: makeQuota(rCount, sub.resident_limit),
      staff: makeQuota(sCount, sub.staff_limit),
      branches: makeQuota(bCount, sub.branch_limit),
      storageMb: {
        ...makeQuota(storageMbVal, sub.storage_limit_mb),
        allowed: storageMbVal <= sub.storage_limit_mb,
      },
      safetyPolicy: evaluateHealthcareSafetyPolicy(status),
    };
  });
}

export async function getDefaultPoolFallbackCheck() {
  return Boolean(getDbPool());
}
