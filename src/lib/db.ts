/**
 * ElderCare OS — Transaction-Scoped Multi-Tenant Database Client
 * Enforces PostgreSQL Row-Level Security (RLS) isolation via transaction-local context
 * and authorization guards for platform vs. tenant operations.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import type { EdgeSessionPayload } from './jwt';

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

export class PlatformAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlatformAuthorizationError';
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  if (!UUID_REGEX.test(organizationId.trim())) {
    throw new TenantContextError(`Invalid organizationId format: ${organizationId}`);
  }

  const pool = getDbPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
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
 * Execute a tenant-scoped operation after verifying the caller's session,
 * user status, organization status, and active membership.
 */
export async function withAuthorizedTenantContext<T>(
  session: EdgeSessionPayload | null,
  organizationId: string,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!session || !session.userId) {
    throw new TenantContextError('Authentication required for tenant operation');
  }
  if (!organizationId || !UUID_REGEX.test(organizationId.trim())) {
    throw new TenantContextError('Invalid organizationId');
  }

  const pool = getDbPool();
  const authCheck = await pool.query(
    `
    SELECT u.status AS user_status, u.is_platform_admin, o.status AS org_status
    FROM users u
    JOIN organizations o ON o.id = $2
    WHERE u.id = $1
    `,
    [session.userId, organizationId.trim()]
  );

  if (authCheck.rows.length === 0) {
    throw new TenantContextError('User or organization not found');
  }

  const row = authCheck.rows[0];
  if (row.user_status !== 'active') {
    throw new TenantContextError('User account is not active');
  }
  if (row.org_status === 'suspended' || row.org_status === 'cancelled') {
    throw new TenantContextError('Organization workspace is suspended');
  }

  const membershipCheck = await pool.query(
    'SELECT 1 FROM get_user_active_memberships($1) WHERE organization_id = $2',
    [session.userId, organizationId.trim()]
  );
  const hasOrgMembership = membershipCheck.rows.length > 0;
  const isAuthorizedPlatformAdmin = row.is_platform_admin && session.mfaVerified === true;

  if (!hasOrgMembership && !isAuthorizedPlatformAdmin) {
    throw new TenantContextError('User does not hold an active membership in this organization');
  }

  return withTenantContext(organizationId, operation);
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

function assertPlatformAuthorization(session: EdgeSessionPayload | null): void {
  if (!session || !session.userId || !session.isPlatformAdmin) {
    throw new PlatformAuthorizationError('Forbidden: Platform Owner privileges required');
  }
  if (session.mfaVerified !== true) {
    throw new PlatformAuthorizationError('Forbidden: Platform Owner MFA verification required');
  }
}

/**
 * Execute an operation in platform context with mandatory Platform Owner + MFA verification.
 */
export async function withPlatformContext<T>(
  sessionOrOperation: EdgeSessionPayload | null | ((client: PoolClient) => Promise<T>),
  maybeOperation?: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (typeof sessionOrOperation === 'function') {
    throw new PlatformAuthorizationError(
      'withPlatformContext now requires an authorized Platform Owner session as the first argument'
    );
  }
  assertPlatformAuthorization(sessionOrOperation);
  if (!maybeOperation) {
    throw new PlatformAuthorizationError('Operation callback is required');
  }

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await maybeOperation(client);
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
 * Execute a platform-global query with mandatory Platform Owner + MFA verification.
 */
export async function queryPlatform<R extends QueryResultRow = any>(
  session: EdgeSessionPayload | null,
  text: string,
  params: any[] = []
): Promise<QueryResult<R>> {
  assertPlatformAuthorization(session);
  const pool = getDbPool();
  return pool.query<R>(text, params);
}
