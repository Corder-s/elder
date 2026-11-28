import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'rescue:convert');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    if (!session.permissions.includes('resident:create')) {
      return NextResponse.json(
        { error: 'Forbidden: Missing resident:create permission for rescue conversion' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { fullName, roomNumber, bedCode } = body;
    const { ipAddress } = getClientMetadata(req);

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      // Lock rescue case row to prevent concurrent double conversion
      const caseRes = await client.query('SELECT * FROM rescue_cases WHERE id = $1 FOR UPDATE', [id]);
      if (caseRes.rows.length === 0) {
        return { status: 404, error: 'Rescue case not found' };
      }

      const rc = caseRes.rows[0];
      if (session.branchId && session.roleSlug !== 'admin' && rc.branch_id && rc.branch_id !== session.branchId) {
        return { status: 403, error: 'Forbidden: Outside your assigned branch' };
      }
      if (rc.admitted_resident_id || rc.status === 'admitted') {
        return { status: 409, error: 'Rescue case has already been converted to a resident admission' };
      }

      // Check subscription resident quota
      const subRes = await client.query(
        `
        SELECT sp.resident_limit, ts.status AS sub_status
        FROM tenant_subscriptions ts
        JOIN subscription_plans sp ON ts.plan_id = sp.id
        WHERE ts.organization_id = $1
        `,
        [session.activeOrgId]
      );
      if (subRes.rows.length > 0) {
        const { resident_limit, sub_status } = subRes.rows[0];
        if (sub_status === 'suspended') {
          return { status: 403, error: 'Subscription suspended. Cannot admit new residents.' };
        }
        const countRes = await client.query(
          `SELECT count(*) AS cnt FROM residents WHERE is_deleted = false AND resident_status IN ('active', 'hospitalized', 'temporary_leave')`
        );
        if (parseInt(countRes.rows[0].cnt, 10) >= resident_limit) {
          return { status: 403, error: `Resident quota reached (${resident_limit}). Upgrade plan to admit.` };
        }
      }

      const resNumQuery = await client.query(
        `SELECT COALESCE(MAX(SUBSTRING(resident_number FROM '[0-9]+')::integer), 0) + 1 AS next_num FROM residents`
      );
      const residentNumber = `RES-${String(resNumQuery.rows[0].next_num).padStart(3, '0')}`;

      const residentRes = await client.query(
        `
        INSERT INTO residents (
          organization_id, branch_id, resident_number, full_name, age_estimate, gender,
          resident_status, room_number, bed_code, primary_diagnosis, admitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          rc.branch_id || session.branchId || null,
          residentNumber,
          (fullName || rc.person_identifier).trim(),
          rc.approximate_age || null,
          rc.gender,
          roomNumber || null,
          bedCode || null,
          rc.current_health_status || null,
        ]
      );
      const resident = residentRes.rows[0];

      const admNumQuery = await client.query(
        `SELECT COALESCE(MAX(SUBSTRING(admission_number FROM '[0-9]+')::integer), 0) + 1 AS next_num FROM admissions`
      );
      const admissionNumber = `ADM-${String(admNumQuery.rows[0].next_num).padStart(4, '0')}`;

      const admRes = await client.query(
        `
        INSERT INTO admissions (
          organization_id, branch_id, resident_id, admission_number, admission_type,
          admitted_by, room_number, bed_code, initial_condition_notes
        ) VALUES ($1, $2, $3, $4, 'rescue_conversion', $5, $6, $7, $8)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          rc.branch_id || session.branchId || null,
          resident.id,
          admissionNumber,
          session.userId,
          roomNumber || null,
          bedCode || null,
          rc.current_health_status || rc.notes || null,
        ]
      );

      await client.query(
        `UPDATE rescue_cases SET status = 'admitted', admitted_resident_id = $1 WHERE id = $2`,
        [resident.id, id]
      );

      await client.query(
        `UPDATE usage_records SET metric_value = metric_value + 1 WHERE organization_id = $1 AND metric_name = 'residents_count'`,
        [session.activeOrgId]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'rescue_case_converted',
        entityName: 'rescue_cases',
        entityId: id,
        newData: { residentId: resident.id, admissionId: admRes.rows[0].id },
        ipAddress,
      });

      return { status: 201, resident, admission: admRes.rows[0] };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { success: true, resident: result.resident, admission: result.admission },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Conversion failed' }, { status: 500 });
  }
}
