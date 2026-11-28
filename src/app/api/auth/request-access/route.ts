import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { getDbPool, withTenantContext } from '@/lib/db';
import { FORBIDDEN_PUBLIC_ROLES, getAccountTypeById } from '@/lib/role-catalog';

export async function POST(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session || session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { organizationSlug, requestedAccountType = 'staff' } = await req.json();
    const cleanSlug = typeof organizationSlug === 'string' ? organizationSlug.toLowerCase().trim() : '';
    const cleanType = typeof requestedAccountType === 'string' ? requestedAccountType.toLowerCase().trim() : '';

    if (!cleanSlug) {
      return NextResponse.json({ error: 'Organization code / slug is required' }, { status: 400 });
    }
    if (FORBIDDEN_PUBLIC_ROLES.has(cleanType)) {
      return NextResponse.json({ error: 'Forbidden role requested' }, { status: 403 });
    }
    const acctType = getAccountTypeById(cleanType);
    if (!acctType) {
      return NextResponse.json({ error: 'Invalid requested role' }, { status: 400 });
    }

    const pool = getDbPool();
    const orgRes = await pool.query(
      'SELECT id, name, allow_access_requests, status FROM organizations WHERE slug = $1',
      [cleanSlug]
    );
    if (orgRes.rows.length === 0) {
      return NextResponse.json({ error: 'Organization not found for the provided code' }, { status: 404 });
    }
    const org = orgRes.rows[0];
    if (org.status === 'suspended') {
      return NextResponse.json({ error: 'This organization is currently suspended' }, { status: 403 });
    }
    if (org.allow_access_requests === false) {
      return NextResponse.json(
        { error: 'This organization only accepts onboarding via NGO Administrator invitation.' },
        { status: 403 }
      );
    }

    await withTenantContext(org.id, async (client) => {
      await client.query(
        `
        INSERT INTO registration_requests (user_id, organization_id, requested_account_type, status)
        VALUES ($1, $2, $3, 'pending_approval')
        ON CONFLICT (user_id, organization_id)
        DO UPDATE SET requested_account_type = EXCLUDED.requested_account_type,
                      status = 'pending_approval',
                      updated_at = CURRENT_TIMESTAMP;
        `,
        [session.userId, org.id, acctType.id]
      );
    });

    return NextResponse.json({
      success: true,
      organizationName: org.name,
      requestedAccountType: acctType.name,
      status: 'pending_approval',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit access request' }, { status: 500 });
  }
}
