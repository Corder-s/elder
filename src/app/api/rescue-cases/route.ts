import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'rescue:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const status = (searchParams.get('status') || '').trim().toLowerCase();
    const urgency = (searchParams.get('urgency') || '').trim().toLowerCase();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const cases = await withTenantContext(session.activeOrgId!, async (client) => {
      let query = `
        SELECT
          rc.id, rc.case_number, rc.person_identifier, rc.approximate_age, rc.gender,
          rc.rescue_location, rc.reporting_source, rc.reported_by_phone,
          rc.status, rc.urgency_level, rc.assigned_team_leader_id,
          rc.current_health_status, rc.notes, rc.admitted_resident_id,
          rc.branch_id, rc.created_at, rc.updated_at,
          u.full_name AS team_leader_name
        FROM rescue_cases rc
        LEFT JOIN users u ON rc.assigned_team_leader_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        query += ` AND (rc.branch_id = $${params.length} OR rc.branch_id IS NULL)`;
      }
      if (status && status !== 'all') {
        params.push(status);
        query += ` AND LOWER(rc.status) = $${params.length}`;
      }
      if (urgency && urgency !== 'all') {
        params.push(urgency);
        query += ` AND LOWER(rc.urgency_level) = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (LOWER(rc.person_identifier) LIKE $${params.length} OR LOWER(rc.case_number) LIKE $${params.length} OR LOWER(rc.rescue_location) LIKE $${params.length})`;
      }

      params.push(limit, offset);
      query += ` ORDER BY rc.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return NextResponse.json({ rescueCases: cases });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load rescue cases' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'rescue:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const {
      personIdentifier,
      approximateAge,
      gender,
      rescueLocation,
      reportingSource,
      reportedByPhone,
      urgencyLevel = 'medium',
      assignedTeamLeaderId,
      currentHealthStatus,
      notes,
    } = body;

    if (!personIdentifier || !gender || !rescueLocation) {
      return NextResponse.json(
        { error: 'Person identifier, gender, and rescue location are required' },
        { status: 400 }
      );
    }

    const validUrgency = ['low', 'medium', 'high', 'critical'].includes(String(urgencyLevel).toLowerCase())
      ? String(urgencyLevel).toLowerCase()
      : 'medium';

    const { ipAddress } = getClientMetadata(req);

    const created = await withTenantContext(session.activeOrgId!, async (client) => {
      const numRes = await client.query(
        `SELECT COALESCE(MAX(SUBSTRING(case_number FROM '[0-9]+')::integer), 0) + 1 AS next_num FROM rescue_cases`
      );
      const caseNumber = `RSC-${String(numRes.rows[0].next_num).padStart(4, '0')}`;

      const res = await client.query(
        `
        INSERT INTO rescue_cases (
          organization_id, branch_id, case_number, person_identifier, approximate_age, gender,
          rescue_location, reporting_source, reported_by_phone, status, urgency_level,
          assigned_team_leader_id, current_health_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', $10, $11, $12, $13)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          session.branchId || null,
          caseNumber,
          String(personIdentifier).trim(),
          approximateAge ? parseInt(approximateAge, 10) : null,
          String(gender).toLowerCase(),
          String(rescueLocation).trim(),
          reportingSource || null,
          reportedByPhone || null,
          validUrgency,
          assignedTeamLeaderId || null,
          currentHealthStatus || null,
          notes || null,
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'rescue_case_created',
        entityName: 'rescue_cases',
        entityId: res.rows[0].id,
        newData: { caseNumber, urgencyLevel: validUrgency },
        ipAddress,
      });

      return res.rows[0];
    });

    return NextResponse.json({ success: true, rescueCase: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create rescue case' }, { status: 500 });
  }
}
