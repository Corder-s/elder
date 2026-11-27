import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import {
  comparePassword,
  createServerSession,
  getUserMemberships,
  setSessionCookie,
} from '@/lib/auth';
import {
  checkRateLimit,
  recordRateLimitHit,
  resetRateLimit,
  getClientMetadata,
  logAuthSecurityEvent,
} from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, organizationId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const { ipAddress, userAgent, deviceName } = getClientMetadata(req);

    // 1. Per-IP and Per-Account Rate Limiting
    const ipLimit = await checkRateLimit(`login:ip:${ipAddress}`, 20, 15);
    if (!ipLimit.allowed) {
      await logAuthSecurityEvent({
        eventType: 'rate_limited',
        ipAddress,
        userAgent,
        details: { scope: 'login_ip', email: cleanEmail },
      });
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }

    const acctLimit = await checkRateLimit(`login:acct:${cleanEmail}`, 5, 15);
    if (!acctLimit.allowed) {
      await logAuthSecurityEvent({
        eventType: 'login_locked',
        ipAddress,
        userAgent,
        details: { email: cleanEmail, retryAfterSeconds: acctLimit.retryAfterSeconds },
      });
      return NextResponse.json(
        { error: 'Too many failed login attempts. Account temporarily locked. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(acctLimit.retryAfterSeconds) } }
      );
    }

    const pool = getDbPool();
    const userRes = await pool.query(
      `
      SELECT id, email, password_hash, full_name, status, is_platform_admin,
             email_verified_at, mfa_enabled, failed_login_attempts, locked_until
      FROM users
      WHERE email = $1
      `,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      await recordRateLimitHit(`login:ip:${ipAddress}`, 20, 15, 5);
      await recordRateLimitHit(`login:acct:${cleanEmail}`, 5, 15, 5);
      await logAuthSecurityEvent({
        eventType: 'login_failure',
        ipAddress,
        userAgent,
        details: { email: cleanEmail, reason: 'invalid_credentials' },
      });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    // Check temporary account lockout
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      const retryAfter = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Account temporarily locked due to repeated failed attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      await recordRateLimitHit(`login:ip:${ipAddress}`, 20, 15, 5);
      const acctHit = await recordRateLimitHit(`login:acct:${cleanEmail}`, 5, 15, 5);

      await pool.query(
        `
        UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE
              WHEN failed_login_attempts + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '5 minutes'
              ELSE locked_until
            END
        WHERE id = $1
        `,
        [user.id]
      );

      await logAuthSecurityEvent({
        userId: user.id,
        eventType: acctHit.blockedUntil ? 'login_locked' : 'login_failure',
        ipAddress,
        userAgent,
        details: { reason: 'invalid_credentials', attemptCount: acctHit.attemptCount },
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Account suspension check (only after password verified)
    if (user.status === 'suspended' || user.status === 'deactivated') {
      await logAuthSecurityEvent({
        userId: user.id,
        eventType: 'login_failure',
        ipAddress,
        userAgent,
        details: { reason: 'account_suspended' },
      });
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact platform support.' },
        { status: 403 }
      );
    }

    // Email verification check
    if (!user.email_verified_at) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before signing in.',
          requiresVerification: true,
        },
        { status: 403 }
      );
    }

    // Reset failure counters on valid password
    await resetRateLimit(`login:acct:${cleanEmail}`);
    await pool.query(
      `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP,
          failed_login_attempts = 0,
          locked_until = NULL
      WHERE id = $1
      `,
      [user.id]
    );

    // Create server-side session
    // For Platform Admins, mfaVerified starts false until they complete TOTP verification (or enroll if not yet enrolled)
    const { sessionId, token, payload } = await createServerSession({
      userId: user.id,
      targetOrgId: organizationId || null,
      ipAddress,
      userAgent,
      deviceName,
      mfaVerified: false,
    });

    const memberships = await getUserMemberships(user.id);

    await logAuthSecurityEvent({
      userId: user.id,
      organizationId: payload.activeOrgId,
      eventType: 'login_success',
      ipAddress,
      userAgent,
      details: {
        sessionId,
        isPlatformAdmin: user.is_platform_admin,
        mfaRequired: Boolean(user.is_platform_admin && user.mfa_enabled),
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isPlatformAdmin: user.is_platform_admin,
        mfaEnabled: Boolean(user.mfa_enabled),
      },
      mfaRequired: Boolean(user.is_platform_admin && user.mfa_enabled),
      mfaSetupRequired: Boolean(user.is_platform_admin && !user.mfa_enabled),
      session: payload,
      memberships,
      token,
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
