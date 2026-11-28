import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['medical:prescription:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    if (session.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Medical prescriptions and schedules are restricted from Platform Owners' },
        { status: 403 }
      );
    }

    const orgId = session.activeOrgId!;
    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get('residentId');
    const scheduleStatus = searchParams.get('scheduleStatus');

    const familyMode = isFamilyRole(session.roleSlug);
    let allowedResidentIds: string[] | null = null;
    if (familyMode) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      allowedResidentIds = links.filter((l) => l.canViewRecords).map((l) => l.residentId);
      if (residentId && !allowedResidentIds.includes(residentId)) {
        return NextResponse.json({ error: 'Forbidden: Resident not linked to your account' }, { status: 403 });
      }
      if (allowedResidentIds.length === 0) {
        return NextResponse.json({ prescriptions: [], schedules: [], observations: [] });
      }
    }

    const data = await withTenantContext(orgId, async (client) => {
      const rxParams: any[] = [];
      let rxWhere = 'WHERE 1=1';
      if (residentId) {
        rxParams.push(residentId);
        rxWhere += ` AND p.resident_id = $${rxParams.length}`;
      }
      if (allowedResidentIds) {
        rxParams.push(allowedResidentIds);
        rxWhere += ` AND p.resident_id = ANY($${rxParams.length}::uuid[])`;
      }

      const rxRes = await client.query(
        `
        SELECT p.*, r.full_name AS resident_name, r.resident_number, u.full_name AS prescriber_name
        FROM prescriptions p
        JOIN residents r ON p.resident_id = r.id
        LEFT JOIN users u ON p.prescribed_by = u.id
        ${rxWhere}
        ORDER BY p.is_active DESC, p.created_at DESC
        LIMIT 100
        `,
        rxParams
      );

      const schedParams: any[] = [];
      let schedWhere = 'WHERE 1=1';
      if (residentId) {
        schedParams.push(residentId);
        schedWhere += ` AND ms.resident_id = $${schedParams.length}`;
      }
      if (allowedResidentIds) {
        schedParams.push(allowedResidentIds);
        schedWhere += ` AND ms.resident_id = ANY($${schedParams.length}::uuid[])`;
      }
      if (scheduleStatus && scheduleStatus !== 'all') {
        schedParams.push(scheduleStatus);
        schedWhere += ` AND ms.status = $${schedParams.length}`;
      }

      const schedRes = await client.query(
        `
        SELECT ms.*, p.medicine_name, p.dosage, p.route,
               r.full_name AS resident_name, r.resident_number,
               u.full_name AS administered_by_name
        FROM medication_schedules ms
        JOIN prescriptions p ON ms.prescription_id = p.id
        JOIN residents r ON ms.resident_id = r.id
        LEFT JOIN users u ON ms.administered_by = u.id
        ${schedWhere}
        ORDER BY ms.scheduled_for DESC
        LIMIT 100
        `,
        schedParams
      );

      const obsRes = await client.query(
        `
        SELECT mo.*, r.full_name AS resident_name, u.full_name AS recorded_by_name
        FROM medical_observations mo
        JOIN residents r ON mo.resident_id = r.id
        LEFT JOIN users u ON mo.recorded_by = u.id
        ${residentId ? 'WHERE mo.resident_id = $1' : ''}
        ORDER BY mo.recorded_at DESC
        LIMIT 50
        `,
        residentId ? [residentId] : []
      );

      return {
        prescriptions: rxRes.rows,
        schedules: schedRes.rows,
        observations: obsRes.rows,
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actionType = body?.actionType || 'create_prescription';
    const { ipAddress } = getClientMetadata(req);

    if (actionType === 'schedule_dose') {
      const authz = await requireTenantPermission(req, ['medical:prescription:create', 'medical:schedule:administer']);
      if (!authz.authorized) return authz.errorResponse;
      const { session } = authz;

      if (session.isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden for Platform Owners' }, { status: 403 });
      }

      const { prescriptionId, residentId, scheduledFor, notes } = body;
      if (!prescriptionId || !residentId || !scheduledFor) {
        return NextResponse.json({ error: 'prescriptionId, residentId, and scheduledFor are required' }, { status: 400 });
      }

      const sched = await withTenantContext(session.activeOrgId!, async (client) => {
        // Verify prescription belongs to same organization AND same resident
        const rxCheck = await client.query(
          'SELECT id, resident_id, is_active FROM prescriptions WHERE id = $1',
          [prescriptionId]
        );
        if (rxCheck.rows.length === 0) {
          return { status: 404, error: 'Prescription not found in this organization' };
        }
        if (rxCheck.rows[0].resident_id !== residentId) {
          return { status: 400, error: 'Prescription does not belong to the specified resident' };
        }
        if (!rxCheck.rows[0].is_active) {
          return { status: 400, error: 'Cannot schedule doses for an inactive prescription' };
        }

        const res = await client.query(
          `
          INSERT INTO medication_schedules (organization_id, prescription_id, resident_id, scheduled_for, status, notes)
          VALUES ($1, $2, $3, $4, 'pending', $5)
          RETURNING *;
          `,
          [session.activeOrgId, prescriptionId, residentId, scheduledFor, notes || null]
        );
        return { status: 201, record: res.rows[0] };
      });

      if ('error' in sched) return NextResponse.json({ error: sched.error }, { status: sched.status });
      return NextResponse.json({ success: true, schedule: sched.record }, { status: 201 });
    }

    // Default: create_prescription (Strictly Doctor / clinician with medical:prescription:create)
    const authz = await requireTenantPermission(req, 'medical:prescription:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    if (session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden: Platform Owners cannot prescribe medication' }, { status: 403 });
    }

    const { residentId, medicineName, dosage, frequency, route = 'oral', startDate, endDate, instructions } = body;
    if (!residentId || !medicineName || !dosage || !frequency) {
      return NextResponse.json(
        { error: 'residentId, medicineName, dosage, and frequency are required' },
        { status: 400 }
      );
    }

    const created = await withTenantContext(session.activeOrgId!, async (client) => {
      const resCheck = await client.query('SELECT id FROM residents WHERE id = $1 AND is_deleted = false', [residentId]);
      if (resCheck.rows.length === 0) {
        return { status: 404, error: 'Resident not found in this organization' };
      }

      const rxRes = await client.query(
        `
        INSERT INTO prescriptions (
          organization_id, resident_id, prescribed_by, medicine_name, dosage,
          frequency, route, start_date, end_date, instructions, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          residentId,
          session.userId,
          String(medicineName).trim(),
          String(dosage).trim(),
          String(frequency).trim(),
          route,
          startDate || new Date().toISOString().split('T')[0],
          endDate || null,
          instructions || null,
        ]
      );

      await client.query(
        `UPDATE residents SET active_medications_count = active_medications_count + 1 WHERE id = $1`,
        [residentId]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'prescription_created',
        entityName: 'prescriptions',
        entityId: rxRes.rows[0].id,
        newData: { residentId, medicineName },
        ipAddress,
      });

      return { status: 201, record: rxRes.rows[0] };
    });

    if ('error' in created) return NextResponse.json({ error: created.error }, { status: created.status });
    return NextResponse.json({ success: true, prescription: created.record }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
