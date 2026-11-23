import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getTenantSubscription, checkResidentQuota } from '@/lib/subscriptions';
import { getDbPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.activeOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.activeOrgId;
    const subscription = await getTenantSubscription(orgId);
    const residentQuota = await checkResidentQuota(orgId);

    const pool = getDbPool();

    // Staff count
    const staffRes = await pool.query(`
      SELECT count(*) as count 
      FROM organization_memberships 
      WHERE organization_id = $1 AND status = 'active';
    `, [orgId]);
    const currentStaff = parseInt(staffRes.rows[0].count, 10);

    // Storage bytes
    const storageRes = await pool.query(`
      SELECT COALESCE(SUM(file_size_bytes), 0) as total_bytes
      FROM documents
      WHERE organization_id = $1;
    `, [orgId]);
    const currentStorageMb = Math.round(parseInt(storageRes.rows[0].total_bytes, 10) / (1024 * 1024));

    return NextResponse.json({
      subscription,
      quotas: {
        residents: {
          current: residentQuota.currentCount,
          limit: residentQuota.limit,
          percentage: residentQuota.utilizationPercentage,
          warningLevel: residentQuota.warningLevel,
        },
        staff: {
          current: currentStaff,
          limit: subscription.staffLimit,
          percentage: Math.round((currentStaff / subscription.staffLimit) * 100),
        },
        storage: {
          currentMb: currentStorageMb,
          limitMb: subscription.storageLimitMb,
          percentage: Math.round((currentStorageMb / subscription.storageLimitMb) * 100),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
