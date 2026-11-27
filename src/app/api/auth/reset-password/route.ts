import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { hashPassword, revokeAllUserSessions } from '@/lib/auth';
import {
  hashToken,
  validatePasswordStrength,
  getClientMetadata,
  checkRateLimit,
  recordRateLimitHit,
  logAuthSecurityEvent,
} from '@/lib/security';
import { sendSecurityAlertEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawToken = typeof body?.token === 'string' ? body.token.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!rawToken || !newPassword) {
      return NextResponse.json(
        { error: 'Reset token and new password are required.' },
        { status: 400 }
      );
    }

    const { ipAddress, userAgent } = getClientMetadata(req);
    const ipLimit = await checkRateLimit(`reset_pwd:ip:${ipAddress}`, 10, 15);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reset attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }
    await recordRateLimitHit(`reset_pwd:ip:${ipAddress}`, 10, 15, 5);

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    const tokenHash = hashToken(rawToken);
    const pool = getDbPool();
    const client = await pool.connect();

    let userId: string;
    let userEmail: string;
    let userFullName: string;

    try {
      await client.query('BEGIN');

      // Atomic single-use token claim
      const tokenRes = await client.query(
        `
        UPDATE user_verification_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1
          AND token_type = 'password_reset'
          AND used_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        RETURNING user_id;
        `,
        [tokenHash]
      );

      if (tokenRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Invalid, expired, or already used password reset token.' },
          { status: 400 }
        );
      }

      userId = tokenRes.rows[0].user_id;
      const passwordHash = await hashPassword(newPassword);

      const userUpdate = await client.query(
        `
        UPDATE users
        SET password_hash = $1,
            password_changed_at = CURRENT_TIMESTAMP,
            failed_login_attempts = 0,
            locked_until = NULL
        WHERE id = $2
        RETURNING email, full_name;
        `,
        [passwordHash, userId]
      );

      if (userUpdate.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
      }

      userEmail = userUpdate.rows[0].email;
      userFullName = userUpdate.rows[0].full_name;

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Revoke all existing sessions across all devices
    const revokedCount = await revokeAllUserSessions(userId, 'password_reset');

    await sendSecurityAlertEmail(
      userEmail,
      userFullName,
      'Your ElderCare OS password was recently reset and all active sessions were signed out.'
    );

    await logAuthSecurityEvent({
      userId,
      eventType: 'password_reset_completed',
      ipAddress,
      userAgent,
      details: { revokedSessions: revokedCount },
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. All previous sessions have been revoked.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
