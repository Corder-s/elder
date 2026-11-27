import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['resident:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const orgId = session.activeOrgId!;
    const familyMode = isFamilyRole(session.roleSlug);
    let linkedIds: string[] | null = null;

    if (familyMode) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      linkedIds = links.map((l) => l.residentId);
      if (linkedIds.length === 0) {
        return NextResponse.json({ admissions: [] });
      }
    }

    const admissions = await withTenantContext(orgId, async (client) => {
      const params: any[] = [];
      let whereClause = 'WHERE 1=1';

      if (linkedIds) {
        params.push(linkedIds);
        whereClause += ` AND a.resident_id = ANY($${params.length}::uuid[])`;
      }

      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        whereClause += ` AND (a.branch_id = $${params.length} OR a.branch_id IS NULL)`;
      }

      const res = await client.query(
        `
        SELECT 
          a.id,
          a.admission_number,
          a.admission_type,
          a.admitted_at,
          a.room_number,
          a.bed_code,
          a.initial_condition_notes,
          r.id AS resident_id,
          r.full_name AS resident_name,
          r.resident_number
        FROM admissions a
        JOIN residents r ON a.resident_id = r.id
        ${whereClause}
        ORDER BY a.admitted_at DESC;
      `,
        params
      );
      return res.rows;
    });

    return NextResponse.json({ admissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
