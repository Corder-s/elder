import { NextRequest, NextResponse } from 'next/server';
import {
  verifyServerSession,
  buildSessionPayload,
  signToken,
  setSessionCookie,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import {
  decryptTotpSecret,
  verifyTotpCode,
  generateRecoveryCodes,
} from '@/lib/mfa';
import {
  hashToken,
  checkRateLimit,
  recordRateLimitHit,
  resetRateLimit,
  getClientMetadata,
  logAuthSecurityEvent,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Platform Owner privileges required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const recoveryCode = typeof body?.recoveryCode === 'string' ? body.recoveryCode.trim().toUpperCase() : '';

    if (!code && !recoveryCode) {
      return NextResponse.json(
        { error: 'A 6-digit authenticator code or recovery code is required.' },
        { status: 400 }
      );
    }

    const { ipAddress, userAgent } = getClientMetadata(req);
    const rateKey = `mfa:user:${session.userId}`;
    const limit = await checkRateLimit(rateKey, 5, 15);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many MFA verification attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const pool = getDbPool();
    const mfaRes = await pool.query(
      'SELECT secret_encrypted, iv, auth_tag, is_verified FROM user_mfa_secrets WHERE user_id = $1',
      [session.userId]
    );

    if (mfaRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'MFA has not been enrolled for this account.' },
        { status: 400 }
      );
    }

    const mfaRow = mfaRes.rows[0];
    let verified = false;
    let usedRecovery = false;

    if (code) {
      const plainSecret = decryptTotpSecret(mfaRow.secret_encrypted, mfaRow.iv, mfaRow.auth_tag);
      verified = verifyTotpCode(plainSecret, code, 1);
    } else if (recoveryCode && mfaRow.is_verified) {
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
      if (recRes.rows.length > 0) {
        verified = true;
        usedRecovery = true;
      }
    }

    if (!verified) {
      await recordRateLimitHit(rateKey, 5, 15, 5);
      await logAuthSecurityEvent({
        userId: session.userId,
        eventType: 'mfa_failed',
        ipAddress,
        userAgent,
        details: { method: recoveryCode ? 'recovery_code' : 'totp' },
      });
      return NextResponse.json(
        { error: 'Invalid verification code.' },
        { status: 401 }
      );
    }

    await resetRateLimit(rateKey);

    let generatedRecoveryCodes: string[] | undefined;

    // If this completes initial MFA enrollment, activate MFA and issue recovery codes
    if (!mfaRow.is_verified) {
      await pool.query(
        'UPDATE user_mfa_secrets SET is_verified = true, verified_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [session.userId]
      );
      await pool.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [session.userId]);

      // Replace any old recovery codes
      await pool.query('DELETE FROM user_mfa_recovery_codes WHERE user_id = $1', [session.userId]);
      const codes = generateRecoveryCodes(8);
      for (const c of codes) {
        await pool.query(
          'INSERT INTO user_mfa_recovery_codes (user_id, code_hash) VALUES ($1, $2)',
          [session.userId, c.hash]
        );
      }
      generatedRecoveryCodes = codes.map((c) => c.plaintext);
    }

    // Upgrade server-side session & re-mint JWT with mfaVerified = true
    if (session.sessionId) {
      await pool.query(
        'UPDATE user_sessions SET mfa_verified = true, mfa_verified_at = CURRENT_TIMESTAMP WHERE id = $1',
        [session.sessionId]
      );
    }

    const updatedPayload = await buildSessionPayload(session.userId, session.activeOrgId, {
      sessionId: session.sessionId,
      mfaVerified: true,
    });
    const newToken = await signToken(updatedPayload);

    await logAuthSecurityEvent({
      userId: session.userId,
      eventType: usedRecovery ? 'mfa_recovery_used' : mfaRow.is_verified ? 'mfa_verified' : 'mfa_enrolled',
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      mfaVerified: true,
      recoveryCodes: generatedRecoveryCodes,
      session: updatedPayload,
      token: newToken,
    });

    setSessionCookie(response, newToken);
    return response;
  } catch (error: any) {
    console.error('MFA verify error:', error);
    return NextResponse.json({ error: 'MFA verification failed' }, { status: 500 });
  }
}
