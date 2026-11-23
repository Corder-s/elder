import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, buildSessionPayload, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get('eldercare_session')?.value;
    const authHeader = req.headers.get('authorization');
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentSession = await verifyToken(token);
    if (!currentSession) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: 'Target organizationId is required' }, { status: 400 });
    }

    // Re-mint scoped session token for the new organization
    const newSession = await buildSessionPayload(currentSession.userId, organizationId);
    const newToken = await signToken(newSession);

    const response = NextResponse.json({
      success: true,
      session: newSession,
      token: newToken,
    });

    response.cookies.set('eldercare_session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Switch workspace error:', error);
    return NextResponse.json({ error: error.message || 'Failed to switch workspace' }, { status: 400 });
  }
}
