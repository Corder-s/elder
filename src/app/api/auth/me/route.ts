import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession, getUserMemberships, clearSessionCookie } from '@/lib/auth';
import { getDbPool, withPlatformContext } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session) {
      const res = NextResponse.json({ authenticated: false, session: null }, { status: 401 });
      clearSessionCookie(res);
      return res;
    }

    const memberships = await getUserMemberships(session.userId);
    const pool = getDbPool();
    const userRes = await pool.query(
      'SELECT mfa_enabled, email_verified_at FROM users WHERE id = $1',
      [session.userId]
    );
    const userFlags = userRes.rows[0] || {};

    const pendingRequests = await withPlatformContext(
      { ...session, isPlatformAdmin: true, mfaVerified: true },
      async (client) => {
        const res = await client.query(
          `
          SELECT r.id, r.organization_id, r.requested_account_type, r.status, r.created_at,
                 o.name AS organization_name, o.slug AS organization_slug
          FROM registration_requests r
          JOIN organizations o ON r.organization_id = o.id
          WHERE r.user_id = $1
          ORDER BY r.created_at DESC
          LIMIT 10;
          `,
          [session.userId]
        );
        return res.rows;
      }
    );

    return NextResponse.json(
      {
        authenticated: true,
        session,
        memberships,
        pendingRequests,
        mfaEnabled: Boolean(userFlags.mfa_enabled),
        emailVerified: Boolean(userFlags.email_verified_at),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ authenticated: false, error: 'Session verification failed' }, { status: 500 });
  }
}
