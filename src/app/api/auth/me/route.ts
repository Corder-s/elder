import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserMemberships } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('eldercare_session')?.value;
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
    }

    const memberships = await getUserMemberships(session.userId);

    return NextResponse.json({
      authenticated: true,
      session,
      memberships,
    });
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
