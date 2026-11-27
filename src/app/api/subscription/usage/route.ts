import { NextRequest, NextResponse } from 'next/server';
import { getTenantSubscription, checkResidentQuota } from '@/lib/subscriptions';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:subscription:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const orgId = session.activeOrgId!;
    const subscription = await getTenantSubscription(orgId);
    const residentQuota = await checkResidentQuota(orgId);

    const { currentStaff, currentStorageMb } = await withTenantContext(orgId, async (client) => {
      const staffRes = await client.query(`
        SELECT count(*) as count 
        FROM organization_memberships 
        WHERE organization_id = $1 AND status = 'active';
      `, [orgId]);
      const storageRes = await client.query(`
        SELECT COALESCE(SUM(file_size_bytes), 0) as total_bytes
        FROM documents
        WHERE organization_id = $1;
      `, [orgId]);
      return {
        currentStaff: parseInt(staffRes.rows[0].count, 10),
        currentStorageMb: Math.round(parseInt(storageRes.rows[0].total_bytes, 10) / (1024 * 1024)),
      };
    });

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
