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
    const { roleId, branchId, status, title, department } = body;

    const requiredPerm = status === 'suspended' || status === 'revoked' ? 'org:member:deactivate' : 'org:member:update';
    const authz = await requireTenantPermission(req, requiredPerm);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    if (status && !['active', 'suspended', 'revoked'].includes(status)) {
      return NextResponse.json({ error: 'Invalid membership status' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      const existing = await client.query(
        `
        SELECT m.*, u.is_platform_admin
        FROM organization_memberships m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = $1
        FOR UPDATE OF m
        `,
        [id]
      );
      if (existing.rows.length === 0) {
        return { status: 404, error: 'Membership not found in this organization' };
      }

      const member = existing.rows[0];

      // Prevent users from escalating their own role or deactivating themselves
      if (member.user_id === session.userId && (roleId || status === 'suspended' || status === 'revoked')) {
        return { status: 403, error: 'Forbidden: You cannot modify your own role or deactivate your own membership' };
      }

      if (roleId) {
        const roleCheck = await client.query('SELECT id, slug FROM roles WHERE id = $1', [roleId]);
        if (roleCheck.rows.length === 0) {
          return { status: 404, error: 'Target role not found in this organization' };
        }
      }

      if (branchId) {
        const brCheck = await client.query('SELECT id FROM branches WHERE id = $1', [branchId]);
        if (brCheck.rows.length === 0) {
          return { status: 404, error: 'Target branch not found in this organization' };
        }
      }

      const upd = await client.query(
        `
        UPDATE organization_memberships
        SET role_id = COALESCE($1, role_id),
            branch_id = COALESCE($2, branch_id),
            status = COALESCE($3, status),
            title = COALESCE($4, title),
            department = COALESCE($5, department)
        WHERE id = $6
        RETURNING *;
        `,
        [roleId || null, branchId || null, status || null, title || null, department || null, id]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: status ? `membership_${status}` : 'membership_updated',
        entityName: 'organization_memberships',
        entityId: id,
        oldData: { roleId: member.role_id, status: member.status },
        newData: { roleId: upd.rows[0].role_id, status: upd.rows[0].status },
        ipAddress,
      });

      return { status: 200, membership: upd.rows[0] };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, membership: result.membership });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'org:member:invite');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;
    const { ipAddress } = getClientMetadata(req);

    const deleted = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        'DELETE FROM invitations WHERE id = $1 AND accepted_at IS NULL RETURNING id, email',
        [id]
      );
      if (res.rows.length === 0) return null;
      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'invitation_revoked',
        entityName: 'invitations',
        entityId: id,
        oldData: { email: res.rows[0].email },
        ipAddress,
      });
      return res.rows[0];
    });

    if (!deleted) return NextResponse.json({ error: 'Pending invitation not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
