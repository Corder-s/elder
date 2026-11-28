/**
 * ElderCare OS — Document Vault Authorization & Safe Projection
 */

import type { EdgeSessionPayload } from '@/lib/jwt';
import { isFamilyRole } from '@/lib/rbac';

export function canUserAccessDocument(params: {
  session: EdgeSessionPayload;
  doc: any;
  linkedResidentIds: string[] | null;
}): { allowed: boolean; status: number; reason?: string } {
  const { session, doc, linkedResidentIds } = params;

  if (!doc || doc.is_deleted || doc.organization_id !== session.activeOrgId) {
    return { allowed: false, status: 404, reason: 'Document not found' };
  }

  // Branch scoping for non-admin staff
  if (
    session.branchId &&
    session.roleSlug !== 'admin' &&
    doc.branch_id &&
    doc.branch_id !== session.branchId
  ) {
    return { allowed: false, status: 403, reason: 'Forbidden: Document belongs to another branch' };
  }

  // Family member scoping: only linked residents, never confidential unless self-uploaded
  if (isFamilyRole(session.roleSlug)) {
    if (!doc.resident_id || !linkedResidentIds?.includes(doc.resident_id)) {
      return { allowed: false, status: 403, reason: 'Forbidden: Document not linked to your resident' };
    }
    if (doc.is_confidential && doc.uploaded_by !== session.userId) {
      return { allowed: false, status: 403, reason: 'Forbidden: Confidential document' };
    }
    return { allowed: true, status: 200 };
  }

  const canViewConfidential = ['admin', 'doctor', 'accountant'].includes(session.roleSlug || '');
  if (!canViewConfidential && doc.is_confidential && doc.uploaded_by !== session.userId) {
    return { allowed: false, status: 403, reason: 'Forbidden: Confidential document access restricted' };
  }

  return { allowed: true, status: 200 };
}

/**
 * Strip internal S3 keys from ordinary API responses.
 */
export function sanitizeDocumentRecord(doc: any) {
  const fileSizeBytes = Number(doc.verified_size_bytes ?? doc.file_size_bytes ?? 0);
  const isConfidential = Boolean(doc.is_confidential);
  const documentStatus = doc.document_status || 'available';
  const scanStatus = doc.scan_status || 'not_scanned';

  return {
    id: doc.id,
    title: doc.title,
    documentType: doc.document_type,
    document_type: doc.document_type,
    fileName: doc.file_name,
    file_name: doc.file_name,
    fileSizeBytes,
    file_size_bytes: fileSizeBytes,
    declaredSizeBytes: doc.declared_size_bytes != null ? Number(doc.declared_size_bytes) : null,
    mimeType: doc.mime_type,
    mime_type: doc.mime_type,
    isConfidential,
    is_confidential: isConfidential,
    documentStatus,
    document_status: documentStatus,
    scanStatus,
    scan_status: scanStatus,
    sha256Checksum: doc.sha256_checksum || null,
    residentId: doc.resident_id || null,
    residentName: doc.resident_name || null,
    resident_name: doc.resident_name || null,
    rescueCaseId: doc.rescue_case_id || null,
    branchId: doc.branch_id || null,
    uploadedBy: doc.uploaded_by || null,
    uploaderName: doc.uploader_name || null,
    uploader_name: doc.uploader_name || null,
    uploadExpiresAt: doc.upload_expires_at || null,
    uploadedCompletedAt: doc.uploaded_completed_at || null,
    archivedAt: doc.archived_at || null,
    archiveReason: doc.archive_reason || null,
    createdAt: doc.created_at,
    created_at: doc.created_at,
  };
}
