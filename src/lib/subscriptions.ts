/**
 * ElderCare OS — Centralized Subscription & Quota Enforcement Engine
 * Implements Healthcare Safety Protocol, resource limits, and soft warning thresholds.
 */

import { getDbPool } from './db';

export interface SubscriptionStatusInfo {
  status: 'trial' | 'active' | 'past_due' | 'grace_period' | 'suspended' | 'cancelled';
  planName: string;
  planSlug: string;
  residentLimit: number;
  staffLimit: number;
  branchLimit: number;
  storageLimitMb: number;
  isReadOnlySafetyMode: boolean;
  isInGracePeriod: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  utilizationPercentage: number;
  warningLevel: 'none' | 'warning_80' | 'critical_95' | 'blocked_100';
  errorMessage?: string;
}

/**
 * Fetch detailed subscription and quota limits for a tenant.
 */
export async function getTenantSubscription(organizationId: string): Promise<SubscriptionStatusInfo> {
  const pool = getDbPool();
  const query = `
    SELECT 
      ts.status,
      ts.trial_end,
      ts.current_period_end,
      sp.name AS plan_name,
      sp.slug AS plan_slug,
      sp.resident_limit,
      sp.staff_limit,
      sp.branch_limit,
      sp.storage_limit_mb
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.organization_id = $1;
  `;
  const res = await pool.query(query, [organizationId]);

  if (res.rows.length === 0) {
    // Default safe fallback to Starter trial
    return {
      status: 'trial',
      planName: 'Starter',
      planSlug: 'starter',
      residentLimit: 30,
      staffLimit: 5,
      branchLimit: 1,
      storageLimitMb: 5120,
      isReadOnlySafetyMode: false,
      isInGracePeriod: false,
      trialEndsAt: null,
      currentPeriodEnd: new Date(Date.now() + 14 * 86400000).toISOString(),
    };
  }

  const row = res.rows[0];
  const isReadOnlySafetyMode = row.status === 'suspended';
  const isInGracePeriod = row.status === 'grace_period';

  return {
    status: row.status,
    planName: row.plan_name,
    planSlug: row.plan_slug,
    residentLimit: row.resident_limit,
    staffLimit: row.staff_limit,
    branchLimit: row.branch_limit,
    storageLimitMb: row.storage_limit_mb,
    isReadOnlySafetyMode,
    isInGracePeriod,
    trialEndsAt: row.trial_end,
    currentPeriodEnd: row.current_period_end,
  };
}

/**
 * Enforce resident quota prior to admission.
 */
export async function checkResidentQuota(organizationId: string): Promise<QuotaCheckResult> {
  const sub = await getTenantSubscription(organizationId);

  // Healthcare Safety Mode Check
  if (sub.isReadOnlySafetyMode) {
    return {
      allowed: false,
      currentCount: 0,
      limit: sub.residentLimit,
      utilizationPercentage: 100,
      warningLevel: 'blocked_100',
      errorMessage: 'Subscription is suspended. Read-only healthcare safety mode is active. Cannot admit new residents.',
    };
  }

  const pool = getDbPool();
  const res = await pool.query(`
    SELECT count(*) AS count
    FROM residents
    WHERE organization_id = $1 AND is_deleted = false AND resident_status IN ('active', 'hospitalized', 'temporary_leave');
  `, [organizationId]);

  const currentCount = parseInt(res.rows[0].count, 10);
  const limit = sub.residentLimit;
  const pct = Math.round((currentCount / limit) * 100);

  let warningLevel: QuotaCheckResult['warningLevel'] = 'none';
  if (pct >= 100) {
    warningLevel = 'blocked_100';
  } else if (pct >= 95) {
    warningLevel = 'critical_95';
  } else if (pct >= 80) {
    warningLevel = 'warning_80';
  }

  const allowed = currentCount < limit;
  const errorMessage = !allowed
    ? `Resident quota limit reached (${currentCount}/${limit}). Please upgrade your subscription.`
    : undefined;

  return {
    allowed,
    currentCount,
    limit,
    utilizationPercentage: pct,
    warningLevel,
    errorMessage,
  };
}
