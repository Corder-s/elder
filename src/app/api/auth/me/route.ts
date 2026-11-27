import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession, getUserMemberships, clearSessionCookie } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

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

    return NextResponse.json({
      authenticated: true,
      session,
      memberships,
      mfaEnabled: Boolean(userFlags.mfa_enabled),
      emailVerified: Boolean(userFlags.email_verified_at),
    });
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ authenticated: false, error: 'Session verification failed' }, { status: 500 });
  }
}
