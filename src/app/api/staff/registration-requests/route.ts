import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { enforceStaffQuotaTx } from '@/lib/billing/quota-service';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['org:member:update', 'org:member:invite']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;

    const data = await withTenantContext(orgId, async (client) => {
      const [reqRes, rolesRes, branchesRes] = await Promise.all([
        client.query(
          `
          SELECT rr.*, u.full_name, u.email, u.phone, u.email_verified_at,
                 r.name AS assigned_role_name, r.slug AS assigned_role_slug,
                 b.name AS assigned_branch_name
          FROM registration_requests rr
          JOIN users u ON rr.user_id = u.id
          LEFT JOIN roles r ON rr.assigned_role_id = r.id
          LEFT JOIN branches b ON rr.assigned_branch_id = b.id
          WHERE rr.organization_id = $1
          ORDER BY rr.created_at DESC
          `,
          [orgId]
        ),
        client.query(
          `SELECT id, name, slug, description FROM roles WHERE organization_id = $1 ORDER BY name ASC`,
          [orgId]
        ),
        client.query(
          `SELECT id, name, code FROM branches WHERE organization_id = $1 AND status = 'active' ORDER BY name ASC`,
          [orgId]
        ),
      ]);
      return {
        requests: reqRes.rows,
        roles: rolesRes.rows,
        branches: branchesRes.rows,
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['org:member:update', 'org:member:invite']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;
    const { ipAddress } = getClientMetadata(req);

    const body = await req.json();
    const { requestId, action, assignedRoleId, assignedBranchId, reviewNotes } = body;

    if (!requestId || !['approve', 'reject', 'suspend'].includes(action)) {
      return NextResponse.json(
        { error: 'requestId and valid action (approve, reject, suspend) are required' },
        { status: 400 }
      );
    }

    const result = await withTenantContext(orgId, async (client) => {
      const rrRes = await client.query(
        'SELECT * FROM registration_requests WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [requestId, orgId]
      );
      if (rrRes.rows.length === 0) {
        return { status: 404, error: 'Registration request not found' };
      }
      const rr = rrRes.rows[0];

      if (action === 'approve') {
        if (!assignedRoleId) {
          return { status: 400, error: 'assignedRoleId is required to approve a registration request' };
        }
        const roleRes = await client.query(
          'SELECT id, slug FROM roles WHERE id = $1 AND organization_id = $2',
          [assignedRoleId, orgId]
        );
        if (roleRes.rows.length === 0) {
          return { status: 404, error: 'Assigned role not found in this organization' };
        }
        if (assignedBranchId) {
          const brRes = await client.query(
            'SELECT id FROM branches WHERE id = $1 AND organization_id = $2',
            [assignedBranchId, orgId]
          );
          if (brRes.rows.length === 0) {
            return { status: 404, error: 'Assigned branch not found in this organization' };
          }
        }

        const quota = await enforceStaffQuotaTx(client, orgId);
        if (!quota.allowed) {
          return { status: 403, error: quota.errorMessage || 'Staff quota limit reached' };
        }

        await client.query(
          `
          INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, status)
          VALUES ($1, $2, $3, $4, 'active')
          ON CONFLICT (user_id, organization_id) DO UPDATE SET
            role_id = EXCLUDED.role_id,
            branch_id = EXCLUDED.branch_id,
            status = 'active';
          `,
          [rr.user_id, orgId, assignedRoleId, assignedBranchId || null]
        );

        const upd = await client.query(
          `
          UPDATE registration_requests
          SET status = 'approved',
              assigned_role_id = $1,
              assigned_branch_id = $2,
              reviewed_by = $3,
              reviewed_at = CURRENT_TIMESTAMP,
              review_notes = $4
          WHERE id = $5
          RETURNING *;
          `,
          [assignedRoleId, assignedBranchId || null, session.userId, reviewNotes || null, requestId]
        );

        await client.query(
          `
          INSERT INTO role_assignment_history (
            organization_id, target_user_id, actor_user_id, action,
            previous_role_id, new_role_id, previous_status, new_status, branch_id, notes
          ) VALUES ($1, $2, $3, 'approved', $4, $5, $6, 'active', $7, $8)
          `,
          [orgId, rr.user_id, session.userId, rr.assigned_role_id, assignedRoleId, rr.status, assignedBranchId || null, reviewNotes || null]
        );

        await logTenantAudit(client, {
          organizationId: orgId,
          actorId: session.userId,
          action: 'registration_request_approved',
          entityName: 'registration_requests',
          entityId: requestId,
          newData: { targetUserId: rr.user_id, assignedRoleId, assignedBranchId: assignedBranchId || null },
          ipAddress,
        });

        return { status: 200, request: upd.rows[0] };
      }

      const nextStatus = action === 'reject' ? 'rejected' : 'suspended';
      const upd = await client.query(
        `
        UPDATE registration_requests
        SET status = $1,
            reviewed_by = $2,
            reviewed_at = CURRENT_TIMESTAMP,
            review_notes = $3
        WHERE id = $4
        RETURNING *;
        `,
        [nextStatus, session.userId, reviewNotes || null, requestId]
      );

      if (action === 'suspend') {
        await client.query(
          `UPDATE organization_memberships SET status = 'suspended' WHERE user_id = $1 AND organization_id = $2`,
          [rr.user_id, orgId]
        );
      }

      await client.query(
        `
        INSERT INTO role_assignment_history (
          organization_id, target_user_id, actor_user_id, action,
          previous_status, new_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [orgId, rr.user_id, session.userId, action, rr.status, nextStatus, reviewNotes || null]
      );

      return { status: 200, request: upd.rows[0] };
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, request: result.request });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
