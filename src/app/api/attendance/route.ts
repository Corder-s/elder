import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { withTenantContext } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.activeOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const attendance = await withTenantContext(session.activeOrgId, async (client) => {
      const res = await client.query(`
        SELECT 
          a.id,
          a.date,
          a.status,
          a.notes,
          r.id AS resident_id,
          r.full_name AS resident_name,
          r.resident_number,
          r.room_number,
          r.bed_code
        FROM attendance a
        JOIN residents r ON a.resident_id = r.id
        WHERE a.date = $1
        ORDER BY r.room_number ASC, r.full_name ASC;
      `, [date]);
      return res.rows;
    });

    return NextResponse.json({ attendance, date });
  } catch (error: any) {
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

    const { residentId, date, status, notes } = await req.json();
    if (!residentId || !status) {
      return NextResponse.json({ error: 'Resident ID and status are required' }, { status: 400 });
    }

    const recordDate = date || new Date().toISOString().split('T')[0];

    const record = await withTenantContext(session.activeOrgId, async (client) => {
      const res = await client.query(`
        INSERT INTO attendance (organization_id, resident_id, date, status, recorded_by, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (organization_id, resident_id, date) DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          recorded_by = EXCLUDED.recorded_by
        RETURNING *;
      `, [session.activeOrgId, residentId, recordDate, status, session.userId, notes || null]);
      return res.rows[0];
    });

    return NextResponse.json({ success: true, record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
