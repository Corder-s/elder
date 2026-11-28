/**
 * ElderCare OS — Tenant Audit Logging Helper
 * Records immutable operational audit entries inside tenant RLS context.
 * Never logs passwords, tokens, full identity numbers, or sensitive clinical notes.
 */

import type { PoolClient } from 'pg';

export async function logTenantAudit(
  client: PoolClient,
  params: {
    organizationId: string;
    actorId: string;
    action: string;
    entityName: string;
    entityId?: string | null;
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }
): Promise<void> {
  await client.query(
    `
    INSERT INTO tenant_audit_logs (
      organization_id, actor_id, action, entity_name, entity_id, old_data, new_data, ip_address
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
    `,
    [
      params.organizationId,
      params.actorId,
      params.action,
      params.entityName,
      params.entityId || null,
      params.oldData ? JSON.stringify(params.oldData) : null,
      params.newData ? JSON.stringify(params.newData) : null,
      params.ipAddress || null,
    ]
  );
}
