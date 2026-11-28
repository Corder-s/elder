import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { generateInvoicePdfBuffer } from '@/lib/billing/invoice-service';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'org:subscription:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { id } = await context.params;
    const invoice = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        'SELECT * FROM subscription_invoices WHERE id = $1 AND organization_id = $2',
        [id, session.activeOrgId]
      );
      return res.rows[0] || null;
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const pdfBuffer = generateInvoicePdfBuffer(invoice);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: any) {
    console.error('GET /api/billing/invoices/[id]/pdf error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
