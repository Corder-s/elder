import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'task:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const scope = searchParams.get('scope') || 'team'; // 'mine' | 'team'

    const tasks = await withTenantContext(session.activeOrgId!, async (client) => {
      let query = `
        SELECT t.*, u.full_name AS assigned_to_name, c.full_name AS created_by_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users c ON t.created_by = c.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        query += ` AND (t.branch_id = $${params.length} OR t.branch_id IS NULL)`;
      }
      if (scope === 'mine') {
        params.push(session.userId);
        query += ` AND t.assigned_to = $${params.length}`;
      }
      if (status === 'overdue') {
        query += ` AND t.status IN ('pending', 'in_progress') AND t.due_date IS NOT NULL AND t.due_date < CURRENT_TIMESTAMP`;
      } else if (status && status !== 'all') {
        params.push(status);
        query += ` AND t.status = $${params.length}`;
      }
      query += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC LIMIT 100`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return NextResponse.json({ tasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'task:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { title, description, priority = 'medium', assignedTo, dueDate } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }
    const cleanPriority = String(priority).toLowerCase();
    if (!VALID_PRIORITIES.includes(cleanPriority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      if (assignedTo) {
        const memberCheck = await client.query(
          `SELECT id FROM organization_memberships WHERE user_id = $1 AND status = 'active'`,
          [assignedTo]
        );
        if (memberCheck.rows.length === 0) {
          return { status: 400, error: 'Assigned user must be an active member of this organization' };
        }
      }

      const res = await client.query(
        `
        INSERT INTO tasks (organization_id, branch_id, title, description, priority, status, assigned_to, created_by, due_date)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          session.branchId || null,
          String(title).trim(),
          description || null,
          cleanPriority,
          assignedTo || null,
          session.userId,
          dueDate || null,
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'task_created',
        entityName: 'tasks',
        entityId: res.rows[0].id,
        newData: { title, assignedTo: assignedTo || null },
        ipAddress,
      });

      return { status: 201, task: res.rows[0] };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, task: result.task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'task:update');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { id, status, priority, assignedTo, dueDate } = await req.json();
    if (!id) return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }
    if (assignedTo && !session.permissions.includes('task:assign')) {
      return NextResponse.json({ error: 'Forbidden: Missing task:assign permission' }, { status: 403 });
    }

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      const existing = await client.query('SELECT * FROM tasks WHERE id = $1 FOR UPDATE', [id]);
      if (existing.rows.length === 0) return { status: 404, error: 'Task not found' };

      const currentStatus = existing.rows[0].status;
      if (currentStatus === 'completed' && status === 'pending') {
        return { status: 400, error: 'Invalid status transition from completed back to pending' };
      }

      if (assignedTo) {
        const memberCheck = await client.query(
          `SELECT id FROM organization_memberships WHERE user_id = $1 AND status = 'active'`,
          [assignedTo]
        );
        if (memberCheck.rows.length === 0) {
          return { status: 400, error: 'Assigned user must be an active member of this organization' };
        }
      }

      const upd = await client.query(
        `
        UPDATE tasks
        SET status = COALESCE($1, status),
            priority = COALESCE($2, priority),
            assigned_to = COALESCE($3, assigned_to),
            due_date = COALESCE($4, due_date),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *;
        `,
        [status || null, priority || null, assignedTo || null, dueDate || null, id]
      );

      return { status: 200, task: upd.rows[0] };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, task: result.task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
