import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { withTenantContext, getDbPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.activeOrgId) {
      return NextResponse.json({ error: 'Unauthorized: No active organization workspace' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const residents = await withTenantContext(session.activeOrgId, async (client) => {
      let query = `
        SELECT 
          id,
          resident_number,
          full_name,
          preferred_name,
          date_of_birth,
          age_estimate,
          gender,
          profile_photo_url,
          identity_status,
          resident_status,
          admitted_at,
          room_number,
          bed_code,
          primary_diagnosis,
          emergency_contact,
          created_at
        FROM residents
        WHERE is_deleted = false
      `;
      const params: any[] = [];

      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        query += ` AND (LOWER(full_name) LIKE $${params.length} OR LOWER(resident_number) LIKE $${params.length})`;
      }

      if (status && status !== 'all') {
        params.push(status.toLowerCase());
        query += ` AND LOWER(resident_status) = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, params);
      return result.rows;
    });

    return NextResponse.json({ residents });
  } catch (error: any) {
    console.error('Fetch residents error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.activeOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Permission check
    if (!session.permissions.includes('resident:create') && session.roleSlug !== 'admin' && !session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to admit resident' }, { status: 403 });
    }

    const body = await req.json();
    const {
      fullName,
      gender,
      ageEstimate,
      roomNumber,
      bedCode,
      primaryDiagnosis,
      emergencyContact,
    } = body;

    if (!fullName || !gender) {
      return NextResponse.json({ error: 'Full name and gender are required' }, { status: 400 });
    }

    const pool = getDbPool();

    // 1. Quota Enforcement: Check subscription limits
    const subRes = await pool.query(`
      SELECT sp.resident_limit, ts.status AS sub_status
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.organization_id = $1;
    `, [session.activeOrgId]);

    if (subRes.rows.length > 0) {
      const { resident_limit, sub_status } = subRes.rows[0];

      // Healthcare Safety: Suspended accounts cannot add new residents
      if (sub_status === 'suspended') {
        return NextResponse.json({
          error: 'Subscription suspended. Read-only healthcare safety mode is active. Cannot admit new residents.',
        }, { status: 403 });
      }

      // Check current active resident count
      const countRes = await pool.query(`
        SELECT count(*) as count 
        FROM residents 
        WHERE organization_id = $1 AND is_deleted = false AND resident_status IN ('active', 'hospitalized', 'temporary_leave');
      `, [session.activeOrgId]);

      const currentCount = parseInt(countRes.rows[0].count, 10);
      if (currentCount >= resident_limit) {
        return NextResponse.json({
          error: `Resident quota reached (${currentCount}/${resident_limit}). Please upgrade your subscription plan to admit more residents.`,
          quotaExceeded: true,
          currentCount,
          limit: resident_limit,
        }, { status: 403 });
      }
    }

    // 2. Insert Resident within Tenant Transaction
    const newResident = await withTenantContext(session.activeOrgId, async (client) => {
      // Auto-generate resident number
      const numRes = await client.query(`
        SELECT COALESCE(MAX(SUBSTRING(resident_number FROM '[0-9]+')::integer), 0) + 1 AS next_num
        FROM residents;
      `);
      const nextNum = numRes.rows[0].next_num;
      const residentNumber = `RES-${String(nextNum).padStart(3, '0')}`;

      const res = await client.query(`
        INSERT INTO residents (
          organization_id,
          resident_number,
          full_name,
          age_estimate,
          gender,
          resident_status,
          room_number,
          bed_code,
          primary_diagnosis,
          emergency_contact,
          admitted_at
        ) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *;
      `, [
        session.activeOrgId,
        residentNumber,
        fullName.trim(),
        ageEstimate || null,
        gender.toLowerCase(),
        roomNumber || null,
        bedCode || null,
        primaryDiagnosis || null,
        emergencyContact ? JSON.stringify(emergencyContact) : null,
      ]);

      // Update usage records counter
      await client.query(`
        UPDATE usage_records 
        SET metric_value = metric_value + 1 
        WHERE organization_id = $1 AND metric_name = 'residents_count';
      `, [session.activeOrgId]);

      return res.rows[0];
    });

    return NextResponse.json({ success: true, resident: newResident }, { status: 201 });
  } catch (error: any) {
    console.error('Create resident error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
