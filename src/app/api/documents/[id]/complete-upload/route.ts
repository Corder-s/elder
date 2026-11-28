import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { enforceStorageQuotaTx } from '@/lib/billing/quota-service';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';
import {
  headStorageObject,
  getStorageObjectBuffer,
  deleteStorageObject,
} from '@/lib/storage/s3-client';
import {
  getMaxDocumentSizeBytes,
  validateMagicSignature,
  computeSha256Hex,
  evaluateMalwareScan,
} from '@/lib/storage/validation';
import { sanitizeDocumentRecord } from '@/lib/storage/document-auth';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'document:upload');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const orgId = session.activeOrgId!;
    const { id } = await context.params;
    const { ipAddress } = getClientMetadata(req);

    // 1. Pre-check & lock metadata inside tenant context
    const prep = await withTenantContext(orgId, async (client) => {
      const res = await client.query('SELECT * FROM documents WHERE id = $1 FOR UPDATE', [id]);
      if (res.rows.length === 0 || res.rows[0].is_deleted) {
        return { status: 404, error: 'Document not found' };
      }
      const doc = res.rows[0];
      if (doc.uploaded_by !== session.userId && session.roleSlug !== 'admin') {
        return { status: 403, error: 'Forbidden: Only uploader or admin can complete upload' };
      }
      if (
        (doc.document_status === 'available' || doc.document_status === 'pending_scan') &&
        doc.uploaded_completed_at
      ) {
        return { status: 200, alreadyCompleted: true, doc };
      }
      if (doc.document_status !== 'pending_upload') {
        return { status: 409, error: `Cannot complete upload in state "${doc.document_status}"` };
      }
      if (doc.upload_expires_at && new Date(doc.upload_expires_at) < new Date()) {
        await client.query(
          `UPDATE documents SET document_status = 'rejected', reserved_bytes = 0 WHERE id = $1`,
          [id]
        );
        return { status: 410, error: 'Upload intent has expired; storage reservation released' };
      }
      return { status: 100, doc };
    });

    if (prep.status !== 100) {
      if ('alreadyCompleted' in prep && prep.alreadyCompleted) {
        return NextResponse.json({
          alreadyCompleted: true,
          document: sanitizeDocumentRecord(prep.doc),
        });
      }
      return NextResponse.json({ error: prep.error }, { status: prep.status });
    }

    const doc = prep.doc;

    // 2. Verify actual object in private S3 storage
    const head = await headStorageObject(doc.s3_key);
    if (!head.exists || head.contentLength <= 0) {
      return NextResponse.json(
        { error: 'Uploaded object not found or empty in private storage' },
        { status: 400 }
      );
    }

    const maxBytes = getMaxDocumentSizeBytes();
    if (head.contentLength > maxBytes) {
      await deleteStorageObject(doc.s3_key).catch(() => {});
      await withTenantContext(orgId, async (client) => {
        await client.query(
          `UPDATE documents SET document_status = 'rejected', reserved_bytes = 0 WHERE id = $1`,
          [id]
        );
      });
      return NextResponse.json(
        { error: `Uploaded object (${head.contentLength} bytes) exceeds max limit (${maxBytes} bytes)` },
        { status: 400 }
      );
    }

    // 3. Download object bytes to verify magic-byte signature & SHA-256 checksum
    const objBuffer = await getStorageObjectBuffer(doc.s3_key);
    const actualSize = objBuffer.length;
    if (!validateMagicSignature(objBuffer, doc.mime_type)) {
      await deleteStorageObject(doc.s3_key).catch(() => {});
      await withTenantContext(orgId, async (client) => {
        await client.query(
          `UPDATE documents SET document_status = 'rejected', scan_status = 'quarantined', reserved_bytes = 0 WHERE id = $1`,
          [id]
        );
        await logTenantAudit(client, {
          organizationId: orgId,
          actorId: session.userId,
          action: 'document_upload_rejected',
          entityName: 'documents',
          entityId: id,
          newData: { reason: 'Invalid file signature (magic bytes mismatch)', mimeType: doc.mime_type },
          ipAddress,
        });
      });
      return NextResponse.json(
        { error: `Invalid file signature: content does not match declared ${doc.mime_type}` },
        { status: 400 }
      );
    }

    const sha256 = computeSha256Hex(objBuffer);
    const scanResult = await evaluateMalwareScan({
      objectKey: doc.s3_key,
      sha256,
      mimeType: doc.mime_type,
      sizeBytes: actualSize,
    });

    // 4. Finalize document state & reconcile storage usage atomically
    const finalResult = await withTenantContext(orgId, async (client) => {
      if (actualSize > Number(doc.reserved_bytes || 0)) {
        const delta = actualSize - Number(doc.reserved_bytes || 0);
        const quota = await enforceStorageQuotaTx(client, orgId, delta);
        if (!quota.allowed) {
          await client.query(
            `UPDATE documents SET document_status = 'rejected', reserved_bytes = 0 WHERE id = $1`,
            [id]
          );
          return { status: 403, error: quota.errorMessage || 'Storage quota exceeded on actual size' };
        }
      }

      const updRes = await client.query(
        `
        UPDATE documents
        SET file_size_bytes = $1,
            verified_size_bytes = $1,
            reserved_bytes = 0,
            sha256_checksum = $2,
            document_status = $3,
            scan_status = $4,
            uploaded_completed_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *;
        `,
        [actualSize, sha256, scanResult.documentStatus, scanResult.scanStatus, id]
      );

      // Reconcile usage_records storage_bytes accurately
      await client.query(
        `
        UPDATE usage_records
        SET metric_value = (
          SELECT COALESCE(SUM(COALESCE(verified_size_bytes, file_size_bytes)), 0)
          FROM documents
          WHERE organization_id = $1 AND is_deleted = false AND document_status IN ('pending_scan', 'available', 'archived')
        )
        WHERE organization_id = $1 AND metric_name = 'storage_bytes';
        `,
        [orgId]
      );

      await logTenantAudit(client, {
        organizationId: orgId,
        actorId: session.userId,
        action: 'document_upload_completed',
        entityName: 'documents',
        entityId: id,
        newData: {
          verifiedSizeBytes: actualSize,
          sha256,
          documentStatus: scanResult.documentStatus,
          scanStatus: scanResult.scanStatus,
        },
        ipAddress,
      });

      return { status: 200, doc: updRes.rows[0] };
    });

    if (finalResult.status !== 200) {
      await deleteStorageObject(doc.s3_key).catch(() => {});
      return NextResponse.json({ error: finalResult.error }, { status: finalResult.status });
    }

    return NextResponse.json({
      alreadyCompleted: false,
      scanDetail: scanResult.detail,
      document: sanitizeDocumentRecord(finalResult.doc),
    });
  } catch (error: any) {
    console.error('POST /api/documents/[id]/complete-upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload completion failed' }, { status: 500 });
  }
}
