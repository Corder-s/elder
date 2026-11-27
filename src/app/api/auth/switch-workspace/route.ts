import { NextRequest, NextResponse } from 'next/server';
import {
  verifyServerSession,
  buildSessionPayload,
  signToken,
  setSessionCookie,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import { getClientMetadata, logAuthSecurityEvent } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const currentSession = await verifyServerSession(req);
    if (!currentSession) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const { organizationId } = await req.json();
    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json({ error: 'Target organizationId is required' }, { status: 400 });
    }

    // Re-mint scoped session payload (strictly validates active membership & active org)
    const newSession = await buildSessionPayload(currentSession.userId, organizationId, {
      sessionId: currentSession.sessionId,
      mfaVerified: currentSession.mfaVerified,
    });

    if (currentSession.sessionId) {
      const pool = getDbPool();
      await pool.query(
        'UPDATE user_sessions SET active_organization_id = $1, last_active_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newSession.activeOrgId, currentSession.sessionId]
      );
    }

    const newToken = await signToken(newSession);
    const { ipAddress, userAgent } = getClientMetadata(req);
    await logAuthSecurityEvent({
      userId: currentSession.userId,
      organizationId: newSession.activeOrgId,
      eventType: 'workspace_switched',
      ipAddress,
      userAgent,
      details: {
        fromOrgId: currentSession.activeOrgId,
        toOrgId: newSession.activeOrgId,
      },
    });

    const response = NextResponse.json({
      success: true,
      session: newSession,
      token: newToken,
    });

    setSessionCookie(response, newToken);
    return response;
  } catch (error: any) {
    console.error('Switch workspace error:', error);
    return NextResponse.json(
      { error: error.message || 'Forbidden: Unable to switch workspace' },
      { status: 403 }
    );
  }
}
