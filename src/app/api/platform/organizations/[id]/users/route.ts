import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { withPlatformContext } from '@/lib/db';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyServerSession(req);
    if (!session || !session.isPlatformAdmin || !session.mfaVerified) {
      return NextResponse.json({ error: 'Unauthorized: MFA-verified Platform Owner required' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
    }

    const data = await withPlatformContext(session, async (client) => {
      const orgRes = await client.query(
        'SELECT id, name, slug, status FROM organizations WHERE id = $1',
        [id]
      );
      if (orgRes.rows.length === 0) return null;

      const usersRes = await client.query(
        `
        SELECT m.id AS membership_id, m.user_id, m.status AS membership_status, m.joined_at,
               u.full_name, u.email, u.phone, u.email_verified_at,
               r.name AS role_name, r.slug AS role_slug,
               b.name AS branch_name
        FROM organization_memberships m
        JOIN users u ON m.user_id = u.id
        JOIN roles r ON m.role_id = r.id
        LEFT JOIN branches b ON m.branch_id = b.id
        WHERE m.organization_id = $1
        ORDER BY m.joined_at DESC;
        `,
        [id]
      );

      const invitesRes = await client.query(
        `
        SELECT i.id, i.email, i.invitee_name, i.invitation_type, i.expires_at, i.accepted_at, i.revoked_at, i.created_at,
               r.name AS role_name, r.slug AS role_slug
        FROM invitations i
        JOIN roles r ON i.role_id = r.id
        WHERE i.organization_id = $1
        ORDER BY i.created_at DESC
        LIMIT 25;
        `,
        [id]
      );

      // Non-medical activity metadata only (never expose medical record payloads)
      const activityRes = await client.query(
        `
        SELECT id, actor_id, action, entity_name, entity_id, created_at
        FROM tenant_audit_logs
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT 30;
        `,
        [id]
      );

      return {
        organization: orgRes.rows[0],
        users: usersRes.rows,
        invitations: invitesRes.rows,
        activity: activityRes.rows,
      };
    });

    if (!data) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load organization users' }, { status: 500 });
  }
}
