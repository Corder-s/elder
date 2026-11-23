import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { withTenantContext } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.activeOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const residentId = searchParams.get('residentId');

    const documents = await withTenantContext(session.activeOrgId, async (client) => {
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
      `;
      const params: any[] = [];
      if (residentId) {
        params.push(residentId);
        query += ` WHERE d.resident_id = $1`;
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
    const token = req.cookies.get('eldercare_session')?.value;
    const session = token ? await verifyToken(token) : null;
    if (!session || !session.activeOrgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, documentType, fileName, fileSizeBytes, mimeType, residentId, isConfidential = false } = body;

    if (!title || !fileName || !mimeType) {
      return NextResponse.json({ error: 'Title, file name, and MIME type are required' }, { status: 400 });
    }

    // Tenant-isolated S3 key structure: tenants/{orgId}/documents/{uuid}-{fileName}
    const safeOrgId = session.activeOrgId;
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = `tenants/${safeOrgId}/documents/${timestamp}_${cleanFileName}`;

    const newDoc = await withTenantContext(safeOrgId, async (client) => {
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
        fileSizeBytes || 1024,
        mimeType,
        s3Key,
        isConfidential,
      ]);

      // Update storage usage counter
      await client.query(`
        UPDATE usage_records
        SET metric_value = metric_value + $1
        WHERE organization_id = $2 AND metric_name = 'storage_bytes';
      `, [fileSizeBytes || 1024, safeOrgId]);

      return res.rows[0];
    });

    return NextResponse.json({ success: true, document: newDoc }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
