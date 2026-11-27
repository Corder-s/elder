import { NextRequest, NextResponse } from 'next/server';
import {
  extractTokenFromRequest,
  verifyToken,
  revokeSession,
  clearSessionCookie,
} from '@/lib/auth';
import { getClientMetadata, logAuthSecurityEvent } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (token) {
      const session = await verifyToken(token);
      if (session?.sessionId && session.userId) {
        await revokeSession(session.sessionId, session.userId, 'user_logout');
        const { ipAddress, userAgent } = getClientMetadata(req);
        await logAuthSecurityEvent({
          userId: session.userId,
          organizationId: session.activeOrgId,
          eventType: 'session_revoked',
          ipAddress,
          userAgent,
          details: { sessionId: session.sessionId, reason: 'user_logout' },
        });
      }
    }
  } catch (err) {
    console.error('Logout revocation error:', err);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  clearSessionCookie(response);
  return response;
}
