import { NextRequest, NextResponse } from 'next/server';
import { withTenantContext } from '@/lib/db';
import { requireTenantPermission } from '@/lib/rbac';
import { logTenantAudit } from '@/lib/audit';
import { getClientMetadata } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'finance:expense:read');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const data = await withTenantContext(session.activeOrgId!, async (client) => {
      let query = `
        SELECT e.*, u.full_name AS created_by_name, a.full_name AS approved_by_name
        FROM expenses e
        LEFT JOIN users u ON e.created_by = u.id
        LEFT JOIN users a ON e.approved_by = a.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (category && category !== 'all') {
        params.push(category);
        query += ` AND LOWER(e.category) = LOWER($${params.length})`;
      }
      query += ` ORDER BY e.incurred_date DESC, e.created_at DESC LIMIT 100`;

      const expRes = await client.query(query, params);

      const summaryRes = await client.query(`
        SELECT
          COALESCE(SUM(amount), 0) AS total_amount,
          COALESCE(SUM(amount) FILTER (WHERE incurred_date >= date_trunc('month', CURRENT_DATE)), 0) AS current_month_amount
        FROM expenses
      `);

      return {
        expenses: expRes.rows,
        summary: {
          totalAmount: parseFloat(summaryRes.rows[0].total_amount),
          currentMonthAmount: parseFloat(summaryRes.rows[0].current_month_amount),
        },
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'finance:expense:create');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { category, title, amount, currency = 'INR', incurredDate, paidTo, paymentMethod = 'bank_transfer', notes } = await req.json();
    const numericAmount = parseFloat(amount);
    if (!category || !title || isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Category, title, and positive amount are required' }, { status: 400 });
    }
    if (!['INR', 'USD', 'EUR', 'GBP'].includes(String(currency).toUpperCase())) {
      return NextResponse.json({ error: 'Unsupported currency' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const created = await withTenantContext(session.activeOrgId!, async (client) => {
      const res = await client.query(
        `
        INSERT INTO expenses (
          organization_id, branch_id, category, title, amount, currency,
          incurred_date, paid_to, payment_method, created_by, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
        RETURNING *;
        `,
        [
          session.activeOrgId,
          session.branchId || null,
          String(category).trim(),
          String(title).trim(),
          numericAmount,
          String(currency).toUpperCase(),
          incurredDate || new Date().toISOString().split('T')[0],
          paidTo || null,
          paymentMethod,
          session.userId,
          notes || null,
        ]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: 'expense_created',
        entityName: 'expenses',
        entityId: res.rows[0].id,
        newData: { category, amount: numericAmount },
        ipAddress,
      });

      return res.rows[0];
    });

    return NextResponse.json({ success: true, expense: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authz = await requireTenantPermission(req, 'finance:expense:approve');
    if (!authz.authorized) return authz.errorResponse;
    const { session } = authz;

    const { id, status } = await req.json();
    if (!id || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Expense id and status (approved or rejected) are required' }, { status: 400 });
    }

    const { ipAddress } = getClientMetadata(req);

    const result = await withTenantContext(session.activeOrgId!, async (client) => {
      const existing = await client.query('SELECT * FROM expenses WHERE id = $1 FOR UPDATE', [id]);
      if (existing.rows.length === 0) return { status: 404, error: 'Expense not found' };

      const exp = existing.rows[0];
      if (exp.created_by && exp.created_by === session.userId) {
        return { status: 403, error: 'Forbidden: Segregation of duties prevents approving your own expense' };
      }

      const upd = await client.query(
        `UPDATE expenses SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *`,
        [status, session.userId, id]
      );

      await logTenantAudit(client, {
        organizationId: session.activeOrgId!,
        actorId: session.userId,
        action: `expense_${status}`,
        entityName: 'expenses',
        entityId: id,
        oldData: { status: exp.status },
        newData: { status },
        ipAddress,
      });

      return { status: 200, expense: upd.rows[0] };
    });

    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, expense: result.expense });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
