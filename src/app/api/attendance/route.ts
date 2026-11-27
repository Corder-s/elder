import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['attendance:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const orgId = session.activeOrgId!;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const familyMode = isFamilyRole(session.roleSlug);
    let linkedIds: string[] | null = null;
    if (familyMode) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      linkedIds = links.map((l) => l.residentId);
      if (linkedIds.length === 0) {
        return NextResponse.json({ attendance: [], date });
      }
    }

    const attendance = await withTenantContext(orgId, async (client) => {
      const params: any[] = [date];
      let extraWhere = '';
      if (linkedIds) {
        params.push(linkedIds);
        extraWhere += ` AND a.resident_id = ANY($${params.length}::uuid[])`;
      }
      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        extraWhere += ` AND (r.branch_id = $${params.length} OR r.branch_id IS NULL)`;
      }

      const res = await client.query(
        `
        SELECT 
          a.id,
          a.date,
          a.status,
          a.notes,
          r.id AS resident_id,
          r.full_name AS resident_name,
          r.resident_number,
          r.room_number,
          r.bed_code
        FROM attendance a
        JOIN residents r ON a.resident_id = r.id
        WHERE a.date = $1 ${extraWhere}
        ORDER BY r.room_number ASC, r.full_name ASC;
      `,
        params
      );
      return res.rows;
    });

    return NextResponse.json({ attendance, date });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'attendance:mark');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { residentId, date, status, notes } = await req.json();
    if (!residentId || !status) {
      return NextResponse.json({ error: 'Resident ID and status are required' }, { status: 400 });
    }

    const recordDate = date || new Date().toISOString().split('T')[0];

    const record = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        INSERT INTO attendance (organization_id, resident_id, date, status, recorded_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (organization_id, resident_id, date) DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          recorded_by = EXCLUDED.recorded_by
        RETURNING *;
      `,
        [session.activeOrgId, residentId, recordDate, status, session.userId, notes || null]
      );
      return res.rows[0];
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
