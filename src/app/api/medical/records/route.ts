import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['medical:record:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    // Strict Policy: Platform Owner accounts must never access clinical/medical records
    if (session.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Medical records are strictly restricted from Platform Owner accounts' },
        { status: 403 }
      );
    }

    const orgId = session.activeOrgId!;
    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get('residentId');

    const familyMode = isFamilyRole(session.roleSlug);
    let allowedResidentIds: string[] | null = null;

    if (familyMode) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      allowedResidentIds = links.filter((l) => l.canViewRecords).map((l) => l.residentId);

      if (residentId && !allowedResidentIds.includes(residentId)) {
        return NextResponse.json(
          { error: 'Forbidden: You are not authorized to view medical records for this resident' },
          { status: 403 }
        );
      }

      if (allowedResidentIds.length === 0) {
        return NextResponse.json({ records: [] });
      }
    }

    const records = await withTenantContext(orgId, async (client) => {
      let query = `
        SELECT 
          m.id,
          m.record_date,
          m.record_type,
          m.diagnosis,
          m.clinical_notes,
          m.follow_up_date,
          m.created_at,
          r.id AS resident_id,
          r.full_name AS resident_name,
          r.resident_number,
          u.full_name AS doctor_name
        FROM medical_records m
        JOIN residents r ON m.resident_id = r.id
        LEFT JOIN users u ON m.doctor_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (residentId) {
        params.push(residentId);
        query += ` AND m.resident_id = $${params.length}`;
      }
      if (allowedResidentIds) {
        params.push(allowedResidentIds);
        query += ` AND m.resident_id = ANY($${params.length}::uuid[])`;
      }
      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        query += ` AND (r.branch_id = $${params.length} OR r.branch_id IS NULL)`;
      }

      query += ` ORDER BY m.record_date DESC, m.created_at DESC;`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return NextResponse.json({ records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'medical:record:write');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    if (session.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Platform Owner accounts cannot author medical records' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { residentId, diagnosis, clinicalNotes, followUpDate, recordType = 'consultation' } = body;

    if (!residentId || !diagnosis) {
      return NextResponse.json({ error: 'Resident ID and diagnosis are required' }, { status: 400 });
    }

    const newRecord = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        INSERT INTO medical_records (
          organization_id, resident_id, doctor_id, diagnosis, clinical_notes, follow_up_date, record_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `,
        [
          session.activeOrgId,
          residentId,
          session.userId,
          diagnosis.trim(),
          clinicalNotes || null,
          followUpDate || null,
          recordType,
        ]
      );
      return res.rows[0];
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
