import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { listOrganizationInvoicesAndPayments } from '@/lib/billing/subscription-service';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:subscription:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const data = await listOrganizationInvoicesAndPayments(session.activeOrgId!, limit, offset);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /api/billing/invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
