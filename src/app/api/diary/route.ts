import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

const VALID_SHIFTS = ['morning', 'afternoon', 'night'];

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'diary:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const shift = searchParams.get('shift');

    const entries = await withTenantContext(session.activeOrgId!, async (client) => {
      let query = `
        SELECT d.*, u.full_name AS author_name, r.slug AS author_role
        FROM daily_diary d
        JOIN users u ON d.author_id = u.id
        LEFT JOIN organization_memberships m ON m.user_id = u.id AND m.organization_id = d.organization_id
        LEFT JOIN roles r ON m.role_id = r.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        query += ` AND (d.branch_id = $${params.length} OR d.branch_id IS NULL)`;
      }
      if (date) {
        params.push(date);
        query += ` AND d.entry_date = $${params.length}`;
      }
      if (shift && shift !== 'all') {
        params.push(shift.toLowerCase());
        query += ` AND LOWER(d.shift) = $${params.length}`;
      }
      query += ` ORDER BY d.entry_date DESC, d.created_at DESC LIMIT 100`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'diary:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { entryDate, shift = 'morning', content } = await req.json();
    if (!content || String(content).trim().length < 3) {
      return NextResponse.json({ error: 'Diary entry content is required' }, { status: 400 });
    }
    const cleanShift = String(shift).toLowerCase();
    if (!VALID_SHIFTS.includes(cleanShift)) {
      return NextResponse.json({ error: 'Shift must be morning, afternoon, or night' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const created = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        INSERT INTO daily_diary (organization_id, branch_id, author_id, entry_date, shift, content)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          session.branchId || null,
          session.userId, // Author strictly derived from verified session
          entryDate || new Date().toISOString().split('T')[0],
          cleanShift,
          String(content).trim(),
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'diary_entry_created',
        entityName: 'daily_diary',
        entityId: res.rows[0].id,
        newData: { shift: cleanShift, entryDate: res.rows[0].entry_date },
        ipAddress,
      });

      return res.rows[0];
    });

    return NextResponse.json({ success: true, entry: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'diary:update');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { id, content } = await req.json();
    if (!id || !content) {
      return NextResponse.json({ error: 'id and content are required' }, { status: 400 });
    }

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      const existing = await client.query('SELECT * FROM daily_diary WHERE id = $1 FOR UPDATE', [id]);
      if (existing.rows.length === 0) return { status: 404, error: 'Diary entry not found' };

      if (existing.rows[0].author_id !== session.userId && session.roleSlug !== 'admin') {
        return { status: 403, error: 'Forbidden: Only the original author or administrator can edit this diary entry' };
      }

      const upd = await client.query(
        `UPDATE daily_diary SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
        [String(content).trim(), id]
      );
      return { status: 200, entry: upd.rows[0] };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, entry: result.entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
