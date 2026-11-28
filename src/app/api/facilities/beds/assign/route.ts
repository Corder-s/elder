import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'facility:manage');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { action = 'assign', bedId, residentId } = await req.json();
    if (!bedId) {
      return NextResponse.json({ error: 'bedId is required' }, { status: 400 });
    }
    if ((action === 'assign' || action === 'transfer') && !residentId) {
      return NextResponse.json({ error: 'residentId is required for bed assignment or transfer' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      // Lock target bed row
      const bedRes = await client.query(
        `
        SELECT bd.*, rm.room_number, rm.branch_id
        FROM beds bd
        JOIN rooms rm ON bd.room_id = rm.id
        WHERE bd.id = $1
        FOR UPDATE OF bd
        `,
        [bedId]
      );
      if (bedRes.rows.length === 0) {
        return { status: 404, error: 'Target bed not found in this organization' };
      }

      const targetBed = bedRes.rows[0];
      if (session.branchId && session.roleSlug !== 'admin' && targetBed.branch_id && targetBed.branch_id !== session.branchId) {
        return { status: 403, error: 'Forbidden: Target bed is outside your assigned branch' };
      }

      if (action === 'release') {
        const prevResidentId = targetBed.current_resident_id;
        await client.query(
          `UPDATE beds SET current_resident_id = NULL, status = 'available' WHERE id = $1`,
          [bedId]
        );
        if (prevResidentId) {
          await client.query(
            `UPDATE residents SET room_number = NULL, bed_code = NULL WHERE id = $1`,
            [prevResidentId]
          );
        }
        await logTenantAudit(client, {
          organizationId: session.activeOrgId!,
          actorId: session.userId,
          action: 'bed_released',
          entityName: 'beds',
          entityId: bedId,
          oldData: { residentId: prevResidentId },
          ipAddress,
        });
        return { status: 200, message: 'Bed released successfully' };
      }

      // Check target bed availability
      if (targetBed.current_resident_id && targetBed.current_resident_id !== residentId) {
        return { status: 409, error: 'Target bed is already occupied by another resident' };
      }
      if (targetBed.status === 'maintenance') {
        return { status: 400, error: 'Target bed is currently under maintenance' };
      }

      // Lock resident row & verify org/branch ownership
      const resRow = await client.query(
        'SELECT id, branch_id, full_name FROM residents WHERE id = $1 AND is_deleted = false FOR UPDATE',
        [residentId]
      );
      if (resRow.rows.length === 0) {
        return { status: 404, error: 'Resident not found in this organization' };
      }
      const resident = resRow.rows[0];
      if (session.branchId && session.roleSlug !== 'admin' && resident.branch_id && resident.branch_id !== session.branchId) {
        return { status: 403, error: 'Forbidden: Resident is outside your assigned branch' };
      }

      // Check if resident already occupies another bed
      const currentBedRes = await client.query(
        'SELECT id FROM beds WHERE current_resident_id = $1 AND id <> $2 FOR UPDATE',
        [residentId, bedId]
      );
      if (currentBedRes.rows.length > 0) {
        if (action === 'assign') {
          return {
            status: 409,
            error: 'Resident is already assigned to another bed. Use transfer action instead.',
          };
        }
        // Release prior bed during atomic transfer
        await client.query(
          `UPDATE beds SET current_resident_id = NULL, status = 'available' WHERE id = $1`,
          [currentBedRes.rows[0].id]
        );
      }

      await client.query(
        `UPDATE beds SET current_resident_id = $1, status = 'occupied' WHERE id = $2`,
        [residentId, bedId]
      );
      await client.query(
        `UPDATE residents SET room_number = $1, bed_code = $2 WHERE id = $3`,
        [targetBed.room_number, targetBed.bed_code, residentId]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: action === 'transfer' ? 'bed_transferred' : 'bed_assigned',
        entityName: 'beds',
        entityId: bedId,
        newData: { residentId, roomNumber: targetBed.room_number, bedCode: targetBed.bed_code },
        ipAddress,
      });

      return { status: 200, message: `Bed ${targetBed.bed_code} assigned to ${resident.full_name}` };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
