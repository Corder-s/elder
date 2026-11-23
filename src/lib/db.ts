/**
 * ElderCare OS — Transaction-Scoped Multi-Tenant Database Client
 * Enforces PostgreSQL Row-Level Security (RLS) isolation via transaction-local context.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

let globalPool: Pool | null = null;

export function getDbPool(): Pool {
  if (!globalPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }
    globalPool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    globalPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }
  return globalPool;
}

export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}

/**
 * Execute a unit of work strictly bounded by the organization's tenant context.
 * Uses `set_config('app.current_organization_id', orgId, true)` with `is_local = true`.
 * Guarantees context is automatically reset upon COMMIT or ROLLBACK.
 */
export async function withTenantContext<T>(
  organizationId: string,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
    throw new TenantContextError('Cannot execute tenant operation: organizationId is missing or invalid');
  }

  // Validate UUID format to prevent injection in tenant scoping
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(organizationId.trim())) {
    throw new TenantContextError(`Invalid organizationId format: ${organizationId}`);
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Crucial: 3rd parameter `true` sets parameter only for the current transaction (LOCAL)
    await client.query(
      `SELECT set_config('app.current_organization_id', $1, true)`,
      [organizationId.trim()]
    );

    const result = await operation(client);

    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper to execute a single parameterized SQL query in tenant context.
 */
export async function queryTenant<R extends QueryResultRow = any>(
  organizationId: string,
  text: string,
  params: any[] = []
): Promise<QueryResult<R>> {
  return withTenantContext(organizationId, async (client) => {
    return client.query<R>(text, params);
  });
}

/**
 * Execute an operation in platform context (only for non-tenant administrative tables).
 */
export async function withPlatformContext<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Direct platform query for global tables (subscription_plans, organizations, etc.)
 */
export async function queryPlatform<R extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<R>> {
  const pool = getDbPool();
  return pool.query<R>(text, params);
}
