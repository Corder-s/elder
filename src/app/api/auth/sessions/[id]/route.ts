import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession, revokeSession, clearSessionCookie } from '@/lib/auth';
import { getClientMetadata, logAuthSecurityEvent } from '@/lib/security';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyServerSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetSessionId } = await context.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!targetSessionId || !uuidRegex.test(targetSessionId)) {
      return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
    }

    const revoked = await revokeSession(targetSessionId, session.userId, 'revoked_by_user');
    if (!revoked) {
      return NextResponse.json({ error: 'Session not found or already revoked' }, { status: 404 });
    }

    const { ipAddress, userAgent } = getClientMetadata(req);
    await logAuthSecurityEvent({
      userId: session.userId,
      organizationId: session.activeOrgId,
      eventType: 'session_revoked',
      ipAddress,
      userAgent,
      details: { targetSessionId, reason: 'revoked_by_user' },
    });

    const response = NextResponse.json({
      success: true,
      revokedCurrent: targetSessionId === session.sessionId,
    });

    if (targetSessionId === session.sessionId) {
      clearSessionCookie(response);
    }

    return response;
  } catch (error: any) {
    console.error('Revoke session error:', error);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
