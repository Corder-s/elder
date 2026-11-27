import { NextRequest, NextResponse } from 'next/server';
import {
  verifyServerSession,
  buildSessionPayload,
  signToken,
  setSessionCookie,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import { getClientMetadata, logAuthSecurityEvent } from '@/lib/security';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const currentSession = await verifyServerSession(req);
    if (!currentSession) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    let body: { organizationId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const organizationId = typeof body?.organizationId === 'string' ? body.organizationId.trim() : '';
    if (!organizationId || !UUID_REGEX.test(organizationId)) {
      return NextResponse.json({ error: 'A valid target organizationId is required' }, { status: 400 });
    }

    // Re-mint scoped session payload (strictly validates active membership & active org)
    let newSession;
    try {
      newSession = await buildSessionPayload(currentSession.userId, organizationId, {
        sessionId: currentSession.sessionId,
        mfaVerified: currentSession.mfaVerified,
      });
    } catch (authError: any) {
      return NextResponse.json(
        { error: authError?.message || 'Forbidden: Unable to switch workspace' },
        { status: 403 }
      );
    }

    if (currentSession.sessionId) {
      const pool = getDbPool();
      const updateRes = await pool.query(
        `
        UPDATE user_sessions
        SET active_organization_id = $1, last_active_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3 AND is_revoked = false
        RETURNING id;
        `,
        [newSession.activeOrgId, currentSession.sessionId, currentSession.userId]
      );
      if (updateRes.rows.length === 0) {
        return NextResponse.json({ error: 'Session is no longer active' }, { status: 401 });
      }
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
    return NextResponse.json({ error: 'Failed to switch workspace' }, { status: 500 });
  }
}
