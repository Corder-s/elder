import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import {
  hashToken,
  getClientMetadata,
  checkRateLimit,
  recordRateLimitHit,
  logAuthSecurityEvent,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawToken = typeof body?.token === 'string' ? body.token.trim() : '';

    if (!rawToken || rawToken.length < 16) {
      return NextResponse.json(
        { error: 'A valid verification token is required.' },
        { status: 400 }
      );
    }

    const { ipAddress, userAgent } = getClientMetadata(req);
    const ipLimit = await checkRateLimit(`verify_email:ip:${ipAddress}`, 15, 15);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }
    await recordRateLimitHit(`verify_email:ip:${ipAddress}`, 15, 15, 5);

    const tokenHash = hashToken(rawToken);
    const pool = getDbPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Atomic one-time token consumption (prevents replay/race conditions)
      const tokenRes = await client.query(
        `
        UPDATE user_verification_tokens
        SET used_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1
          AND token_type = 'email_verification'
          AND used_at IS NULL
          AND expires_at > CURRENT_TIMESTAMP
        RETURNING user_id;
        `,
        [tokenHash]
      );

      if (tokenRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Invalid, expired, or already used verification token.' },
          { status: 400 }
        );
      }

      const userId: string = tokenRes.rows[0].user_id;

      await client.query(
        `
        UPDATE users
        SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
        WHERE id = $1
        `,
        [userId]
      );

      await client.query('COMMIT');

      await logAuthSecurityEvent({
        userId,
        eventType: 'email_verified',
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully. You may now sign in.',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}
