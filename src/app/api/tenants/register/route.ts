import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { hashPassword, buildSessionPayload, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orgName,
      orgSlug,
      adminEmail,
      adminPassword,
      adminName,
      adminPhone,
      planSlug = 'starter',
      registrationNumber,
      taxExempt80gNumber,
      darpanId,
      city,
      state,
    } = body;

    // 1. Validate inputs
    if (!orgName || !orgSlug || !adminEmail || !adminPassword || !adminName) {
      return NextResponse.json(
        { error: 'Organization name, subdomain slug, admin email, password, and name are required' },
        { status: 400 }
      );
    }

    const cleanSlug = orgSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (cleanSlug.length < 3 || cleanSlug.length > 50) {
      return NextResponse.json(
        { error: 'Workspace slug must be between 3 and 50 alphanumeric characters' },
        { status: 400 }
      );
    }

    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // 2. Check slug uniqueness
    const slugExists = await pool.query('SELECT id FROM organizations WHERE slug = $1', [cleanSlug]);
    if (slugExists.rows.length > 0) {
      return NextResponse.json(
        { error: `The workspace address "${cleanSlug}.eldercareos.com" is already in use. Please select another.` },
        { status: 409 }
      );
    }

    // 3. Resolve or Create Admin User
    const cleanEmail = adminEmail.toLowerCase().trim();
    let adminUserId: string;

    const userRes = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [cleanEmail]);
    if (userRes.rows.length > 0) {
      adminUserId = userRes.rows[0].id;
    } else {
      const passwordHash = await hashPassword(adminPassword);
      const newUserRes = await pool.query(`
        INSERT INTO users (email, password_hash, full_name, phone, status, email_verified_at)
        VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP)
        RETURNING id;
      `, [cleanEmail, passwordHash, adminName.trim(), adminPhone || null]);
      adminUserId = newUserRes.rows[0].id;
    }

    // 4. Atomically invoke the provisioning stored procedure
    const provRes = await pool.query(`
      SELECT provision_new_ngo_workspace(
        $1, $2, $3, $4, $5, $6, $7
      ) AS organization_id;
    `, [
      orgName.trim(),
      cleanSlug,
      cleanEmail,
      adminPhone || '',
      adminUserId,
      planSlug,
      `${orgName.trim()} Main Facility`,
    ]);

    const orgId = provRes.rows[0].organization_id;

    // 5. Update additional NGO metadata if supplied
    if (registrationNumber || taxExempt80gNumber || darpanId || city || state) {
      await pool.query(`
        UPDATE organizations
        SET
          registration_number = COALESCE($1, registration_number),
          tax_exempt_80g_number = COALESCE($2, tax_exempt_80g_number),
          darpan_id = COALESCE($3, darpan_id),
          city = COALESCE($4, city),
          state = COALESCE($5, state)
        WHERE id = $6;
      `, [registrationNumber || null, taxExempt80gNumber || null, darpanId || null, city || null, state || null, orgId]);
    }

    // 6. Build session for the new NGO workspace
    const sessionPayload = await buildSessionPayload(adminUserId, orgId);
    const token = await signToken(sessionPayload);

    const response = NextResponse.json({
      success: true,
      message: 'NGO workspace provisioned successfully with 14-day full trial',
      organizationId: orgId,
      orgSlug: cleanSlug,
      session: sessionPayload,
      token,
    }, { status: 201 });

    response.cookies.set('eldercare_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('NGO Provisioning error:', error);
    return NextResponse.json({ error: error.message || 'Failed to provision workspace' }, { status: 500 });
  }
}
