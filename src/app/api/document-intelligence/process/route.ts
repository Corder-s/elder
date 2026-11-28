import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { getClientMetadata } from '@/lib/security';
import { enqueueDocumentProcessingJob } from '@/lib/document-intelligence/processing-pipeline';

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'document:process');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { documentId, forceReprocess = false } = body;

    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);
    const result = await enqueueDocumentProcessingJob({
      organizationId: session.activeOrgId!,
      documentId,
      requestedBy: session.userId,
      forceReprocess: Boolean(forceReprocess),
      ipAddress,
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error, quotaExceeded: Boolean(result.quotaExceeded) },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { idempotent: result.idempotent, job: result.job },
      { status: result.status }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to enqueue processing' }, { status: 500 });
  }
}
