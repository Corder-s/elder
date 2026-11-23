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
    const residentId = searchParams.get('residentId');

    const records = await withTenantContext(session.activeOrgId, async (client) => {
      let query = `
        SELECT 
          m.id,
          m.record_date,
          m.record_type,
          m.diagnosis,
          m.clinical_notes,
          m.follow_up_date,
          m.created_at,
          r.id AS resident_id,
          r.full_name AS resident_name,
          r.resident_number,
          u.full_name AS doctor_name
        FROM medical_records m
        JOIN residents r ON m.resident_id = r.id
        LEFT JOIN users u ON m.doctor_id = u.id
      `;
      const params: any[] = [];
      if (residentId) {
        params.push(residentId);
        query += ` WHERE m.resident_id = $1`;
      }
      query += ` ORDER BY m.record_date DESC, m.created_at DESC;`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return NextResponse.json({ records });
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

    // Role check: Only Doctor, Nurse, or Admin can write medical records
    if (!['doctor', 'nurse', 'admin'].includes(session.roleSlug || '') && !session.isPlatformAdmin) {
      return NextResponse.json({ error: 'Forbidden: Medical record creation restricted to clinicians' }, { status: 403 });
    }

    const body = await req.json();
    const { residentId, diagnosis, clinicalNotes, followUpDate, recordType = 'consultation' } = body;

    if (!residentId || !diagnosis) {
      return NextResponse.json({ error: 'Resident ID and diagnosis are required' }, { status: 400 });
    }

    const newRecord = await withTenantContext(session.activeOrgId, async (client) => {
      const res = await client.query(`
        INSERT INTO medical_records (
          organization_id, resident_id, doctor_id, diagnosis, clinical_notes, follow_up_date, record_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
      `, [
        session.activeOrgId,
        residentId,
        session.userId,
        diagnosis.trim(),
        clinicalNotes || null,
        followUpDate || null,
        recordType,
      ]);
      return res.rows[0];
    });

    return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
