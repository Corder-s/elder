import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { getClientMetadata, hashToken, validatePasswordStrength } from '@/lib/security';
import { logTenantAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const rawToken = req.nextUrl.searchParams.get('token')?.trim() || '';
    if (!rawToken) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    const tokenHash = hashToken(rawToken);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.is_platform_admin', 'true', true)`);

      const invRes = await client.query(
        `SELECT * FROM resolve_invitation_by_token_hash($1);`,
        [tokenHash]
      );

      if (invRes.rows.length === 0) {
        await client.query('COMMIT');
        return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
      }
      const inv = invRes.rows[0];
      const userCheck = await client.query(
        'SELECT id, email_verified_at FROM users WHERE lower(email) = lower($1) LIMIT 1',
        [inv.email]
      );
      const existingUser = userCheck.rows[0];
      await client.query('COMMIT');

      if (inv.revoked_at) {
        return NextResponse.json({ error: 'This invitation has been revoked' }, { status: 400 });
      }
      if (inv.accepted_at) {
        return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 });
      }
      if (new Date(inv.expires_at).getTime() <= Date.now()) {
        return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
      }

      return NextResponse.json({
        invitation: {
          email: inv.email,
          inviteeName: inv.invitee_name,
          organizationName: inv.organization_name,
          organizationSlug: inv.organization_slug,
          roleName: inv.role_name,
          roleSlug: inv.role_slug,
          branchName: inv.branch_name,
          message: inv.message,
          invitationType: inv.invitation_type,
          requiresPasswordSetup: !existingUser || !existingUser.email_verified_at,
        },
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to validate invitation' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawToken = typeof body?.token === 'string' ? body.token.trim() : '';
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : null;

    if (!rawToken) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 });
    }

    const tokenHash = hashToken(rawToken);
    const { ipAddress } = getClientMetadata(req);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.is_platform_admin', 'true', true)`);

      const resolvedRes = await client.query(
        `SELECT * FROM resolve_invitation_by_token_hash($1);`,
        [tokenHash]
      );

      if (resolvedRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
      }

      const resolved = resolvedRes.rows[0];
      await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [resolved.organization_id]);

      const invRes = await client.query(
        `SELECT * FROM invitations WHERE id = $1 FOR UPDATE`,
        [resolved.id]
      );
      const inv = { ...resolved, ...(invRes.rows[0] || {}) };
      if (inv.revoked_at) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'This invitation has been revoked' }, { status: 400 });
      }
      if (inv.accepted_at) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 });
      }
      if (new Date(inv.expires_at).getTime() <= Date.now()) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
      }
      if (inv.organization_status === 'suspended') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Target organization is currently suspended' }, { status: 403 });
      }

      await client.query(`SELECT set_config('app.current_organization_id', $1, true)`, [inv.organization_id]);

      const cleanEmail = String(inv.email).toLowerCase().trim();
      const userRes = await client.query('SELECT * FROM users WHERE lower(email) = $1', [cleanEmail]);
      let userId: string;

      if (userRes.rows.length === 0) {
        if (!fullName || !password) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: 'Full name and password are required to complete invitation registration' },
            { status: 400 }
          );
        }
        const strength = validatePasswordStrength(password);
        if (!strength.valid) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: strength.error }, { status: 400 });
        }
        const pwHash = await hashPassword(password);
        const inserted = await client.query(
          `
          INSERT INTO users (email, password_hash, full_name, phone, is_platform_admin, status, email_verified_at)
          VALUES ($1, $2, $3, $4, false, 'active', CURRENT_TIMESTAMP)
          RETURNING id;
          `,
          [cleanEmail, pwHash, fullName, phone]
        );
        userId = inserted.rows[0].id;
      } else {
        const existingUser = userRes.rows[0];
        userId = existingUser.id;
        // Pre-created unverified user (e.g. Initial NGO Admin) or password setup
        if (!existingUser.email_verified_at || inv.invitation_type === 'initial_admin') {
          if (password) {
            const strength = validatePasswordStrength(password);
            if (!strength.valid) {
              await client.query('ROLLBACK');
              return NextResponse.json({ error: strength.error }, { status: 400 });
            }
            const pwHash = await hashPassword(password);
            await client.query(
              `
              UPDATE users
              SET password_hash = $1,
                  full_name = COALESCE(NULLIF($2, ''), full_name),
                  phone = COALESCE($3, phone),
                  email_verified_at = CURRENT_TIMESTAMP
              WHERE id = $4;
              `,
              [pwHash, fullName, phone, userId]
            );
          } else {
            await client.query(
              `UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = $1`,
              [userId]
            );
          }
        }
      }

      // Activate organization-scoped membership (single org only, never global role)
      await client.query(
        `
        INSERT INTO organization_memberships (user_id, organization_id, role_id, branch_id, status)
        VALUES ($1, $2, $3, $4, 'active')
        ON CONFLICT (user_id, organization_id)
        DO UPDATE SET role_id = EXCLUDED.role_id,
                      branch_id = COALESCE(EXCLUDED.branch_id, organization_memberships.branch_id),
                      status = 'active',
                      updated_at = CURRENT_TIMESTAMP;
        `,
        [userId, inv.organization_id, inv.role_id, inv.branch_id]
      );

      // Single-use invalidation
      await client.query(
        `UPDATE invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [inv.id]
      );

      await logTenantAudit(client, {
        organizationId: inv.organization_id,
        actorId: userId,
        action: 'invitation_accepted',
        entityName: 'invitations',
        entityId: inv.id,
        newData: { email: cleanEmail, roleSlug: inv.role_slug, invitationType: inv.invitation_type },
        ipAddress,
      });

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `You have joined ${inv.organization_name} as ${inv.role_name}. You may now sign in.`,
        organizationName: inv.organization_name,
        roleName: inv.role_name,
        email: cleanEmail,
      });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to accept invitation' }, { status: 500 });
  }
}
