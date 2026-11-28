import { NextRequest, NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/rbac';
import { getClientMetadata } from '@/lib/security';
import {
  listTenantExportJobs,
  requestTenantExportJob,
} from '@/lib/export/tenant-export-service';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:data:export');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const jobs = await listTenantExportJobs(session.activeOrgId!);
    return NextResponse.json({ exports: jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'org:data:export');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json().catch(() => ({}));
    const exportFormat = body.exportFormat === 'json' ? 'json' : 'zip';
    const includeDocuments = body.includeDocuments !== false;
    const { ipAddress } = getClientMetadata(req);

    const job = await requestTenantExportJob({
      organizationId: session.activeOrgId!,
      requestedBy: session.userId,
      exportFormat,
      includeDocuments,
      ipAddress,
    });

    return NextResponse.json({ success: true, exportJob: job }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
