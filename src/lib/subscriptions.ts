/**
 * ElderCare OS — Centralized Subscription & Quota Enforcement Facade
 * Delegates to `src/lib/billing/` to avoid duplicate subscription systems.
 */

import { getDbPool } from './db';
import {
  getOrganizationUsageSnapshot,
  QuotaCheckResult,
} from './billing/quota-service';
import { evaluateHealthcareSafetyPolicy, LifecycleStatus } from './billing/entitlements';

export type { QuotaCheckResult };

export interface SubscriptionStatusInfo {
  status: LifecycleStatus;
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

export async function getTenantSubscription(organizationId: string): Promise<SubscriptionStatusInfo> {
  const pool = getDbPool();
  const res = await pool.query(
    `
    SELECT ts.status, ts.trial_end, ts.current_period_end,
           sp.name AS plan_name, sp.slug AS plan_slug,
           sp.resident_limit, sp.staff_limit, sp.branch_limit, sp.storage_limit_mb
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.organization_id = $1
    `,
    [organizationId]
  );

  if (res.rows.length === 0) {
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
  const policy = evaluateHealthcareSafetyPolicy(row.status);
  return {
    status: row.status,
    planName: row.plan_name,
    planSlug: row.plan_slug,
    residentLimit: row.resident_limit,
    staffLimit: row.staff_limit,
    branchLimit: row.branch_limit,
    storageLimitMb: row.storage_limit_mb,
    isReadOnlySafetyMode: policy.isReadOnlySafetyMode,
    isInGracePeriod: row.status === 'grace_period',
    trialEndsAt: row.trial_end,
    currentPeriodEnd: row.current_period_end,
  };
}

export async function checkResidentQuota(organizationId: string): Promise<QuotaCheckResult> {
  const snapshot = await getOrganizationUsageSnapshot(organizationId);
  return snapshot.residents;
}
