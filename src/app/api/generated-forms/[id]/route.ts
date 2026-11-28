import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { validateFormData } from '@/lib/document-intelligence/form-generator';
import type { FormType } from '@/lib/document-intelligence/types';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'form:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;

    const form = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        'SELECT * FROM generated_form_drafts WHERE id = $1 AND organization_id = $2',
        [id, session.activeOrgId]
      );
      return res.rows[0] || null;
    });

    if (!form) {
      return NextResponse.json({ error: 'Form draft not found' }, { status: 404 });
    }

    return NextResponse.json({ form });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireTenantPermission(req, 'form:draft:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;
    const { id } = await context.params;

    const body = await req.json();
    const { formData, status } = body;

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      const curRes = await client.query(
        'SELECT * FROM generated_form_drafts WHERE id = $1 AND organization_id = $2 FOR UPDATE',
        [id, session.activeOrgId]
      );
      if (curRes.rows.length === 0) return { status: 404, error: 'Form draft not found' };
      const cur = curRes.rows[0];
      if (cur.status === 'submitted') {
        return { status: 409, error: 'Cannot edit an already submitted form' };
      }

      const nextData = formData ? { ...(cur.form_data || {}), ...formData } : cur.form_data;
      const errors = validateFormData(cur.form_type as FormType, nextData || {});
      const nextStatus = status === 'reviewed' ? 'reviewed' : cur.status;

      const upd = await client.query(
        `
        UPDATE generated_form_drafts
        SET form_data = $1::jsonb,
            validation_errors = $2::jsonb,
            status = $3,
            reviewed_by = CASE WHEN $3 = 'reviewed' THEN $4 ELSE reviewed_by END,
            reviewed_at = CASE WHEN $3 = 'reviewed' THEN CURRENT_TIMESTAMP ELSE reviewed_at END
        WHERE id = $5
        RETURNING *;
        `,
        [JSON.stringify(nextData), JSON.stringify(errors), nextStatus, session.userId, id]
      );

      return { status: 200, form: upd.rows[0] };
    });

    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, form: result.form });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
