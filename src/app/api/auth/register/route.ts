import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, fullName, phone } = body;

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required' },
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

    // Create user with email_verified_at = NULL (must verify via one-time token)
    const result = await pool.query(
      `
      INSERT INTO users (email, password_hash, full_name, phone, status, email_verified_at)
      VALUES ($1, $2, $3, $4, 'active', NULL)
      RETURNING id, email, full_name, phone, created_at;
      `,
      [cleanEmail, passwordHash, String(fullName).trim(), phone || null]
    );

    const newUser = result.rows[0];

    // Generate cryptographically random verification token & store only its SHA-256 hash
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `
      INSERT INTO user_verification_tokens (user_id, token_type, token_hash, expires_at, ip_address)
      VALUES ($1, 'email_verification', $2, $3, $4)
      `,
      [newUser.id, tokenHash, expiresAt, ipAddress]
    );

    await sendVerificationEmail(newUser.email, newUser.full_name, rawToken);

    await logAuthSecurityEvent({
      userId: newUser.id,
      eventType: 'user_registered',
      ipAddress,
      userAgent,
      details: { emailVerificationSent: true },
    });

    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        message: 'Account created. Please verify your email address using the link sent to your inbox.',
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          phone: newUser.phone,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
