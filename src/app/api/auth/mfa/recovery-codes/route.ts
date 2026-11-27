import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import { decryptTotpSecret, verifyTotpCode, generateRecoveryCodes } from '@/lib/mfa';
import { getClientMetadata, logAuthSecurityEvent } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session || !session.isPlatformAdmin || !session.mfaVerified) {
      return NextResponse.json(
        { error: 'Forbidden: MFA-verified Platform Owner session required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const code = typeof body?.code === 'string' ? body.code.trim() : '';

    const pool = getDbPool();
    const mfaRes = await pool.query(
      'SELECT secret_encrypted, iv, auth_tag, is_verified FROM user_mfa_secrets WHERE user_id = $1',
      [session.userId]
    );
    if (mfaRes.rows.length === 0 || !mfaRes.rows[0].is_verified) {
      return NextResponse.json({ error: 'MFA is not active on this account.' }, { status: 400 });
    }

    const plainSecret = decryptTotpSecret(
      mfaRes.rows[0].secret_encrypted,
      mfaRes.rows[0].iv,
      mfaRes.rows[0].auth_tag
    );

    if (!verifyTotpCode(plainSecret, code, 1)) {
      return NextResponse.json({ error: 'Invalid authenticator code.' }, { status: 401 });
    }

    await pool.query('DELETE FROM user_mfa_recovery_codes WHERE user_id = $1', [session.userId]);
    const codes = generateRecoveryCodes(8);
    for (const c of codes) {
      await pool.query(
        'INSERT INTO user_mfa_recovery_codes (user_id, code_hash) VALUES ($1, $2)',
        [session.userId, c.hash]
      );
    }

    const { ipAddress, userAgent } = getClientMetadata(req);
    await logAuthSecurityEvent({
      userId: session.userId,
      eventType: 'mfa_recovery_codes_regenerated',
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      recoveryCodes: codes.map((c) => c.plaintext),
    });
  } catch (error: any) {
    console.error('Regenerate recovery codes error:', error);
    return NextResponse.json({ error: 'Failed to regenerate recovery codes' }, { status: 500 });
  }
}
