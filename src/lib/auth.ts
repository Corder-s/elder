/**
 * ElderCare OS — Global Identity & Multi-Tenant Session Management
 * Handles password hashing, JWT minting, server-side session lifecycle,
 * membership resolution, and revocation enforcement.
 */

import bcrypt from 'bcryptjs';
import type { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from './db';
import { signEdgeToken, verifyEdgeToken, EdgeSessionPayload } from './jwt';
import { generateSecureToken, hashToken } from './security';

export type SessionPayload = EdgeSessionPayload;

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'eldercare_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface UserMembershipInfo {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: string;
  roleId?: string;
  roleSlug: string;
  roleName: string;
  branchId?: string | null;
  title: string | null;
  status: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return signEdgeToken(payload);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  return verifyEdgeToken(token);
}

export function extractTokenFromRequest(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = req.headers.get('authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  return cookieToken || headerToken || null;
}

function shouldUseSecureCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  const appUrl = process.env.APP_URL || '';
  return appUrl.startsWith('https://');
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: shouldUseSecureCookie(),
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}

/**
 * Fetch all active organization memberships for a user via SECURITY DEFINER resolver.
 */
export async function getUserMemberships(userId: string): Promise<UserMembershipInfo[]> {
  const pool = getDbPool();
  const result = await pool.query('SELECT * FROM get_user_active_memberships($1)', [userId]);
  return result.rows.map((r) => ({
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    organizationSlug: r.organization_slug,
    organizationStatus: r.organization_status,
    roleId: r.role_id,
    roleSlug: r.role_slug,
    roleName: r.role_name,
    branchId: r.branch_id,
    title: r.title,
    status: r.status,
  }));
}

/**
 * Fetch granular permissions assigned to a role.
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  const pool = getDbPool();
  const query = `
    SELECT p.code
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role_id = $1;
  `;
  const result = await pool.query(query, [roleId]);
  return result.rows.map((r) => r.code);
}

/**
 * Create a scoped session payload for a user in an active organization.
 * Rejects suspended/deactivated users and unauthorized organization switches.
 */
export async function buildSessionPayload(
  userId: string,
  targetOrgId?: string | null,
  options?: { sessionId?: string; mfaVerified?: boolean }
): Promise<SessionPayload> {
  const pool = getDbPool();

  // 1. Fetch User Record
  const userRes = await pool.query(
    'SELECT id, email, full_name, is_platform_admin, status, mfa_enabled FROM users WHERE id = $1',
    [userId]
  );
  if (userRes.rows.length === 0) {
    throw new Error('User not found');
  }
  const user = userRes.rows[0];
  if (user.status !== 'active') {
    throw new Error('User account is suspended or inactive');
  }

  // 2. Fetch Active Memberships
  const memberships = await getUserMemberships(userId);

  // If user is Platform Admin and no specific org requested (or no memberships), return platform session
  if (user.is_platform_admin && !targetOrgId && memberships.length === 0) {
    const permRes = await pool.query("SELECT code FROM permissions WHERE domain = 'platform'");
    return {
      sessionId: options?.sessionId,
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      isPlatformAdmin: true,
      mfaVerified: options?.mfaVerified ?? false,
      activeOrgId: null,
      activeOrgSlug: null,
      activeOrgName: null,
      roleSlug: 'platform_super_admin',
      roleName: 'Platform Super Admin',
      branchId: null,
      permissions: permRes.rows.map((r) => r.code),
    };
  }

  // 3. Select Active Organization
  let activeMembership = memberships[0] || null;
  if (targetOrgId) {
    const found = memberships.find((m) => m.organizationId === targetOrgId);
    if (!found) {
      throw new Error('User does not hold an active membership in the requested organization');
    }
    activeMembership = found;
  }

  if (!activeMembership) {
    return {
      sessionId: options?.sessionId,
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      isPlatformAdmin: user.is_platform_admin,
      mfaVerified: options?.mfaVerified ?? false,
      activeOrgId: null,
      activeOrgSlug: null,
      activeOrgName: null,
      roleSlug: null,
      roleName: null,
      branchId: null,
      permissions: [],
    };
  }

  // 4. Fetch Role Details and Permissions for active membership
  let permissions: string[] = [];
  const roleSlug = activeMembership.roleSlug;
  const roleName = activeMembership.roleName;
  const branchId = activeMembership.branchId || null;

  if (activeMembership.roleId) {
    permissions = await getRolePermissions(activeMembership.roleId);
  }

  return {
    sessionId: options?.sessionId,
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    isPlatformAdmin: user.is_platform_admin,
    mfaVerified: options?.mfaVerified ?? false,
    activeOrgId: activeMembership.organizationId,
    activeOrgSlug: activeMembership.organizationSlug,
    activeOrgName: activeMembership.organizationName,
    roleSlug,
    roleName,
    branchId,
    permissions,
  };
}

/**
 * Create a persistent server-side session in `user_sessions` and mint a JWT bound to it.
 */
export async function createServerSession(params: {
  userId: string;
  targetOrgId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
  mfaVerified?: boolean;
}): Promise<{ sessionId: string; token: string; payload: SessionPayload }> {
  const pool = getDbPool();
  const payloadWithoutId = await buildSessionPayload(params.userId, params.targetOrgId, {
    mfaVerified: params.mfaVerified ?? false,
  });

  const rawSessionSecret = generateSecureToken(32);
  const tokenHash = hashToken(rawSessionSecret);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const insertRes = await pool.query(
    `
    INSERT INTO user_sessions (
      user_id,
      active_organization_id,
      session_token,
      user_agent,
      ip_address,
      device_name,
      mfa_verified,
      mfa_verified_at,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id;
    `,
    [
      params.userId,
      payloadWithoutId.activeOrgId,
      tokenHash,
      params.userAgent || null,
      params.ipAddress || null,
      params.deviceName || 'Web Browser',
      params.mfaVerified ?? false,
      params.mfaVerified ? new Date() : null,
      expiresAt,
    ]
  );

  const sessionId: string = insertRes.rows[0].id;
  const payload: SessionPayload = {
    ...payloadWithoutId,
    sessionId,
  };
  const token = await signToken(payload);

  return { sessionId, token, payload };
}

/**
 * Validate JWT AND server-side session state, user status, password-change timestamp,
 * and live organization membership/permissions (prevents stale JWT claims).
 */
export async function verifyServerSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;

  const decoded = await verifyToken(token);
  if (!decoded || !decoded.userId) return null;

  const pool = getDbPool();

  // Enforce server-side session existence & non-revocation when sessionId is present
  let activeOrgId = decoded.activeOrgId;
  let mfaVerified = decoded.mfaVerified ?? false;

  if (decoded.sessionId) {
    const sessRes = await pool.query(
      `
      SELECT s.id, s.user_id, s.active_organization_id, s.is_revoked, s.expires_at,
             s.created_at, s.mfa_verified,
             u.status AS user_status, u.password_changed_at, u.is_platform_admin
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1 AND s.user_id = $2
      `,
      [decoded.sessionId, decoded.userId]
    );

    if (sessRes.rows.length === 0) return null;
    const sess = sessRes.rows[0];

    if (sess.is_revoked) return null;
    if (new Date(sess.expires_at).getTime() <= Date.now()) return null;
    if (sess.user_status !== 'active') return null;

    if (sess.password_changed_at) {
      const changedAt = new Date(sess.password_changed_at).getTime();
      const createdAt = new Date(sess.created_at).getTime();
      if (changedAt > createdAt + 1000) {
        return null;
      }
    }

    activeOrgId = sess.active_organization_id;
    mfaVerified = Boolean(sess.mfa_verified);

    // Touch last_active_at asynchronously (best-effort)
    pool.query('UPDATE user_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [sess.id]).catch(() => { });
  } else {
    // Legacy stateless JWT without sessionId: still verify user is active
    const userRes = await pool.query('SELECT status FROM users WHERE id = $1', [decoded.userId]);
    if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
      return null;
    }
  }

  try {
    return await buildSessionPayload(decoded.userId, activeOrgId, {
      sessionId: decoded.sessionId,
      mfaVerified,
    });
  } catch {
    return null;
  }
}

export async function revokeSession(sessionId: string, userId: string, reason = 'user_logout'): Promise<boolean> {
  const pool = getDbPool();
  const res = await pool.query(
    `
    UPDATE user_sessions
    SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = $3
    WHERE id = $1 AND user_id = $2 AND is_revoked = false
    RETURNING id;
    `,
    [sessionId, userId, reason]
  );
  return res.rows.length > 0;
}

export async function revokeAllUserSessions(
  userId: string,
  reason = 'security_revocation',
  exceptSessionId?: string
): Promise<number> {
  const pool = getDbPool();
  if (exceptSessionId) {
    const res = await pool.query(
      `
      UPDATE user_sessions
      SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = $2
      WHERE user_id = $1 AND id <> $3 AND is_revoked = false
      `,
      [userId, reason, exceptSessionId]
    );
    return res.rowCount || 0;
  }

  const res = await pool.query(
    `
    UPDATE user_sessions
    SET is_revoked = true, revoked_at = CURRENT_TIMESTAMP, revoked_reason = $2
    WHERE user_id = $1 AND is_revoked = false
    `,
    [userId, reason]
  );
  return res.rowCount || 0;
}
