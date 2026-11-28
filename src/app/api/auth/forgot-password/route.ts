import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import {
  generateSecureToken,
  hashToken,
  getClientMetadata,
  checkRateLimit,
  recordRateLimitHit,
  logAuthSecurityEvent,
} from '@/lib/security';
import { sendPasswordResetEmail } from '@/lib/email';

const GENERIC_FORGOT_MSG =
  'If an authorized account is registered with that email, password reset instructions have been sent.';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const { ipAddress, userAgent } = getClientMetadata(req);

    const ipLimit = await checkRateLimit(`forgot_pwd:ip:${ipAddress}`, 10, 15);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }
    const acctLimit = await checkRateLimit(`forgot_pwd:acct:${cleanEmail}`, 3, 15);
    if (!acctLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(acctLimit.retryAfterSeconds) } }
      );
    }

    await recordRateLimitHit(`forgot_pwd:ip:${ipAddress}`, 10, 15, 5);
    await recordRateLimitHit(`forgot_pwd:acct:${cleanEmail}`, 3, 15, 10);

    const pool = getDbPool();
    const userRes = await pool.query(
      'SELECT id, email, full_name, status FROM users WHERE email = $1',
      [cleanEmail]
    );

    let devResetToken: string | undefined;

    if (userRes.rows.length > 0 && userRes.rows[0].status === 'active') {
      const user = userRes.rows[0];

      // Invalidate previous unused reset tokens for this user
      await pool.query(
        `
        UPDATE user_verification_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND token_type = 'password_reset' AND used_at IS NULL
        `,
        [user.id]
      );

      const rawToken = generateSecureToken(32);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await pool.query(
        `
        INSERT INTO user_verification_tokens (user_id, token_type, token_hash, expires_at, ip_address)
        VALUES ($1, 'password_reset', $2, $3, $4)
        `,
        [user.id, tokenHash, expiresAt, ipAddress]
      );

      const emailResult = await sendPasswordResetEmail(user.email, user.full_name, rawToken);
      if (emailResult.mode === 'dev_sink' && process.env.EMAIL_TEST_CAPTURE !== 'true') {
        devResetToken = rawToken;
      }

      await logAuthSecurityEvent({
        userId: user.id,
        eventType: 'password_reset_requested',
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_FORGOT_MSG,
      ...(devResetToken ? { devResetToken } : {}),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Unable to process request' }, { status: 500 });
  }
}
