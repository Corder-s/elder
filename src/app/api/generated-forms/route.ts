import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { getClientMetadata } from '@/lib/security';
import { createFormDraftFromJob } from '@/lib/document-intelligence/form-generator';
import { FORM_DEFINITIONS } from '@/lib/document-intelligence/schemas';
import type { FormType } from '@/lib/document-intelligence/types';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'form:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const forms = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        SELECT f.*, d.title AS source_document_title, u.full_name AS created_by_name
        FROM generated_form_drafts f
        LEFT JOIN documents d ON f.source_document_id = d.id
        LEFT JOIN users u ON f.created_by = u.id
        WHERE f.organization_id = $1
        ORDER BY f.created_at DESC
        LIMIT 50;
        `,
        [session.activeOrgId]
      );
      return res.rows;
    });

    return NextResponse.json({ forms, definitions: Object.values(FORM_DEFINITIONS) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'form:draft:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { jobId, formType } = body;
    if (!jobId || !formType || !(formType in FORM_DEFINITIONS)) {
      return NextResponse.json({ error: 'Valid jobId and formType are required' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);
    const draft = await createFormDraftFromJob({
      organizationId: session.activeOrgId!,
      jobId,
      formType: formType as FormType,
      actorUserId: session.userId,
      ipAddress,
    });

    return NextResponse.json({ success: true, form: draft }, { status: 201 });
  } catch (error: any) {
    const msg = error?.message || 'Failed to generate form draft';
    const status = msg.includes('not found') ? 404 : msg.includes('Human approval') ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
