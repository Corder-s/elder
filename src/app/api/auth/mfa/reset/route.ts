import { NextRequest, NextResponse } from 'next/server';
import {
  verifyServerSession,
  comparePassword,
  revokeAllUserSessions,
  clearSessionCookie,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import { hashToken, getClientMetadata, logAuthSecurityEvent } from '@/lib/security';
import { sendSecurityAlertEmail } from '@/lib/email';

/**
 * Reset MFA using current password + a single-use recovery code.
 * Revokes all active sessions and requires fresh MFA enrollment on next sign-in.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Platform Owner session required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const password = typeof body?.password === 'string' ? body.password : '';
    const recoveryCode = typeof body?.recoveryCode === 'string' ? body.recoveryCode.trim().toUpperCase() : '';

    if (!password || !recoveryCode) {
      return NextResponse.json(
        { error: 'Current password and a valid recovery code are required.' },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const userRes = await pool.query(
      'SELECT id, email, full_name, password_hash FROM users WHERE id = $1',
      [session.userId]
    );
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userRes.rows[0];
    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    const recoveryHash = hashToken(recoveryCode);
    const recRes = await pool.query(
      `
      UPDATE user_mfa_recovery_codes
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
      RETURNING id;
      `,
      [session.userId, recoveryHash]
    );

    if (recRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or already used recovery code.' }, { status: 401 });
    }

    await pool.query('DELETE FROM user_mfa_secrets WHERE user_id = $1', [session.userId]);
    await pool.query('DELETE FROM user_mfa_recovery_codes WHERE user_id = $1', [session.userId]);
    await pool.query('UPDATE users SET mfa_enabled = false WHERE id = $1', [session.userId]);

    const revokedCount = await revokeAllUserSessions(session.userId, 'mfa_reset');
    const { ipAddress, userAgent } = getClientMetadata(req);

    await logAuthSecurityEvent({
      userId: session.userId,
      eventType: 'mfa_reset',
      ipAddress,
      userAgent,
      details: { revokedSessions: revokedCount },
    });

    await sendSecurityAlertEmail(
      user.email,
      user.full_name,
      'Multi-Factor Authentication (MFA) was reset on your Platform Owner account and all sessions were signed out.'
    );

    const response = NextResponse.json({
      success: true,
      message: 'MFA has been reset. Please sign in again to re-enroll MFA.',
    });
    clearSessionCookie(response);
    return response;
  } catch (error: any) {
    console.error('MFA reset error:', error);
    return NextResponse.json({ error: 'Failed to reset MFA' }, { status: 500 });
  }
}
