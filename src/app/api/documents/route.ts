import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission, isFamilyRole, getFamilyResidentLinks } from '@/lib/rbac';
import { enforceStorageQuotaTx } from '@/lib/billing/quota-service';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, ['document:read', 'family:resident:view_own']);
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const orgId = session.activeOrgId!;
    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get('residentId');

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
        return NextResponse.json({ documents: [] });
      }
    }

    const canViewConfidential = ['admin', 'doctor', 'accountant'].includes(session.roleSlug || '');

    const documents = await withTenantContext(orgId, async (client) => {
      let query = `
        SELECT 
          d.id,
          d.title,
          d.document_type,
          d.file_name,
          d.file_size_bytes,
          d.mime_type,
          d.s3_key,
          d.is_confidential,
          d.created_at,
          r.full_name AS resident_name,
          u.full_name AS uploader_name
        FROM documents d
        LEFT JOIN residents r ON d.resident_id = r.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (residentId) {
        params.push(residentId);
        query += ` AND d.resident_id = $${params.length}`;
      }
      if (linkedIds) {
        params.push(linkedIds);
        query += ` AND d.resident_id = ANY($${params.length}::uuid[])`;
      }
      if (!canViewConfidential) {
        params.push(session.userId);
        query += ` AND (d.is_confidential = false OR d.uploaded_by = $${params.length})`;
      }
      query += ` ORDER BY d.created_at DESC;`;

      const res = await client.query(query, params);
      return res.rows;
    });

    return NextResponse.json({ documents });
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

    // Tenant-isolated S3 key structure: tenants/{orgId}/documents/{uuid}-{fileName}
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

      const res = await client.query(`
        INSERT INTO documents (
          organization_id, resident_id, uploaded_by, title, document_type,
          file_name, file_size_bytes, mime_type, s3_key, is_confidential
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `, [
        safeOrgId,
        residentId || null,
        session.userId,
        title.trim(),
        documentType || 'general',
        cleanFileName,
        safeSizeBytes,
        mimeType,
        s3Key,
        isConfidential,
      ]);

      // Update storage usage counter
      await client.query(`
        UPDATE usage_records
        SET metric_value = metric_value + $1
        WHERE organization_id = $2 AND metric_name = 'storage_bytes';
      `, [safeSizeBytes, safeOrgId]);

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

    const newDoc = result.document;

    return NextResponse.json({ success: true, document: newDoc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
