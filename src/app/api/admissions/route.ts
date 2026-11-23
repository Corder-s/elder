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

    const admissions = await withTenantContext(session.activeOrgId, async (client) => {
      const res = await client.query(`
        SELECT 
          a.id,
          a.admission_number,
          a.admission_type,
          a.admitted_at,
          a.room_number,
          a.bed_code,
          a.initial_condition_notes,
          r.id AS resident_id,
          r.full_name AS resident_name,
          r.resident_number
        FROM admissions a
        JOIN residents r ON a.resident_id = r.id
        ORDER BY a.admitted_at DESC;
      `);
      return res.rows;
    });

    return NextResponse.json({ admissions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
