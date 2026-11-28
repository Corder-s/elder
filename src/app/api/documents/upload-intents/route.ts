import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { enforceStorageQuotaTx } from '@/lib/billing/quota-service';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';
import { validateUploadMetadata } from '@/lib/storage/validation';
import { generatePresignedUploadUrl } from '@/lib/storage/s3-client';
import { sanitizeDocumentRecord } from '@/lib/storage/document-auth';

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'document:upload');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;

    const body = await req.json();

    // Reject forged client-supplied bucket paths or tenant overrides
    if (body.s3Key || body.objectKey || body.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden: Server-generated object keys and session tenant scoping are mandatory' },
        { status: 400 }
      );
    }

    const {
      title,
      documentType = 'general',
      fileName,
      fileSizeBytes,
      mimeType,
      residentId = null,
      rescueCaseId = null,
      isConfidential = false,
    } = body;

    if (!title || String(title).trim().length < 2) {
      return NextResponse.json({ error: 'Document title is required' }, { status: 400 });
    }

    const metaCheck = validateUploadMetadata({
      fileName,
      mimeType,
      declaredSizeBytes: Number(fileSizeBytes),
    });
    if (!metaCheck.valid) {
      return NextResponse.json({ error: metaCheck.error }, { status: 400 });
    }

    const declaredBytes = Number(fileSizeBytes);
    const { ipAddress } = getClientMetadata(req);
    const docId = crypto.randomUUID();
    const serverS3Key = `tenants/${orgId}/documents/${docId}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const txResult = await withTenantContext(orgId, async (client) => {
      // 1. Transactional quota check & reservation
      const quota = await enforceStorageQuotaTx(client, orgId, declaredBytes);
      if (!quota.allowed) {
        return {
          status: 403,
          error: quota.errorMessage || 'Storage quota exceeded',
          quotaExceeded: true,
        };
      }

      // 2. Verify resident / rescue case association & branch ownership
      let resolvedBranchId: string | null = session.branchId || null;

      if (residentId) {
        const resCheck = await client.query(
          'SELECT id, branch_id FROM residents WHERE id = $1 AND is_deleted = false',
          [residentId]
        );
        if (resCheck.rows.length === 0) {
          return { status: 404, error: 'Associated resident not found in this organization' };
        }
        const resBranch = resCheck.rows[0].branch_id;
        if (session.branchId && session.roleSlug !== 'admin' && resBranch && resBranch !== session.branchId) {
          return { status: 403, error: 'Forbidden: Resident belongs to another branch' };
        }
        resolvedBranchId = resBranch || resolvedBranchId;
      }

      if (rescueCaseId) {
        const rcCheck = await client.query(
          'SELECT id, branch_id FROM rescue_cases WHERE id = $1',
          [rescueCaseId]
        );
        if (rcCheck.rows.length === 0) {
          return { status: 404, error: 'Associated rescue case not found in this organization' };
        }
        const rcBranch = rcCheck.rows[0].branch_id;
        if (session.branchId && session.roleSlug !== 'admin' && rcBranch && rcBranch !== session.branchId) {
          return { status: 403, error: 'Forbidden: Rescue case belongs to another branch' };
        }
        resolvedBranchId = rcBranch || resolvedBranchId;
      }

      // 3. Insert pending_upload document with reserved_bytes
      const insRes = await client.query(
        `
        INSERT INTO documents (
          id, organization_id, branch_id, resident_id, rescue_case_id, uploaded_by,
          title, document_type, file_name, file_size_bytes, declared_size_bytes,
          reserved_bytes, mime_type, s3_key, is_confidential,
          document_status, scan_status, upload_expires_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $10,
          $10, $11, $12, $13,
          'pending_upload', 'pending', $14
        )
        RETURNING *;
        `,
        [
          docId,
          orgId,
          resolvedBranchId,
          residentId || null,
          rescueCaseId || null,
          session.userId,
          String(title).trim(),
          String(documentType).trim(),
          metaCheck.sanitizedFileName,
          declaredBytes,
          mimeType,
          serverS3Key,
          Boolean(isConfidential),
          expiresAt,
        ]
      );

      await logTenantAudit(client, {
        organizationId: orgId,
        actorId: session.userId,
        action: 'document_upload_initiated',
        entityName: 'documents',
        entityId: docId,
        newData: {
          fileName: metaCheck.sanitizedFileName,
          mimeType,
          declaredBytes,
          residentId: residentId || null,
          rescueCaseId: rescueCaseId || null,
        },
        ipAddress,
      });

      return { status: 201, doc: insRes.rows[0] };
    });

    if ('error' in txResult) {
      return NextResponse.json(
        { error: txResult.error, quotaExceeded: txResult.quotaExceeded || false },
        { status: txResult.status }
      );
    }

    const presigned = await generatePresignedUploadUrl({
      key: serverS3Key,
      contentType: mimeType,
      expiresInSeconds: 300,
    });

    return NextResponse.json(
      {
        document: sanitizeDocumentRecord(txResult.doc),
        uploadUrl: presigned.url,
        expiresInSeconds: presigned.expiresInSeconds,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/documents/upload-intents error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate upload' }, { status: 500 });
  }
}
