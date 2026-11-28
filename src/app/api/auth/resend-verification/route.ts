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
import { sendVerificationEmail } from '@/lib/email';

const GENERIC_RESEND_MSG =
  'If an unverified account exists for that email address, a verification link has been sent.';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanEmail = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!cleanEmail) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    const { ipAddress, userAgent } = getClientMetadata(req);

    const ipLimit = await checkRateLimit(`resend_verif:ip:${ipAddress}`, 10, 15);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }
    const acctLimit = await checkRateLimit(`resend_verif:acct:${cleanEmail}`, 3, 15);
    if (!acctLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification requests for this email. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(acctLimit.retryAfterSeconds) } }
      );
    }

    await recordRateLimitHit(`resend_verif:ip:${ipAddress}`, 10, 15, 5);
    await recordRateLimitHit(`resend_verif:acct:${cleanEmail}`, 3, 15, 10);

    const pool = getDbPool();
    const userRes = await pool.query(
      'SELECT id, email, full_name, status, email_verified_at FROM users WHERE email = $1',
      [cleanEmail]
    );

    let devVerificationToken: string | undefined;

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      if (user.status === 'active' && !user.email_verified_at) {
        // Invalidate prior unused verification tokens
        await pool.query(
          `
          UPDATE user_verification_tokens
          SET used_at = CURRENT_TIMESTAMP
          WHERE user_id = $1 AND token_type = 'email_verification' AND used_at IS NULL
          `,
          [user.id]
        );

        const rawToken = generateSecureToken(32);
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await pool.query(
          `
          INSERT INTO user_verification_tokens (user_id, token_type, token_hash, expires_at, ip_address)
          VALUES ($1, 'email_verification', $2, $3, $4)
          `,
          [user.id, tokenHash, expiresAt, ipAddress]
        );

        const emailResult = await sendVerificationEmail(user.email, user.full_name, rawToken);
        if (emailResult.mode === 'dev_sink' && process.env.EMAIL_TEST_CAPTURE !== 'true') {
          devVerificationToken = rawToken;
        }

        await logAuthSecurityEvent({
          userId: user.id,
          eventType: 'verification_resent',
          ipAddress,
          userAgent,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_RESEND_MSG,
      ...(devVerificationToken ? { devVerificationToken } : {}),
    });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Unable to process request' }, { status: 500 });
  }
}
