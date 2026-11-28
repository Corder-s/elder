import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';
import { enforceStorageQuotaTx } from '@/lib/billing/quota-service';
import { sanitizeDocumentRecord } from '@/lib/storage/document-auth';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['document:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const orgId = session.activeOrgId!;
    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get('residentId');
    const rescueCaseId = searchParams.get('rescueCaseId');
    const documentType = searchParams.get('documentType');
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.trim() || '';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const familyMode = isFamilyRole(session.roleSlug);
    let linkedIds: string[] | null = null;
    if (familyMode) {
      const links = await getFamilyResidentLinks(orgId, session.userId);
      linkedIds = links.map((l) => l.residentId);
      if (residentId && !linkedIds.includes(residentId)) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot access documents for this resident' },
          { status: 403 }
        );
      }
      if (linkedIds.length === 0) {
        return NextResponse.json({ documents: [], total: 0 });
      }
    }

    const canViewConfidential = ['admin', 'doctor', 'accountant'].includes(session.roleSlug || '');

    const { rows, total } = await withTenantContext(orgId, async (client) => {
      const conditions: string[] = ['d.is_deleted = false'];
      const params: any[] = [];

      if (session.branchId && session.roleSlug !== 'admin') {
        params.push(session.branchId);
        conditions.push(`(d.branch_id IS NULL OR d.branch_id = $${params.length})`);
      }
      if (residentId) {
        params.push(residentId);
        conditions.push(`d.resident_id = $${params.length}`);
      }
      if (rescueCaseId) {
        params.push(rescueCaseId);
        conditions.push(`d.rescue_case_id = $${params.length}`);
      }
      if (documentType && documentType !== 'all') {
        params.push(documentType);
        conditions.push(`d.document_type = $${params.length}`);
      }
      if (status && status !== 'all') {
        params.push(status);
        conditions.push(`d.document_status = $${params.length}`);
      } else {
        conditions.push(`d.document_status <> 'rejected'`);
      }
      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(d.title ILIKE $${params.length} OR d.file_name ILIKE $${params.length})`);
      }
      if (linkedIds) {
        params.push(linkedIds);
        conditions.push(`d.resident_id = ANY($${params.length}::uuid[])`);
      }
      if (!canViewConfidential) {
        params.push(session.userId);
        conditions.push(`(d.is_confidential = false OR d.uploaded_by = $${params.length})`);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;
      const countRes = await client.query(
        `SELECT count(*)::int AS total FROM documents d ${whereClause}`,
        params
      );

      params.push(limit, offset);
      const res = await client.query(
        `
        SELECT d.*, r.full_name AS resident_name, u.full_name AS uploader_name
        FROM documents d
        LEFT JOIN residents r ON d.resident_id = r.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length};
        `,
        params
      );

      return { rows: res.rows, total: countRes.rows[0]?.total || 0 };
    });

    return NextResponse.json({
      documents: rows.map(sanitizeDocumentRecord),
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'document:upload');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const body = await req.json();
    const { title, documentType, fileName, fileSizeBytes, mimeType, residentId, isConfidential = false } = body;

    if (!title || !fileName || !mimeType) {
      return NextResponse.json({ error: 'Title, file name, and MIME type are required' }, { status: 400 });
    }

    const safeOrgId = session.activeOrgId!;
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `tenants/${safeOrgId}/documents/${timestamp}_${cleanFileName}`;
    const safeSizeBytes = Math.max(0, Number(fileSizeBytes || 1024));

    const result = await withTenantContext(safeOrgId, async (client) => {
      const quota = await enforceStorageQuotaTx(client, safeOrgId, safeSizeBytes);
      if (!quota.allowed) {
        return { quotaError: quota };
      }

      const res = await client.query(
        `
        INSERT INTO documents (
          organization_id, branch_id, resident_id, uploaded_by, title, document_type,
          file_name, file_size_bytes, mime_type, s3_key, is_confidential
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *;
        `,
        [
          safeOrgId,
          session.branchId || null,
          residentId || null,
          session.userId,
          title.trim(),
          documentType || 'general',
          cleanFileName,
          safeSizeBytes,
          mimeType,
          s3Key,
          isConfidential,
        ]
      );

      await client.query(
        `
        UPDATE usage_records
        SET metric_value = metric_value + $1
        WHERE organization_id = $2 AND metric_name = 'storage_bytes';
        `,
        [safeSizeBytes, safeOrgId]
      );

      return { document: res.rows[0] };
    });

    if ('quotaError' in result && result.quotaError) {
      return NextResponse.json(
        {
          error: result.quotaError.errorMessage,
          quotaExceeded: result.quotaError.warningLevel === 'blocked_100',
          currentCount: result.quotaError.currentCount,
          limit: result.quotaError.limit,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, document: sanitizeDocumentRecord(result.document) }, { status: 201 });
  } catch (error: any) {
    console.error('Upload document error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
