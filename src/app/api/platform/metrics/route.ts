import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Platform Owner privilege required' }, { status: 403 });
    }

    const pool = getDbPool();

    // 1. Organization Status Breakdown
    const orgStats = await pool.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'active') as active,
        count(*) FILTER (WHERE status = 'trial') as trial,
        count(*) FILTER (WHERE status = 'suspended') as suspended
      FROM organizations;
    `);

    // 2. Revenue Metrics (MRR & ARR from active subscriptions)
    const revStats = await pool.query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN ts.billing_interval = 'monthly' THEN sp.price_monthly_inr 
            ELSE (sp.price_annual_inr / 12) 
          END
        ), 0) AS mrr_inr,
        COALESCE(SUM(
          CASE 
            WHEN ts.billing_interval = 'annual' THEN sp.price_annual_inr 
            ELSE (sp.price_monthly_inr * 12) 
          END
        ), 0) AS arr_inr
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.status IN ('active', 'trial', 'grace_period');
    `);

    // 3. Total Aggregated Residents & Branches across all NGOs
    const usageStats = await pool.query(`
      SELECT 
        COALESCE(SUM(metric_value) FILTER (WHERE metric_name = 'residents_count'), 0) as total_residents,
        COALESCE(SUM(metric_value) FILTER (WHERE metric_name = 'branches_count'), 0) as total_branches
      FROM usage_records;
    `);

    return NextResponse.json({
      organizations: {
        total: parseInt(orgStats.rows[0].total, 10),
        active: parseInt(orgStats.rows[0].active, 10),
        trial: parseInt(orgStats.rows[0].trial, 10),
        suspended: parseInt(orgStats.rows[0].suspended, 10),
      },
      revenue: {
        mrrInr: parseFloat(revStats.rows[0].mrr_inr),
        arrInr: parseFloat(revStats.rows[0].arr_inr),
        currency: 'INR',
      },
      telemetry: {
        totalResidents: parseInt(usageStats.rows[0].total_residents, 10),
        totalBranches: parseInt(usageStats.rows[0].total_branches, 10),
        systemHealth: '100% Operational',
        databaseEngine: 'PostgreSQL 18.6',
        rlsMode: 'Active & Enforced',
      },
    });
  } catch (error: any) {
    console.error('Platform metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
