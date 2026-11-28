import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';
import { enforceResidentQuotaTx } from '@/lib/billing/quota-service';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['resident:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const orgId = session.activeOrgId!;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const familyMode = isFamilyRole(session.roleSlug);
    let linkedIds: string[] | null = null;
    if (familyMode) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      linkedIds = links.map((l) => l.residentId);
      if (linkedIds.length === 0) {
        return NextResponse.json({ residents: [] });
      }
    }

    const residents = await withTenantContext(orgId, async (client) => {
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

      if (linkedIds) {
        params.push(linkedIds);
        query += ` AND id = ANY($${params.length}::uuid[])`;
      }

      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        query += ` AND (branch_id = $${params.length} OR branch_id IS NULL)`;
      }

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
    const authz = await requireTenantPermission(req, 'resident:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const orgId = session.activeOrgId!;

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

    // 1. Transactional Quota Enforcement + Insert Resident within Tenant Transaction
    const txResult = await withTenantContext(orgId, async (client) => {
      const quota = await enforceResidentQuotaTx(client, orgId);
      if (!quota.allowed) {
        return {
          quotaError: {
            error: quota.errorMessage,
            quotaExceeded: quota.warningLevel === 'blocked_100',
            currentCount: quota.currentCount,
            limit: quota.limit,
          },
        };
      }

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

      return { resident: res.rows[0] };
    });

    if ('quotaError' in txResult && txResult.quotaError) {
      return NextResponse.json(txResult.quotaError, { status: 403 });
    }

    return NextResponse.json({ success: true, resident: txResult.resident }, { status: 201 });
  } catch (error: any) {
    console.error('Create resident error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
