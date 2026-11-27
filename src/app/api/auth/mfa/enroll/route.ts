import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import {
  generateTotpSecret,
  encryptTotpSecret,
  generateMfaQrDataUrl,
} from '@/lib/mfa';
import { getClientMetadata, logAuthSecurityEvent } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: MFA enrollment is restricted to Platform Owner accounts.' },
        { status: 403 }
      );
    }

    const pool = getDbPool();
    const userRes = await pool.query(
      'SELECT id, email, mfa_enabled FROM users WHERE id = $1',
      [session.userId]
    );
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If already enrolled, require MFA verification before re-enrolling
    if (userRes.rows[0].mfa_enabled && !session.mfaVerified) {
      return NextResponse.json(
        { error: 'Verify existing MFA before re-enrolling.' },
        { status: 403 }
      );
    }

    const plainSecret = generateTotpSecret(20);
    const { secretEncrypted, iv, authTag } = encryptTotpSecret(plainSecret);
    const { otpauthUrl, qrDataUrl } = await generateMfaQrDataUrl(userRes.rows[0].email, plainSecret);

    await pool.query(
      `
      INSERT INTO user_mfa_secrets (user_id, secret_encrypted, iv, auth_tag, is_verified, verified_at)
      VALUES ($1, $2, $3, $4, false, NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        secret_encrypted = EXCLUDED.secret_encrypted,
        iv = EXCLUDED.iv,
        auth_tag = EXCLUDED.auth_tag,
        is_verified = false,
        verified_at = NULL,
        updated_at = CURRENT_TIMESTAMP;
      `,
      [session.userId, secretEncrypted, iv, authTag]
    );

    const { ipAddress, userAgent } = getClientMetadata(req);
    await logAuthSecurityEvent({
      userId: session.userId,
      eventType: 'mfa_enrollment_started',
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      qrDataUrl,
      otpauthUrl,
      manualSecret: plainSecret,
    });
  } catch (error: any) {
    console.error('MFA enroll error:', error);
    return NextResponse.json({ error: 'Failed to initiate MFA enrollment' }, { status: 500 });
  }
}
