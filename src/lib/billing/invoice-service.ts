/**
 * ElderCare OS — Immutable Invoice, Credit Note & PDF Service
 */

import crypto from 'crypto';
import type { PoolClient } from 'pg';

export async function generateInvoiceTx(
  client: PoolClient,
  params: {
    organizationId: string;
    subscriptionId: string;
    subtotalInr: number;
    taxAmountInr?: number;
    currency?: string;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    invoiceType?: 'invoice' | 'credit_note' | 'adjustment';
    relatedInvoiceId?: string | null;
    notes?: string | null;
  }
) {
  const orgRes = await client.query(
    `SELECT name, legal_name, primary_email, address_line1, city, state, postal_code, tax_exempt_80g_number
     FROM organizations WHERE id = $1`,
    [params.organizationId]
  );
  const org = orgRes.rows[0] || {};

  const prefix = params.invoiceType === 'credit_note' ? 'CN' : params.invoiceType === 'adjustment' ? 'ADJ' : 'INV';
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const invoiceNumber = `${prefix}-${ym}-${randSuffix}`;

  const taxAmount = params.taxAmountInr ?? 0;
  const total = Math.round((params.subtotalInr + taxAmount) * 100) / 100;

  const res = await client.query(
    `
    INSERT INTO subscription_invoices (
      organization_id, subscription_id, invoice_number, status,
      subtotal, tax_amount, total, currency,
      period_start, period_end, due_date,
      invoice_type, related_invoice_id, billing_details, notes
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11,
      $12, $13, $14::jsonb, $15
    )
    RETURNING *;
    `,
    [
      params.organizationId,
      params.subscriptionId,
      invoiceNumber,
      params.invoiceType === 'credit_note' ? 'paid' : 'open',
      params.subtotalInr,
      taxAmount,
      total,
      params.currency || 'INR',
      params.periodStart,
      params.periodEnd,
      params.dueDate,
      params.invoiceType || 'invoice',
      params.relatedInvoiceId || null,
      JSON.stringify({
        organizationName: org.name || 'NGO Workspace',
        legalName: org.legal_name || org.name || null,
        email: org.primary_email || null,
        address: [org.address_line1, org.city, org.state, org.postal_code].filter(Boolean).join(', '),
      }),
      params.notes || null,
    ]
  );

  return res.rows[0];
}

function escapePdfText(text: string): string {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generate a valid, standards-compliant PDF 1.4 document buffer for an invoice.
 */
export function generateInvoicePdfBuffer(invoice: any): Buffer {
  const billing = invoice.billing_details || {};
  const lines = [
    'ElderCare OS — SaaS Subscription Invoice',
    '------------------------------------------------------------',
    `Invoice Number : ${invoice.invoice_number}`,
    `Invoice Type   : ${String(invoice.invoice_type || 'invoice').toUpperCase()}`,
    `Status         : ${String(invoice.status).toUpperCase()}`,
    `Issued Date    : ${new Date(invoice.created_at).toISOString().split('T')[0]}`,
    `Due Date       : ${new Date(invoice.due_date).toISOString().split('T')[0]}`,
    `Billed To      : ${billing.organizationName || 'NGO Organization'}`,
    `Billing Email  : ${billing.email || 'N/A'}`,
    `Period         : ${new Date(invoice.period_start).toISOString().split('T')[0]} to ${new Date(invoice.period_end).toISOString().split('T')[0]}`,
    `Subtotal       : ${invoice.currency} ${invoice.subtotal}`,
    `Tax            : ${invoice.currency} ${invoice.tax_amount}`,
    `Total          : ${invoice.currency} ${invoice.total}`,
    `Paid At        : ${invoice.paid_at ? new Date(invoice.paid_at).toISOString() : 'Unpaid'}`,
  ];

  let streamContent = 'BT\n/F1 11 Tf\n50 760 Td\n16 TL\n';
  for (const line of lines) {
    streamContent += `(${escapePdfText(line)}) Tj T*\n`;
  }
  streamContent += 'ET';

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  );
  objects.push(
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
