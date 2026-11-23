import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { hashPassword, buildSessionPayload, signToken } from '@/lib/auth';

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

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone, status, email_verified_at)
      VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP)
      RETURNING id, email, full_name, phone, created_at;
    `, [email.toLowerCase().trim(), passwordHash, fullName.trim(), phone || null]);

    const newUser = result.rows[0];

    // Build initial session
    const sessionPayload = await buildSessionPayload(newUser.id);
    const token = await signToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        phone: newUser.phone,
      },
      session: sessionPayload,
      token,
    }, { status: 201 });

    response.cookies.set('eldercare_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
