/**
 * Universal Web-Crypto JWT Helper using 'jose'
 * Seamlessly functions in both Next.js Edge Runtime (middleware) and Node.js API routes.
 */

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'eldercare_saas_production_jwt_secret_key_2026_super_secure_32chars';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);

export interface EdgeSessionPayload {
  userId: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  activeOrgId: string | null;
  activeOrgSlug: string | null;
  activeOrgName: string | null;
  roleSlug: string | null;
  roleName: string | null;
  branchId: string | null;
  permissions: string[];
}

export async function signEdgeToken(payload: EdgeSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

export async function verifyEdgeToken(token: string): Promise<EdgeSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as EdgeSessionPayload;
  } catch (error) {
    return null;
  }
}
