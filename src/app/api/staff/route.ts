import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { generateSecureToken, getClientMetadata, hashToken } from '@/lib/security';
import { enforceStaffQuotaTx } from '@/lib/billing/quota-service';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:member:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const data = await withTenantContext(session.activeOrgId!, async (client) => {
      const membersRes = await client.query(
        `
        SELECT m.id, m.user_id, m.role_id, m.branch_id, m.title, m.department,
               m.status, m.joined_at,
               u.email, u.full_name, u.phone, u.status AS user_status,
               r.slug AS role_slug, r.name AS role_name,
               b.name AS branch_name
        FROM organization_memberships m
        JOIN users u ON m.user_id = u.id
        JOIN roles r ON m.role_id = r.id
        LEFT JOIN branches b ON m.branch_id = b.id
        ORDER BY m.joined_at DESC
        `
      );

      const rolesRes = await client.query(
        `SELECT id, name, slug, description FROM roles ORDER BY name ASC`
      );

      const branchesRes = await client.query(
        `SELECT id, name, code, is_main_branch, status FROM branches ORDER BY is_main_branch DESC, name ASC`
      );

      const invitesRes = await client.query(
        `
        SELECT i.id, i.email, i.invitee_name, i.role_id, i.branch_id, i.message, i.expires_at, i.accepted_at, i.revoked_at, i.created_at,
               r.name AS role_name, r.slug AS role_slug
        FROM invitations i
        JOIN roles r ON i.role_id = r.id
        WHERE i.accepted_at IS NULL AND i.revoked_at IS NULL
        ORDER BY i.created_at DESC
        `
      );

      return {
        members: membersRes.rows,
        roles: rolesRes.rows,
        branches: branchesRes.rows,
        invitations: invitesRes.rows,
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:member:invite');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { name, email, roleId, branchId, message } = await req.json();
    if (!email || !roleId) {
      return NextResponse.json({ error: 'Email and roleId are required' }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const { ipAddress } = getClientMetadata(req);
    const rawToken = generateSecureToken(24);
    const tokenHash = hashToken(rawToken);

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      const quota = await enforceStaffQuotaTx(client, session.activeOrgId!);
      if (!quota.allowed) {
        return { status: 403, error: quota.errorMessage || 'Staff quota limit reached' };
      }

      // Verify role belongs to this organization
      const roleCheck = await client.query('SELECT id, slug, name FROM roles WHERE id = $1', [roleId]);
      if (roleCheck.rows.length === 0) {
        return { status: 404, error: 'Role not found in this organization' };
      }

      if (branchId) {
        const brCheck = await client.query('SELECT id FROM branches WHERE id = $1', [branchId]);
        if (brCheck.rows.length === 0) return { status: 404, error: 'Branch not found in this organization' };
      }

      const orgRes = await client.query('SELECT name FROM organizations WHERE id = $1', [session.activeOrgId]);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invRes = await client.query(
        `
        INSERT INTO invitations (
          organization_id, email, invitee_name, role_id, branch_id, token_hash,
          invitation_type, message, invited_by, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'member_invite', $7, $8, $9)
        RETURNING id, email, invitee_name, role_id, branch_id, expires_at, created_at
        `,
        [
          session.activeOrgId,
          cleanEmail,
          name ? String(name).trim() : null,
          roleId,
          branchId || null,
          tokenHash,
          message ? String(message).trim() : null,
          session.userId,
          expiresAt,
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'member_invited',
        entityName: 'invitations',
        entityId: invRes.rows[0].id,
        newData: { email: cleanEmail, roleSlug: roleCheck.rows[0].slug },
        ipAddress,
      });

      return {
        status: 201,
        invitation: invRes.rows[0],
        orgName: orgRes.rows[0]?.name || 'ElderCare OS Organization',
        roleName: roleCheck.rows[0].name,
      };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/accept-invitation?token=${encodeURIComponent(rawToken)}`;
    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: `Invitation to join ${result.orgName} on ElderCare OS`,
      text: `You have been invited to join ${result.orgName} as ${result.roleName}.\nAccept here: ${inviteUrl}\nInvitation Token: ${rawToken}`,
      html: `<p>You have been invited to join <strong>${result.orgName}</strong> as <strong>${result.roleName}</strong>.</p><p><a href="${inviteUrl}">Accept Invitation</a></p>`,
    });

    return NextResponse.json(
      {
        success: true,
        invitation: result.invitation,
        ...(emailResult.mode === 'dev_sink' && process.env.EMAIL_TEST_CAPTURE !== 'true'
          ? { devInvitationToken: rawToken }
          : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
