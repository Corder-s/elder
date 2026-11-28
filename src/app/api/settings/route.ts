import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext, getDbPool } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';
import { enforceBranchQuotaTx } from '@/lib/billing/quota-service';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:settings:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;

    const pool = getDbPool();
    const orgRes = await pool.query(
      `
      SELECT id, name, slug, legal_name, registration_number, tax_exempt_80g_number,
             darpan_id, primary_email, primary_phone, address_line1, city, state,
             postal_code, country, timezone, currency, status, trial_ends_at
      FROM organizations
      WHERE id = $1
      `,
      [orgId]
    );

    const tenantData = await withTenantContext(orgId, async (client) => {
      const branchesRes = await client.query(
        'SELECT id, name, code, phone, address, is_main_branch, status FROM branches ORDER BY is_main_branch DESC, name ASC'
      );
      let subscription = null;
      if (session.permissions.includes('org:subscription:read')) {
        const subRes = await client.query(
          `
          SELECT ts.status, ts.billing_interval, ts.current_period_end,
                 sp.name AS plan_name, sp.slug AS plan_slug,
                 sp.resident_limit, sp.staff_limit, sp.branch_limit, sp.storage_limit_mb
          FROM tenant_subscriptions ts
          JOIN subscription_plans sp ON ts.plan_id = sp.id
          WHERE ts.organization_id = $1
          `,
          [orgId]
        );
        subscription = subRes.rows[0] || null;
      }
      return { branches: branchesRes.rows, subscription };
    });

    return NextResponse.json({
      organization: orgRes.rows[0] || null,
      branches: tenantData.branches,
      subscription: tenantData.subscription,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:settings:update');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;
    const body = await req.json();
    const { ipAddress } = getClientMetadata(req);

    // Branch creation/update inside tenant context
    if (body.action === 'create_branch') {
      const { name, code, phone, address } = body;
      if (!name || !code) {
        return NextResponse.json({ error: 'Branch name and code are required' }, { status: 400 });
      }
      const branchResult = await withTenantContext(orgId, async (client) => {
        const quota = await enforceBranchQuotaTx(client, orgId);
        if (!quota.allowed) {
          return { error: quota.errorMessage || 'Branch quota limit reached' };
        }
        const res = await client.query(
          `
          INSERT INTO branches (organization_id, name, code, phone, address, is_main_branch, status)
          VALUES ($1, $2, $3, $4, $5, false, 'active')
          RETURNING *;
          `,
          [orgId, String(name).trim(), String(code).trim().toUpperCase(), phone || null, address || null]
        );
        await logTenantAudit(client, {
          organizationId: orgId,
          actorId: session.userId,
          action: 'branch_created',
          entityName: 'branches',
          entityId: res.rows[0].id,
          newData: { name, code },
          ipAddress,
        });
        return { branch: res.rows[0] };
      });
      if ('error' in branchResult) {
        return NextResponse.json({ error: branchResult.error }, { status: 403 });
      }
      return NextResponse.json({ success: true, branch: branchResult.branch }, { status: 201 });
    }

    // Update NGO profile fields (never allows modifying status, slug, or platform plans)
    const { name, legalName, primaryPhone, addressLine1, city, state, postalCode, timezone } = body;
    const pool = getDbPool();
    const upd = await pool.query(
      `
      UPDATE organizations
      SET name = COALESCE($1, name),
          legal_name = COALESCE($2, legal_name),
          primary_phone = COALESCE($3, primary_phone),
          address_line1 = COALESCE($4, address_line1),
          city = COALESCE($5, city),
          state = COALESCE($6, state),
          postal_code = COALESCE($7, postal_code),
          timezone = COALESCE($8, timezone)
      WHERE id = $9
      RETURNING id, name, slug, legal_name, primary_email, primary_phone, address_line1, city, state, postal_code, timezone;
      `,
      [name || null, legalName || null, primaryPhone || null, addressLine1 || null, city || null, state || null, postalCode || null, timezone || null, orgId]
    );

    await withTenantContext(orgId, async (client) => {
      await logTenantAudit(client, {
        organizationId: orgId,
        actorId: session.userId,
        action: 'workspace_settings_updated',
        entityName: 'organizations',
        entityId: orgId,
        newData: { name: upd.rows[0]?.name, city: upd.rows[0]?.city },
        ipAddress,
      });
    });

    return NextResponse.json({ success: true, organization: upd.rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
