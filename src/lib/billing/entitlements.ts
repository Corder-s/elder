/**
 * ElderCare OS — Feature Entitlements & Healthcare Safety Mode Policy
 * Guarantees essential clinical & resident care remains accessible during billing delinquency,
 * while restricting new admissions, expansions, and premium features.
 */

import { withTenantContext } from '@/lib/db';

export type LifecycleStatus =
  | 'trial'
  | 'pending_payment'
  | 'active'
  | 'grace_period'
  | 'past_due'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export interface HealthcareSafetyPolicy {
  isReadOnlySafetyMode: boolean;
  allowClinicalRead: boolean;
  allowMedicationAdministration: boolean;
  allowDailyCareLogs: boolean;
  allowDataExport: boolean;
  allowNewAdmissions: boolean;
  allowNewStaffInvites: boolean;
  allowNewBranches: boolean;
  allowNewUploads: boolean;
  allowPremiumFeatures: boolean;
  billingWarning: string | null;
}

export function evaluateHealthcareSafetyPolicy(status: LifecycleStatus): HealthcareSafetyPolicy {
  const restricted = status === 'suspended' || status === 'cancelled' || status === 'expired';
  const graceOrPastDue = status === 'grace_period' || status === 'past_due' || status === 'pending_payment';

  let billingWarning: string | null = null;
  if (status === 'suspended') {
    billingWarning =
      'Subscription is suspended. Healthcare Safety Mode is active: clinical care continues uninterrupted, but new admissions, staff invites, branches, and uploads are paused.';
  } else if (status === 'cancelled' || status === 'expired') {
    billingWarning =
      `Subscription is ${status}. Healthcare Safety Mode preserves read/clinical care and data exports, while new admissions and expansions are restricted.`;
  } else if (graceOrPastDue) {
    billingWarning =
      `Subscription is ${status.replace('_', ' ')}. Please settle your open invoice to avoid service restrictions.`;
  }

  return {
    isReadOnlySafetyMode: restricted,
    // Essential elderly care & legal/medical records are NEVER blocked
    allowClinicalRead: true,
    allowMedicationAdministration: true,
    allowDailyCareLogs: true,
    allowDataExport: true,
    // Growth & non-essential operations are restricted when suspended/cancelled/expired
    allowNewAdmissions: !restricted,
    allowNewStaffInvites: !restricted,
    allowNewBranches: !restricted,
    allowNewUploads: !restricted,
    allowPremiumFeatures: !restricted,
    billingWarning,
  };
}

export async function checkFeatureEntitlement(
  organizationId: string,
  featureKey: 'custom_branding' | 'api_access' | 'audit_export' | 'advanced_reports' | 'priority_support'
): Promise<{ allowed: boolean; reason?: string }> {
  const res = await withTenantContext(organizationId, async (client) => {
    return client.query(
      `
      SELECT ts.status, sp.name AS plan_name, sp.features
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.organization_id = $1
      `,
      [organizationId]
    );
  });

  if (res.rows.length === 0) {
    return { allowed: false, reason: 'No active subscription found' };
  }

  const row = res.rows[0];
  const policy = evaluateHealthcareSafetyPolicy(row.status);
  if (!policy.allowPremiumFeatures) {
    return {
      allowed: false,
      reason: `Feature "${featureKey}" is restricted while subscription is ${row.status}.`,
    };
  }

  const features = row.features || {};
  if (!features[featureKey]) {
    return {
      allowed: false,
      reason: `Feature "${featureKey}" is not included in the ${row.plan_name} plan. Upgrade to unlock.`,
    };
  }

  return { allowed: true };
}
