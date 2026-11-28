import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'event:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get('timeframe') || 'all'; // 'upcoming', 'past', 'all'

    const events = await withTenantContext(session.activeOrgId!, async (client) => {
      let query = `
        SELECT e.*, b.name AS branch_name
        FROM events e
        LEFT JOIN branches b ON e.branch_id = b.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        query += ` AND (e.branch_id = $${params.length} OR e.branch_id IS NULL)`;
      }
      if (timeframe === 'upcoming') {
        query += ` AND e.start_time >= CURRENT_TIMESTAMP AND e.status <> 'cancelled'`;
      } else if (timeframe === 'past') {
        query += ` AND e.start_time < CURRENT_TIMESTAMP`;
      }
      query += ` ORDER BY e.start_time ASC LIMIT 100`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'event:manage');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { title, description, eventType = 'celebration', startTime, endTime, location } = await req.json();
    if (!title || !startTime) {
      return NextResponse.json({ error: 'title and startTime are required' }, { status: 400 });
    }
    if (endTime && new Date(endTime).getTime() < new Date(startTime).getTime()) {
      return NextResponse.json({ error: 'endTime cannot be earlier than startTime' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const created = await withTenantContext(session.activeOrgId!, async (client) => {
      // Prevent duplicate submission with same title & startTime
      const dupCheck = await client.query(
        'SELECT * FROM events WHERE LOWER(title) = LOWER($1) AND start_time = $2',
        [String(title).trim(), startTime]
      );
      if (dupCheck.rows.length > 0) {
        return { duplicate: true, event: dupCheck.rows[0] };
      }

      const res = await client.query(
        `
        INSERT INTO events (organization_id, branch_id, title, description, event_type, start_time, end_time, location, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          session.branchId || null,
          String(title).trim(),
          description || null,
          eventType,
          startTime,
          endTime || null,
          location || null,
          session.userId,
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'event_created',
        entityName: 'events',
        entityId: res.rows[0].id,
        newData: { title, startTime },
        ipAddress,
      });

      return { duplicate: false, event: res.rows[0] };
    });

    return NextResponse.json(
      { success: true, event: created.event },
      { status: created.duplicate ? 200 : 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'event:manage');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { id, title, description, status, startTime, endTime, location } = await req.json();
    if (!id) return NextResponse.json({ error: 'Event id is required' }, { status: 400 });
    if (status && !['scheduled', 'cancelled', 'completed', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Invalid event status' }, { status: 400 });
    }

    const updated = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        UPDATE events
        SET title = COALESCE($1, title),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            start_time = COALESCE($4, start_time),
            end_time = COALESCE($5, end_time),
            location = COALESCE($6, location)
        WHERE id = $7
        RETURNING *;
        `,
        [title || null, description || null, status || null, startTime || null, endTime || null, location || null, id]
      );
      return res.rows[0] || null;
    });

    if (!updated) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
