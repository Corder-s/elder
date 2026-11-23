import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const pool = getDbPool();
    const query = `
      SELECT 
        o.id,
        o.name,
        o.slug,
        o.primary_email,
        o.primary_phone,
        o.city,
        o.state,
        o.status,
        o.trial_ends_at,
        o.created_at,
        sp.name AS plan_name,
        sp.slug AS plan_slug,
        sp.resident_limit,
        ts.status AS subscription_status,
        ts.billing_interval
      FROM organizations o
      LEFT JOIN tenant_subscriptions ts ON o.id = ts.organization_id
      LEFT JOIN subscription_plans sp ON ts.plan_id = sp.id
      ORDER BY o.created_at DESC;
    `;
    const result = await pool.query(query);

    return NextResponse.json({ organizations: result.rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { organizationId, status } = await req.json();
    if (!organizationId || !['active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Invalid organizationId or status' }, { status: 400 });
    }

    const pool = getDbPool();
    await pool.query('UPDATE organizations SET status = $1 WHERE id = $2', [status, organizationId]);

    // Also update tenant_subscription status
    const subStatus = status === 'active' ? 'active' : 'suspended';
    await pool.query('UPDATE tenant_subscriptions SET status = $1 WHERE organization_id = $2', [subStatus, organizationId]);

    // Log to platform audit logs
    await pool.query(`
      INSERT INTO platform_audit_logs (actor_user_id, target_organization_id, action, resource_type, resource_id, details)
      VALUES ($1, $2, $3, 'organization', $2::text, jsonb_build_object('new_status', $4::text));
    `, [session.userId, organizationId, status === 'active' ? 'organization_activated' : 'organization_suspended', status]);

    return NextResponse.json({ success: true, message: `Organization status updated to ${status}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
