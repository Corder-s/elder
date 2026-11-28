/**
 * ElderCare OS — Subscription Plan Catalog & Management
 */

import { getDbPool, queryPlatform, withPlatformContext } from '@/lib/db';
import type { SessionPayload } from '@/lib/auth';

export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthlyInr: number;
  priceAnnualInr: number;
  residentLimit: number;
  staffLimit: number;
  branchLimit: number;
  storageLimitMb: number;
  features: Record<string, boolean>;
  isActive: boolean;
}

function mapPlan(r: any): SubscriptionPlanRecord {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    priceMonthlyInr: parseFloat(r.price_monthly_inr),
    priceAnnualInr: parseFloat(r.price_annual_inr),
    residentLimit: parseInt(r.resident_limit, 10),
    staffLimit: parseInt(r.staff_limit, 10),
    branchLimit: parseInt(r.branch_limit, 10),
    storageLimitMb: parseInt(r.storage_limit_mb, 10),
    features: r.features || {},
    isActive: Boolean(r.is_active),
  };
}

export async function listSubscriptionPlans(includeInactive = false): Promise<SubscriptionPlanRecord[]> {
  const pool = getDbPool();
  const res = await pool.query(
    `
    SELECT * FROM subscription_plans
    ${includeInactive ? '' : 'WHERE is_active = true'}
    ORDER BY price_monthly_inr ASC
    `
  );
  return res.rows.map(mapPlan);
}

export async function getPlanByIdOrSlug(identifier: string): Promise<SubscriptionPlanRecord | null> {
  const pool = getDbPool();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const res = await pool.query(
    uuidRegex.test(identifier)
      ? 'SELECT * FROM subscription_plans WHERE id = $1'
      : 'SELECT * FROM subscription_plans WHERE slug = $1',
    [identifier]
  );
  return res.rows.length > 0 ? mapPlan(res.rows[0]) : null;
}

export async function createSubscriptionPlan(
  session: SessionPayload,
  input: {
    name: string;
    slug: string;
    description?: string;
    priceMonthlyInr: number;
    priceAnnualInr: number;
    residentLimit: number;
    staffLimit: number;
    branchLimit: number;
    storageLimitMb: number;
    features?: Record<string, boolean>;
  }
): Promise<SubscriptionPlanRecord> {
  return withPlatformContext(session, async (client) => {
    const res = await client.query(
      `
      INSERT INTO subscription_plans (
        name, slug, description, price_monthly_inr, price_annual_inr,
        resident_limit, staff_limit, branch_limit, storage_limit_mb, features, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, true)
      RETURNING *;
      `,
      [
        input.name.trim(),
        input.slug.toLowerCase().trim(),
        input.description || null,
        input.priceMonthlyInr,
        input.priceAnnualInr,
        input.residentLimit,
        input.staffLimit,
        input.branchLimit,
        input.storageLimitMb,
        JSON.stringify(input.features || {}),
      ]
    );

    await client.query(
      `
      INSERT INTO platform_audit_logs (actor_user_id, action, resource_type, resource_id, details)
      VALUES ($1, 'plan_created', 'subscription_plan', $2, $3::jsonb)
      `,
      [session.userId, res.rows[0].id, JSON.stringify({ slug: res.rows[0].slug })]
    );

    return mapPlan(res.rows[0]);
  });
}

export async function updateSubscriptionPlan(
  session: SessionPayload,
  planId: string,
  updates: Partial<{
    name: string;
    description: string;
    priceMonthlyInr: number;
    priceAnnualInr: number;
    residentLimit: number;
    staffLimit: number;
    branchLimit: number;
    storageLimitMb: number;
    features: Record<string, boolean>;
    isActive: boolean;
  }>
): Promise<SubscriptionPlanRecord> {
  return withPlatformContext(session, async (client) => {
    if (updates.isActive === false) {
      const activeSubs = await client.query(
        `SELECT count(*) AS cnt FROM tenant_subscriptions WHERE plan_id = $1 AND status IN ('active', 'trial', 'grace_period')`,
        [planId]
      );
      if (parseInt(activeSubs.rows[0].cnt, 10) > 0) {
        throw new Error('Cannot deactivate a plan that has active or trial NGO subscriptions');
      }
    }

    const res = await client.query(
      `
      UPDATE subscription_plans
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price_monthly_inr = COALESCE($3, price_monthly_inr),
          price_annual_inr = COALESCE($4, price_annual_inr),
          resident_limit = COALESCE($5, resident_limit),
          staff_limit = COALESCE($6, staff_limit),
          branch_limit = COALESCE($7, branch_limit),
          storage_limit_mb = COALESCE($8, storage_limit_mb),
          features = COALESCE($9::jsonb, features),
          is_active = COALESCE($10, is_active)
      WHERE id = $11
      RETURNING *;
      `,
      [
        updates.name ?? null,
        updates.description ?? null,
        updates.priceMonthlyInr ?? null,
        updates.priceAnnualInr ?? null,
        updates.residentLimit ?? null,
        updates.staffLimit ?? null,
        updates.branchLimit ?? null,
        updates.storageLimitMb ?? null,
        updates.features ? JSON.stringify(updates.features) : null,
        typeof updates.isActive === 'boolean' ? updates.isActive : null,
        planId,
      ]
    );

    if (res.rows.length === 0) {
      throw new Error('Subscription plan not found');
    }

    await client.query(
      `
      INSERT INTO platform_audit_logs (actor_user_id, action, resource_type, resource_id, details)
      VALUES ($1, 'plan_updated', 'subscription_plan', $2, $3::jsonb)
      `,
      [session.userId, planId, JSON.stringify(updates)]
    );

    return mapPlan(res.rows[0]);
  });
}

export async function getPlanUsageAcrossTenants(session: SessionPayload) {
  const res = await queryPlatform(
    session,
    `
    SELECT sp.id, sp.name, sp.slug, sp.price_monthly_inr, sp.is_active,
           count(ts.id) AS total_subscribers,
           count(ts.id) FILTER (WHERE ts.status = 'active') AS active_subscribers,
           count(ts.id) FILTER (WHERE ts.status = 'trial') AS trial_subscribers
    FROM subscription_plans sp
    LEFT JOIN tenant_subscriptions ts ON ts.plan_id = sp.id
    GROUP BY sp.id
    ORDER BY sp.price_monthly_inr ASC
    `
  );
  return res.rows;
}
