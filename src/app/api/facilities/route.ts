import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'facility:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const data = await withTenantContext(session.activeOrgId!, async (client) => {
      const params: any[] = [];
      let branchFilter = '';
      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        branchFilter = ` WHERE (rm.branch_id = $1 OR rm.branch_id IS NULL)`;
      }

      const roomsRes = await client.query(
        `
        SELECT rm.*, b.name AS branch_name
        FROM rooms rm
        LEFT JOIN branches b ON rm.branch_id = b.id
        ${branchFilter}
        ORDER BY rm.floor_number ASC, rm.room_number ASC
        `,
        params
      );

      const bedsRes = await client.query(
        `
        SELECT bd.*, rm.room_number, rm.ward_name, rm.branch_id,
               r.full_name AS resident_name, r.resident_number
        FROM beds bd
        JOIN rooms rm ON bd.room_id = rm.id
        LEFT JOIN residents r ON bd.current_resident_id = r.id
        ${branchFilter}
        ORDER BY rm.room_number ASC, bd.bed_code ASC
        `,
        params
      );

      const beds = bedsRes.rows;
      const totalBeds = beds.length;
      const occupiedBeds = beds.filter((b) => b.status === 'occupied' || b.current_resident_id).length;
      const availableBeds = beds.filter((b) => b.status === 'available' && !b.current_resident_id).length;

      return {
        rooms: roomsRes.rows,
        beds,
        stats: {
          totalRooms: roomsRes.rows.length,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        },
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'facility:manage');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { entity = 'room', roomNumber, wardName, genderDesignation = 'any', totalBeds = 1, floorNumber = 1, roomId, bedCode } = body;
    const { ipAddress } = getClientMetadata(req);

    if (entity === 'bed') {
      if (!roomId || !bedCode) {
        return NextResponse.json({ error: 'roomId and bedCode are required' }, { status: 400 });
      }
      const created = await withTenantContext(session.activeOrgId!, async (client) => {
        const roomCheck = await client.query('SELECT id, branch_id FROM rooms WHERE id = $1', [roomId]);
        if (roomCheck.rows.length === 0) return { status: 404, error: 'Room not found in this organization' };
        if (session.branchId && session.roleSlug !== 'admin' && roomCheck.rows[0].branch_id && roomCheck.rows[0].branch_id !== session.branchId) {
          return { status: 403, error: 'Forbidden: Room is outside your assigned branch' };
        }
        const res = await client.query(
          `INSERT INTO beds (organization_id, room_id, bed_code, status) VALUES ($1, $2, $3, 'available') RETURNING *`,
          [session.activeOrgId, roomId, String(bedCode).trim()]
        );
        await logTenantAudit(client, {
          organizationId: session.activeOrgId!,
          actorId: session.userId,
          action: 'bed_created',
          entityName: 'beds',
          entityId: res.rows[0].id,
          newData: { roomId, bedCode },
          ipAddress,
        });
        return { status: 201, bed: res.rows[0] };
      });
      if ('error' in created) return NextResponse.json({ error: created.error }, { status: created.status });
      return NextResponse.json({ success: true, bed: created.bed }, { status: 201 });
    }

    if (!roomNumber || !wardName) {
      return NextResponse.json({ error: 'roomNumber and wardName are required' }, { status: 400 });
    }

    const createdRoom = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        INSERT INTO rooms (organization_id, branch_id, room_number, ward_name, gender_designation, total_beds, floor_number, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'available')
        RETURNING *;
        `,
        [
          session.activeOrgId,
          session.branchId || null,
          String(roomNumber).trim(),
          String(wardName).trim(),
          genderDesignation,
          Math.max(1, parseInt(totalBeds, 10) || 1),
          parseInt(floorNumber, 10) || 1,
        ]
      );
      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'room_created',
        entityName: 'rooms',
        entityId: res.rows[0].id,
        newData: { roomNumber, wardName },
        ipAddress,
      });
      return res.rows[0];
    });

    return NextResponse.json({ success: true, room: createdRoom }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
