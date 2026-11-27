/**
 * ElderCare OS — Cryptographic Tokens, Password Policy, Rate Limiting & Security Event Logging
 */

import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { getDbPool } from './db';

export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one digit' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

export function getClientMetadata(req: NextRequest): { ipAddress: string; userAgent: string; deviceName: string } {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ipAddress = (forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1').slice(0, 45);
  const userAgent = (req.headers.get('user-agent') || 'Unknown').slice(0, 500);

  let deviceName = 'Web Browser';
  if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
    deviceName = /iPhone|iPad/i.test(userAgent) ? 'iOS Device' : 'Android / Mobile Browser';
  } else if (/Windows/i.test(userAgent)) {
    deviceName = 'Windows Desktop';
  } else if (/Mac/i.test(userAgent)) {
    deviceName = 'macOS Desktop';
  } else if (/Linux/i.test(userAgent)) {
    deviceName = 'Linux Desktop';
  }

  return { ipAddress, userAgent, deviceName };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

/**
 * Check whether a rate-limit bucket is currently blocked or over its window threshold.
 * Uses sliding 15-minute windows with temporary progressive lockouts (never permanent DoS locks).
 */
export async function checkRateLimit(
  bucketKey: string,
  maxAttempts: number,
  windowMinutes = 15
): Promise<RateLimitResult> {
  const pool = getDbPool();
  const res = await pool.query(
    `
    SELECT attempt_count, first_attempt_at, blocked_until
    FROM auth_rate_limits
    WHERE bucket_key = $1
    `,
    [bucketKey]
  );

  if (res.rows.length === 0) {
    return { allowed: true, retryAfterSeconds: 0, remaining: maxAttempts };
  }

  const row = res.rows[0];
  const now = Date.now();

  if (row.blocked_until) {
    const blockedUntilMs = new Date(row.blocked_until).getTime();
    if (blockedUntilMs > now) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((blockedUntilMs - now) / 1000),
        remaining: 0,
      };
    }
  }

  const windowStartMs = new Date(row.first_attempt_at).getTime();
  if (now - windowStartMs > windowMinutes * 60 * 1000) {
    // Window expired
    return { allowed: true, retryAfterSeconds: 0, remaining: maxAttempts };
  }

  if (row.attempt_count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(60, Math.ceil((windowStartMs + windowMinutes * 60 * 1000 - now) / 1000)),
      remaining: 0,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxAttempts - row.attempt_count),
  };
}

/**
 * Increment a rate limit bucket and apply progressive temporary lockout when threshold is exceeded.
 */
export async function recordRateLimitHit(
  bucketKey: string,
  maxAttempts: number,
  windowMinutes = 15,
  baseBlockMinutes = 5
): Promise<{ attemptCount: number; blockedUntil: Date | null }> {
  const pool = getDbPool();
  const windowCutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

  const upsertRes = await pool.query(
    `
    INSERT INTO auth_rate_limits (bucket_key, attempt_count, first_attempt_at, last_attempt_at, blocked_until)
    VALUES ($1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
    ON CONFLICT (bucket_key) DO UPDATE SET
      attempt_count = CASE
        WHEN auth_rate_limits.first_attempt_at < $2 THEN 1
        ELSE auth_rate_limits.attempt_count + 1
      END,
      first_attempt_at = CASE
        WHEN auth_rate_limits.first_attempt_at < $2 THEN CURRENT_TIMESTAMP
        ELSE auth_rate_limits.first_attempt_at
      END,
      last_attempt_at = CURRENT_TIMESTAMP,
      blocked_until = CASE
        WHEN auth_rate_limits.first_attempt_at < $2 THEN NULL
        WHEN auth_rate_limits.attempt_count + 1 >= $3 THEN
          CURRENT_TIMESTAMP + (LEAST(15, $4 * GREATEST(1, (auth_rate_limits.attempt_count + 1 - $3 + 1))) || ' minutes')::interval
        ELSE auth_rate_limits.blocked_until
      END
    RETURNING attempt_count, blocked_until;
    `,
    [bucketKey, windowCutoff, maxAttempts, baseBlockMinutes]
  );

  return {
    attemptCount: upsertRes.rows[0].attempt_count,
    blockedUntil: upsertRes.rows[0].blocked_until ? new Date(upsertRes.rows[0].blocked_until) : null,
  };
}

export async function resetRateLimit(bucketKey: string): Promise<void> {
  const pool = getDbPool();
  await pool.query('DELETE FROM auth_rate_limits WHERE bucket_key = $1', [bucketKey]);
}

/**
 * Record an immutable security audit event in auth_security_events.
 * Never store passwords, plaintext tokens, or secrets in details.
 */
export async function logAuthSecurityEvent(params: {
  userId?: string | null;
  organizationId?: string | null;
  eventType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const pool = getDbPool();
    await pool.query(
      `
      INSERT INTO auth_security_events (user_id, organization_id, event_type, ip_address, user_agent, details)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        params.userId || null,
        params.organizationId || null,
        params.eventType,
        params.ipAddress || null,
        params.userAgent || null,
        JSON.stringify(params.details || {}),
      ]
    );
  } catch (err) {
    console.error('Failed to record auth security event:', err);
  }
}
