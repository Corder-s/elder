import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { actionType, status, notes, isActive, dosage, frequency, instructions } = body;
    const { ipAddress } = getClientMetadata(req);

    // 1. Administer / Miss / Refused scheduled dose
    if (actionType === 'administer_schedule') {
      const authz = await requireTenantPermission(req, 'medical:schedule:administer');
      if (!authz.authorized) return authz.errorResponse;
      const { session } = authz;

      if (session.isPlatformAdmin) {
        return NextResponse.json({ error: 'Forbidden for Platform Owners' }, { status: 403 });
      }

      if (!['administered', 'missed', 'refused'].includes(status)) {
        return NextResponse.json({ error: 'Status must be administered, missed, or refused' }, { status: 400 });
      }

      const result = await withTenantContext(session.activeOrgId!, async (client) => {
        const existing = await client.query(
          'SELECT * FROM medication_schedules WHERE id = $1 FOR UPDATE',
          [id]
        );
        if (existing.rows.length === 0) return { status: 404, error: 'Medication schedule not found' };

        if (existing.rows[0].status !== 'pending') {
          return {
            status: 409,
            error: `Dose already recorded as ${existing.rows[0].status}; duplicate administration prevented`,
          };
        }

        const res = await client.query(
          `
          UPDATE medication_schedules
          SET status = $1,
              administered_at = CURRENT_TIMESTAMP,
              administered_by = $2,
              notes = COALESCE($3, notes)
          WHERE id = $4
          RETURNING *;
          `,
          [status, session.userId, notes || null, id]
        );

        await logTenantAudit(client, {
          organizationId: session.activeOrgId!,
          actorId: session.userId,
          action: 'medication_dose_recorded',
          entityName: 'medication_schedules',
          entityId: id,
          newData: { status, residentId: res.rows[0].resident_id },
          ipAddress,
        });

        return { status: 200, schedule: res.rows[0] };
      });

      if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ success: true, schedule: result.schedule });
    }

    // 2. Update / Activate / Deactivate Prescription (Doctor only)
    const authz = await requireTenantPermission(req, 'medical:prescription:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    if (session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden for Platform Owners' }, { status: 403 });
    }

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      const existing = await client.query('SELECT * FROM prescriptions WHERE id = $1 FOR UPDATE', [id]);
      if (existing.rows.length === 0) return { status: 404, error: 'Prescription not found' };

      const res = await client.query(
        `
        UPDATE prescriptions
        SET is_active = COALESCE($1, is_active),
            dosage = COALESCE($2, dosage),
            frequency = COALESCE($3, frequency),
            instructions = COALESCE($4, instructions),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *;
        `,
        [
          typeof isActive === 'boolean' ? isActive : null,
          dosage || null,
          frequency || null,
          instructions || null,
          id,
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'prescription_updated',
        entityName: 'prescriptions',
        entityId: id,
        oldData: { isActive: existing.rows[0].is_active },
        newData: { isActive: res.rows[0].is_active },
        ipAddress,
      });

      return { status: 200, prescription: res.rows[0] };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, prescription: result.prescription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
