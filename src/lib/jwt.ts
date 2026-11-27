/**
 * Universal Web-Crypto JWT Helper using 'jose'
 * Seamlessly functions in both Next.js Edge Runtime (middleware) and Node.js API routes.
 */

import { SignJWT, jwtVerify } from 'jose';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET environment variable must be configured with at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export interface EdgeSessionPayload {
  sessionId?: string;
  userId: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  mfaVerified?: boolean;
  activeOrgId: string | null;
  activeOrgSlug: string | null;
  activeOrgName: string | null;
  roleSlug: string | null;
  roleName: string | null;
  branchId: string | null;
  permissions: string[];
}

export async function signEdgeToken(payload: EdgeSessionPayload): Promise<string> {
  const jwt = new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d');

  if (payload.sessionId) {
    jwt.setJti(payload.sessionId);
  }

  return jwt.sign(getSecretKey());
}

export async function verifyEdgeToken(token: string): Promise<EdgeSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as EdgeSessionPayload;
  } catch {
    return null;
  }
}
