import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, withTenantContext } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import {
  generateSecureToken,
  hashToken,
  validatePasswordStrength,
  getClientMetadata,
  checkRateLimit,
  recordRateLimitHit,
  logAuthSecurityEvent,
} from '@/lib/security';
import { sendVerificationEmail } from '@/lib/email';
import { FORBIDDEN_PUBLIC_ROLES, getAccountTypeById } from '@/lib/role-catalog';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      fullName,
      phone,
      requestedAccountType = 'staff',
      organizationSlug = '',
    } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
        { status: 400 }
      );
    }

    const cleanType = String(requestedAccountType).toLowerCase().trim();
    if (FORBIDDEN_PUBLIC_ROLES.has(cleanType)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin / Platform Owner accounts cannot be registered publicly.' },
        { status: 403 }
      );
    }

    const accountType = getAccountTypeById(cleanType);
    if (!accountType) {
      return NextResponse.json(
        { error: `Invalid account type "${requestedAccountType}".` },
        { status: 400 }
      );
    }

    const { ipAddress, userAgent } = getClientMetadata(req);
    const ipLimit = await checkRateLimit(`register:ip:${ipAddress}`, 10, 15);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
      );
    }
    await recordRateLimitHit(`register:ip:${ipAddress}`, 10, 15, 5);

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json({ error: strength.error }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const pool = getDbPool();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create user with email_verified_at = NULL and is_platform_admin = false ALWAYS
    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, full_name, phone, is_platform_admin, status, email_verified_at)
      VALUES ($1, $2, $3, $4, false, 'active', NULL)
      RETURNING id, email, full_name, phone, created_at;
      `,
      [cleanEmail, passwordHash, String(fullName).trim(), phone || null]
    );

    const newUser = result.rows[0];

    // If an NGO slug was provided, create a PENDING_APPROVAL registration request (never grants role/permissions)
    let accountStatus: 'pending_approval' | 'invitation_required' = 'invitation_required';
    let targetOrgName: string | null = null;

    if (organizationSlug && String(organizationSlug).trim()) {
      const orgRes = await pool.query(
        'SELECT id, name, allow_access_requests FROM organizations WHERE slug = $1',
        [String(organizationSlug).toLowerCase().trim()]
      );
      if (orgRes.rows.length > 0) {
        const org = orgRes.rows[0];
        if (org.allow_access_requests === false) {
          await pool.query('DELETE FROM users WHERE id = $1', [newUser.id]);
          return NextResponse.json(
            { error: 'This organization only accepts onboarding via NGO Administrator invitation.' },
            { status: 403 }
          );
        }
        targetOrgName = org.name;
        await withTenantContext(org.id, async (client) => {
          await client.query(
            `
            INSERT INTO registration_requests (user_id, organization_id, requested_account_type, status)
            VALUES ($1, $2, $3, 'pending_approval')
            ON CONFLICT (user_id, organization_id) DO NOTHING;
            `,
            [newUser.id, org.id, accountType.id]
          );
        });
        accountStatus = 'pending_approval';
      }
    }

    // Generate cryptographically random verification token & store only its SHA-256 hash
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO user_verification_tokens (user_id, token_type, token_hash, expires_at, ip_address)
      VALUES ($1, 'email_verification', $2, $3, $4)
      `,
      [newUser.id, tokenHash, expiresAt, ipAddress]
    );

    const emailResult = await sendVerificationEmail(newUser.email, newUser.full_name, rawToken);

    await logAuthSecurityEvent({
      userId: newUser.id,
      eventType: 'user_registered',
      ipAddress,
      userAgent,
      details: {
        emailVerificationSent: emailResult.dispatched,
        emailMode: emailResult.mode,
        requestedAccountType: accountType.id,
        accountStatus,
      },
    });

    const exposeLocalToken =
      process.env.NODE_ENV !== 'production' ||
      (emailResult.mode === 'dev_sink' && process.env.EMAIL_TEST_CAPTURE !== 'true');

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful. Please verify your email address. An NGO Administrator must approve your role before workspace access is granted.',
        user: newUser,
        requestedAccountType: accountType.id,
        accountStatus,
        organizationName: targetOrgName,
        requiresVerification: true,
        requiresEmailVerification: true,
        ...(exposeLocalToken ? { devVerificationToken: rawToken } : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
