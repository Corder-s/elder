import { NextRequest, NextResponse } from 'next/server';
import {
  verifyServerSession,
  revokeAllUserSessions,
  clearSessionCookie,
} from '@/lib/auth';
import { getClientMetadata, logAuthSecurityEvent } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let keepCurrent = false;
    try {
      const body = await req.json();
      keepCurrent = Boolean(body?.keepCurrent);
    } catch {
      keepCurrent = false;
    }

    const revokedCount = await revokeAllUserSessions(
      session.userId,
      keepCurrent ? 'revoke_other_devices' : 'logout_all_devices',
      keepCurrent ? session.sessionId : undefined
    );

    const { ipAddress, userAgent } = getClientMetadata(req);
    await logAuthSecurityEvent({
      userId: session.userId,
      organizationId: session.activeOrgId,
      eventType: 'sessions_revoked_all',
      ipAddress,
      userAgent,
      details: { revokedCount, keepCurrent },
    });

    const response = NextResponse.json({
      success: true,
      revokedCount,
      loggedOutCurrent: !keepCurrent,
    });

    if (!keepCurrent) {
      clearSessionCookie(response);
    }

    return response;
  } catch (error: any) {
    console.error('Revoke all sessions error:', error);
    return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 });
  }
}
