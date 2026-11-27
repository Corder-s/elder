/**
 * ElderCare OS — Centralized Server-Side RBAC & Scoping Enforcement
 * Enforces live database permissions, NGO vs. Platform Owner separation,
 * branch isolation, and family-to-resident scoping.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession, SessionPayload } from './auth';
import { withTenantContext } from './db';
import { getClientMetadata, logAuthSecurityEvent } from './security';

export type AuthzResult =
  | { authorized: true; session: SessionPayload; errorResponse?: never }
  | { authorized: false; session?: never; errorResponse: NextResponse };

export function isFamilyRole(roleSlug: string | null | undefined): boolean {
  return roleSlug === 'family_member' || roleSlug === 'family_guardian';
}

/**
 * Require a valid, non-revoked server session scoped to an active NGO workspace
 * and holding at least one of the required permissions from live DB role_permissions.
 * Never trusts client headers or stale JWT claims, and never lets Platform Owners
 * bypass NGO role permissions.
 */
export async function requireTenantPermission(
  req: NextRequest,
  requiredPermissions: string | string[]
): Promise<AuthzResult> {
  const session = await verifyServerSession(req);
  if (!session) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: 'Unauthorized: Invalid or expired session' }, { status: 401 }),
    };
  }

  if (!session.activeOrgId || !session.roleSlug) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: No active NGO workspace membership' },
        { status: 403 }
      ),
    };
  }

  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const hasPerm = required.some((perm) => session.permissions.includes(perm));

  if (!hasPerm) {
    const { ipAddress, userAgent } = getClientMetadata(req);
    await logAuthSecurityEvent({
      userId: session.userId,
      organizationId: session.activeOrgId,
      eventType: 'authz_denied',
      ipAddress,
      userAgent,
      details: {
        path: req.nextUrl.pathname,
        method: req.method,
        roleSlug: session.roleSlug,
        requiredPermissions: required,
      },
    });

    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: `Forbidden: Missing required permission (${required.join(' or ')})` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

/**
 * Require an MFA-verified Platform Owner session for platform-global endpoints.
 */
export async function requirePlatformOwner(req: NextRequest): Promise<AuthzResult> {
  const session = await verifyServerSession(req);
  if (!session) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!session.isPlatformAdmin || !session.mfaVerified) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { error: 'Forbidden: MFA-verified Platform Owner privileges required' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, session };
}

export interface FamilyResidentLink {
  residentId: string;
  canViewVitals: boolean;
  canViewRecords: boolean;
}

/**
 * Fetch resident links for a family member within the tenant's RLS context.
 */
export async function getFamilyResidentLinks(
  organizationId: string,
  userId: string
): Promise<FamilyResidentLink[]> {
  return withTenantContext(organizationId, async (client) => {
    const res = await client.query(
      `
      SELECT resident_id, can_view_vitals, can_view_records
      FROM resident_family_links
      WHERE user_id = $1
      `,
      [userId]
    );
    return res.rows.map((r) => ({
      residentId: r.resident_id,
      canViewVitals: Boolean(r.can_view_vitals),
      canViewRecords: Boolean(r.can_view_records),
    }));
  });
}
