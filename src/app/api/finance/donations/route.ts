import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'finance:donation:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const donations = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(`
        SELECT 
          id,
          donor_name,
          donor_email,
          donor_phone,
          donor_pan,
          amount,
          currency,
          receipt_number,
          is_80g_eligible,
          payment_method,
          reference_number,
          received_at,
          status
        FROM donations
        ORDER BY received_at DESC;
      `);
      return res.rows;
    });

    return NextResponse.json({ donations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'finance:donation:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { donorName, donorEmail, donorPhone, donorPan, amount, paymentMethod = 'upi', referenceNumber } = body;

    if (!donorName || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Donor name and valid amount are required' }, { status: 400 });
    }

    const newDonation = await withTenantContext(session.activeOrgId!, async (client) => {
      // Auto-generate 80G receipt number: e.g. 80G-YYYYMM-001
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const countRes = await client.query(`
        SELECT count(*) + 1 AS next_receipt FROM donations;
      `);
      const nextNum = String(countRes.rows[0].next_receipt).padStart(4, '0');
      const receiptNumber = `80G-${yearMonth}-${nextNum}`;

      const res = await client.query(`
        INSERT INTO donations (
          organization_id, donor_name, donor_email, donor_phone, donor_pan,
          amount, currency, receipt_number, is_80g_eligible, payment_method,
          reference_number, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7, true, $8, $9, 'completed')
        RETURNING *;
      `, [
        session.activeOrgId,
        donorName.trim(),
        donorEmail || null,
        donorPhone || null,
        donorPan ? donorPan.toUpperCase().trim() : null,
        parseFloat(amount),
        receiptNumber,
        paymentMethod,
        referenceNumber || null,
      ]);
      return res.rows[0];
    });

    return NextResponse.json({ success: true, donation: newDonation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
