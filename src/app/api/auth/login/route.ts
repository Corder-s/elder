import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { comparePassword, buildSessionPayload, signToken, getUserMemberships } from '@/lib/auth';

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

    const pool = getDbPool();
    const userRes = await pool.query(`
      SELECT id, email, password_hash, full_name, status, is_platform_admin
      FROM users
      WHERE email = $1
    `, [email.toLowerCase().trim()]);

    if (userRes.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = userRes.rows[0];

    if (user.status === 'suspended' || user.status === 'deactivated') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact platform support.' },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Build session
    const sessionPayload = await buildSessionPayload(user.id, organizationId || null);
    const token = await signToken(sessionPayload);
    const memberships = await getUserMemberships(user.id);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        isPlatformAdmin: user.is_platform_admin,
      },
      session: sessionPayload,
      memberships,
      token,
    });

    response.cookies.set('eldercare_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
