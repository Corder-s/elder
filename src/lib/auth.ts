/**
 * ElderCare OS — Global Identity & Multi-Tenant Session Management
 * Handles password hashing, JWT minting, membership resolution, and session tokens.
 */

import bcrypt from 'bcryptjs';
import { getDbPool } from './db';
import { signEdgeToken, verifyEdgeToken, EdgeSessionPayload } from './jwt';

export type SessionPayload = EdgeSessionPayload;

export interface UserMembershipInfo {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  roleSlug: string;
  roleName: string;
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

/**
 * Fetch all organization memberships for a user.
 */
export async function getUserMemberships(userId: string): Promise<UserMembershipInfo[]> {
  const pool = getDbPool();
  const query = `
    SELECT 
      m.organization_id,
      o.name AS organization_name,
      o.slug AS organization_slug,
      r.slug AS role_slug,
      r.name AS role_name,
      m.title,
      m.status
    FROM organization_memberships m
    JOIN organizations o ON m.organization_id = o.id
    JOIN roles r ON m.role_id = r.id
    WHERE m.user_id = $1 AND m.status = 'active' AND o.status IN ('active', 'trial', 'past_due', 'grace_period', 'suspended')
    ORDER BY m.created_at ASC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.map(r => ({
    organizationId: r.organization_id,
    organizationName: r.organization_name,
    organizationSlug: r.organization_slug,
    roleSlug: r.role_slug,
    roleName: r.role_name,
    title: r.title,
    status: r.status,
  }));
}

/**
 * Fetch granular permissions assigned to a role in an organization.
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
  return result.rows.map(r => r.code);
}

/**
 * Create a scoped session payload for a user in an active organization.
 */
export async function buildSessionPayload(
  userId: string,
  targetOrgId?: string | null
): Promise<SessionPayload> {
  const pool = getDbPool();

  // 1. Fetch User Record
  const userRes = await pool.query(
    'SELECT id, email, full_name, is_platform_admin, status FROM users WHERE id = $1',
    [userId]
  );
  if (userRes.rows.length === 0) {
    throw new Error('User not found');
  }
  const user = userRes.rows[0];

  // 2. Fetch Memberships
  const memberships = await getUserMemberships(userId);

  // If user is Platform Admin and no specific org requested, return platform session
  if (user.is_platform_admin && !targetOrgId && memberships.length === 0) {
    const permRes = await pool.query("SELECT code FROM permissions WHERE domain = 'platform'");
    return {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      isPlatformAdmin: true,
      activeOrgId: null,
      activeOrgSlug: null,
      activeOrgName: null,
      roleSlug: 'platform_super_admin',
      roleName: 'Platform Super Admin',
      branchId: null,
      permissions: permRes.rows.map(r => r.code),
    };
  }

  // 3. Select Active Organization
  let activeMembership = memberships[0] || null;
  if (targetOrgId) {
    const found = memberships.find(m => m.organizationId === targetOrgId);
    if (!found && !user.is_platform_admin) {
      throw new Error('User does not belong to the requested organization');
    }
    if (found) {
      activeMembership = found;
    }
  }

  if (!activeMembership) {
    // User has no active memberships yet
    return {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      isPlatformAdmin: user.is_platform_admin,
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
  const roleRes = await pool.query(`
    SELECT r.id, r.slug, r.name, m.branch_id
    FROM organization_memberships m
    JOIN roles r ON m.role_id = r.id
    WHERE m.user_id = $1 AND m.organization_id = $2 AND m.status = 'active';
  `, [userId, activeMembership.organizationId]);

  let permissions: string[] = [];
  let roleSlug = activeMembership.roleSlug;
  let roleName = activeMembership.roleName;
  let branchId = null;

  if (roleRes.rows.length > 0) {
    const roleId = roleRes.rows[0].id;
    roleSlug = roleRes.rows[0].slug;
    roleName = roleRes.rows[0].name;
    branchId = roleRes.rows[0].branch_id;
    permissions = await getRolePermissions(roleId);
  }

  return {
    userId: user.id,
    email: user.email,
    fullName: user.full_name,
    isPlatformAdmin: user.is_platform_admin,
    activeOrgId: activeMembership.organizationId,
    activeOrgSlug: activeMembership.organizationSlug,
    activeOrgName: activeMembership.organizationName,
    roleSlug,
    roleName,
    branchId,
    permissions,
  };
}
