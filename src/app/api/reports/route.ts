import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole } from '@/lib/rbac';
import { checkFeatureEntitlement } from '@/lib/billing/entitlements';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['report:read', 'finance:report:generate']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    if (isFamilyRole(session.roleSlug)) {
      return NextResponse.json(
        { error: 'Forbidden: Family members cannot access organization-wide analytics' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return NextResponse.json({ error: 'endDate cannot be earlier than startDate' }, { status: 400 });
    }

    const report = await withTenantContext(session.activeOrgId!, async (client) => {
      const residentsRes = await client.query(`
        SELECT
          count(*) FILTER (WHERE is_deleted = false) AS total,
          count(*) FILTER (WHERE is_deleted = false AND resident_status IN ('active', 'hospitalized', 'temporary_leave')) AS active,
          count(*) FILTER (WHERE is_deleted = false AND resident_status IN ('discharged', 'reunited')) AS discharged
        FROM residents
      `);

      const rescueRes = await client.query(`
        SELECT
          count(*) AS total,
          count(*) FILTER (WHERE status NOT IN ('admitted', 'reunited', 'referred')) AS open_cases,
          count(*) FILTER (WHERE status IN ('admitted', 'reunited', 'referred')) AS resolved_cases
        FROM rescue_cases
      `);

      const facilityRes = await client.query(`
        SELECT
          (SELECT count(*) FROM rooms) AS total_rooms,
          count(*) AS total_beds,
          count(*) FILTER (WHERE status = 'occupied' OR current_resident_id IS NOT NULL) AS occupied_beds,
          count(*) FILTER (WHERE status = 'available' AND current_resident_id IS NULL) AS available_beds
        FROM beds
      `);

      const visitsRes = await client.query(`
        SELECT
          count(*) AS total_visits,
          count(*) FILTER (WHERE checked_out_at IS NULL) AS active_inside
        FROM visits
      `);

      const staffRes = await client.query(`
        SELECT
          count(*) FILTER (WHERE m.status = 'active') AS active_members,
          count(*) FILTER (WHERE m.status = 'active' AND r.slug = 'volunteer') AS volunteers
        FROM organization_memberships m
        JOIN roles r ON m.role_id = r.id
      `);

      // Medical aggregates strictly excluded for Platform Owners
      let medical = null;
      if (!session.isPlatformAdmin && (session.permissions.includes('medical:prescription:read') || session.permissions.includes('attendance:read'))) {
        const medRes = await client.query(`
          SELECT
            count(*) AS total_schedules,
            count(*) FILTER (WHERE status = 'administered') AS administered_doses,
            count(*) FILTER (WHERE status = 'missed') AS missed_doses
          FROM medication_schedules
        `);
        const attRes = await client.query(`
          SELECT
            count(*) FILTER (WHERE date = CURRENT_DATE AND status = 'present') AS present_today
          FROM attendance
        `);
        medical = {
          totalSchedules: parseInt(medRes.rows[0].total_schedules, 10),
          administeredDoses: parseInt(medRes.rows[0].administered_doses, 10),
          missedDoses: parseInt(medRes.rows[0].missed_doses, 10),
          presentToday: parseInt(attRes.rows[0].present_today, 10),
        };
      }

      // Finance aggregates gated by finance permissions
      let finance = null;
      if (session.permissions.includes('finance:donation:read') || session.permissions.includes('finance:expense:read')) {
        const donRes = await client.query(`SELECT COALESCE(SUM(amount), 0) AS total_donations FROM donations WHERE status = 'completed'`);
        const expRes = await client.query(`SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses`);
        const catRes = await client.query(`
          SELECT category, COALESCE(SUM(amount), 0) AS total
          FROM expenses
          GROUP BY category
          ORDER BY total DESC
        `);
        finance = {
          totalDonations: parseFloat(donRes.rows[0].total_donations),
          totalExpenses: parseFloat(expRes.rows[0].total_expenses),
          expensesByCategory: catRes.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) })),
        };
      }

      const advEntitlement = await checkFeatureEntitlement(session.activeOrgId!, 'advanced_reports');

      return {
        residents: {
          total: parseInt(residentsRes.rows[0].total, 10),
          active: parseInt(residentsRes.rows[0].active, 10),
          discharged: parseInt(residentsRes.rows[0].discharged, 10),
        },
        rescue: {
          total: parseInt(rescueRes.rows[0].total, 10),
          open: parseInt(rescueRes.rows[0].open_cases, 10),
          resolved: parseInt(rescueRes.rows[0].resolved_cases, 10),
        },
        facilities: {
          totalRooms: parseInt(facilityRes.rows[0].total_rooms, 10),
          totalBeds: parseInt(facilityRes.rows[0].total_beds, 10),
          occupiedBeds: parseInt(facilityRes.rows[0].occupied_beds, 10),
          availableBeds: parseInt(facilityRes.rows[0].available_beds, 10),
        },
        visitors: {
          totalVisits: parseInt(visitsRes.rows[0].total_visits, 10),
          activeInside: parseInt(visitsRes.rows[0].active_inside, 10),
        },
        staff: {
          activeMembers: parseInt(staffRes.rows[0].active_members, 10),
          volunteers: parseInt(staffRes.rows[0].volunteers, 10),
        },
        medical,
        finance,
        advancedAnalytics: {
          enabled: advEntitlement.allowed,
          reason: advEntitlement.reason,
          planRequired: advEntitlement.allowed ? null : 'Professional or Enterprise',
        },
      };
    });

    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
