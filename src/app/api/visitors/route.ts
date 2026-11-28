import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

function maskIdProof(val: string | null): string | null {
  if (!val) return null;
  const clean = String(val).trim();
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'visitor:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const data = await withTenantContext(session.activeOrgId!, async (client) => {
      let visitQuery = `
        SELECT v.id, v.visitor_id, v.resident_id, v.checked_in_at, v.checked_out_at,
               v.purpose, v.logged_by,
               vis.full_name AS visitor_name, vis.phone AS visitor_phone,
               vis.relationship, vis.id_proof_number,
               r.full_name AS resident_name, r.resident_number,
               u.full_name AS logged_by_name
        FROM visits v
        JOIN visitors vis ON v.visitor_id = vis.id
        LEFT JOIN residents r ON v.resident_id = r.id
        LEFT JOIN users u ON v.logged_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (activeOnly) {
        visitQuery += ' AND v.checked_out_at IS NULL';
      }
      if (search) {
        params.push(`%${search}%`);
        visitQuery += ` AND (LOWER(vis.full_name) LIKE $${params.length} OR LOWER(vis.phone) LIKE $${params.length})`;
      }
      visitQuery += ' ORDER BY v.checked_in_at DESC LIMIT 100';

      const visitsRes = await client.query(visitQuery, params);
      const visits = visitsRes.rows.map((row) => ({
        ...row,
        id_proof_masked: maskIdProof(row.id_proof_number),
        id_proof_number: undefined, // Never expose raw ID proof in list responses
      }));

      const visitorsRes = await client.query(
        `
        SELECT id, full_name, phone, relationship, id_proof_number, created_at
        FROM visitors
        ORDER BY created_at DESC
        LIMIT 100
        `
      );
      const visitors = visitorsRes.rows.map((v) => ({
        ...v,
        id_proof_masked: maskIdProof(v.id_proof_number),
        id_proof_number: undefined,
      }));

      return { visits, visitors };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'visitor:log');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { action = 'check_in', visitId, visitorId, fullName, phone, idProofNumber, relationship, residentId, purpose } = body;
    const { ipAddress } = getClientMetadata(req);

    if (action === 'check_out') {
      if (!visitId) {
        return NextResponse.json({ error: 'visitId is required to check out' }, { status: 400 });
      }
      const res = await withTenantContext(session.activeOrgId!, async (client) => {
        const existing = await client.query('SELECT * FROM visits WHERE id = $1 FOR UPDATE', [visitId]);
        if (existing.rows.length === 0) return { status: 404, error: 'Visit record not found' };
        if (existing.rows[0].checked_out_at) {
          return { status: 409, error: 'Visitor is already checked out' };
        }
        const upd = await client.query(
          `UPDATE visits SET checked_out_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
          [visitId]
        );
        await logTenantAudit(client, {
          organizationId: session.activeOrgId!,
          actorId: session.userId,
          action: 'visitor_checked_out',
          entityName: 'visits',
          entityId: visitId,
          ipAddress,
        });
        return { status: 200, visit: upd.rows[0] };
      });
      if ('error' in res) return NextResponse.json({ error: res.error }, { status: res.status });
      return NextResponse.json({ success: true, visit: res.visit });
    }

    // Check-in (register visitor if visitorId not provided)
    if (!visitorId && (!fullName || !phone)) {
      return NextResponse.json({ error: 'Visitor fullName and phone are required' }, { status: 400 });
    }

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      if (residentId) {
        const resCheck = await client.query('SELECT id FROM residents WHERE id = $1 AND is_deleted = false', [residentId]);
        if (resCheck.rows.length === 0) return { status: 404, error: 'Resident not found in this organization' };
      }

      let resolvedVisitorId = visitorId;
      if (!resolvedVisitorId) {
        const vRes = await client.query(
          `
          INSERT INTO visitors (organization_id, full_name, phone, id_proof_number, relationship)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
          `,
          [session.activeOrgId, String(fullName).trim(), String(phone).trim(), idProofNumber || null, relationship || null]
        );
        resolvedVisitorId = vRes.rows[0].id;
      } else {
        const vCheck = await client.query('SELECT id FROM visitors WHERE id = $1', [resolvedVisitorId]);
        if (vCheck.rows.length === 0) return { status: 404, error: 'Visitor not found in this organization' };
      }

      const visitRes = await client.query(
        `
        INSERT INTO visits (organization_id, visitor_id, resident_id, purpose, logged_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [session.activeOrgId, resolvedVisitorId, residentId || null, purpose || 'Family Visit', session.userId]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'visitor_checked_in',
        entityName: 'visits',
        entityId: visitRes.rows[0].id,
        newData: { visitorId: resolvedVisitorId, residentId: residentId || null },
        ipAddress,
      });

      return { status: 201, visit: visitRes.rows[0] };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, visit: result.visit }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
