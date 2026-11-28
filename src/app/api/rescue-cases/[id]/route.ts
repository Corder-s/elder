import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

const ALLOWED_STATUSES = [
  'new',
  'under_assessment',
  'hospitalized',
  'family_tracing',
  'temporary_shelter',
  'admitted',
  'reunited',
  'referred',
];

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'rescue:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;

    const record = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        SELECT rc.*, u.full_name AS team_leader_name
        FROM rescue_cases rc
        LEFT JOIN users u ON rc.assigned_team_leader_id = u.id
        WHERE rc.id = $1
        `,
        [id]
      );
      return res.rows[0] || null;
    });

    if (!record) {
      return NextResponse.json({ error: 'Rescue case not found' }, { status: 404 });
    }
    if (session.branchId && session.roleSlug !== 'admin' && record.branch_id && record.branch_id !== session.branchId) {
      return NextResponse.json({ error: 'Forbidden: Outside your assigned branch' }, { status: 403 });
    }

    return NextResponse.json({ rescueCase: record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'rescue:update');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;

    const body = await req.json();
    const {
      status,
      urgencyLevel,
      assignedTeamLeaderId,
      rescueLocation,
      currentHealthStatus,
      notes,
    } = body;

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid rescue case status' }, { status: 400 });
    }
    if (urgencyLevel && !['low', 'medium', 'high', 'critical'].includes(urgencyLevel)) {
      return NextResponse.json({ error: 'Invalid urgency level' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const updated = await withTenantContext(session.activeOrgId!, async (client) => {
      const existing = await client.query('SELECT * FROM rescue_cases WHERE id = $1 FOR UPDATE', [id]);
      if (existing.rows.length === 0) return { notFound: true };

      const row = existing.rows[0];
      if (session.branchId && session.roleSlug !== 'admin' && row.branch_id && row.branch_id !== session.branchId) {
        return { forbidden: true };
      }

      const res = await client.query(
        `
        UPDATE rescue_cases
        SET status = COALESCE($1, status),
            urgency_level = COALESCE($2, urgency_level),
            assigned_team_leader_id = COALESCE($3, assigned_team_leader_id),
            rescue_location = COALESCE($4, rescue_location),
            current_health_status = COALESCE($5, current_health_status),
            notes = COALESCE($6, notes)
        WHERE id = $7
        RETURNING *;
        `,
        [
          status || null,
          urgencyLevel || null,
          assignedTeamLeaderId || null,
          rescueLocation || null,
          currentHealthStatus || null,
          notes || null,
          id,
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'rescue_case_updated',
        entityName: 'rescue_cases',
        entityId: id,
        oldData: { status: row.status, urgency: row.urgency_level },
        newData: { status: res.rows[0].status, urgency: res.rows[0].urgency_level },
        ipAddress,
      });

      return { record: res.rows[0] };
    });

    if ('notFound' in updated) return NextResponse.json({ error: 'Rescue case not found' }, { status: 404 });
    if ('forbidden' in updated) return NextResponse.json({ error: 'Forbidden: Outside assigned branch' }, { status: 403 });

    return NextResponse.json({ success: true, rescueCase: updated.record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
