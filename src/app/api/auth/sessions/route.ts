import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await verifyServerSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getDbPool();
    const res = await pool.query(
      `
      SELECT id, active_organization_id, device_name, user_agent, ip_address,
             mfa_verified, is_revoked, created_at, last_active_at, expires_at
      FROM user_sessions
      WHERE user_id = $1 AND is_revoked = false AND expires_at > CURRENT_TIMESTAMP
      ORDER BY last_active_at DESC
      `,
      [session.userId]
    );

    const sessions = res.rows.map((row) => ({
      id: row.id,
      activeOrganizationId: row.active_organization_id,
      deviceName: row.device_name || 'Web Browser',
      userAgent: row.user_agent,
      ipAddress: row.ip_address,
      mfaVerified: Boolean(row.mfa_verified),
      isCurrent: row.id === session.sessionId,
      createdAt: row.created_at,
      lastActiveAt: row.last_active_at,
      expiresAt: row.expires_at,
    }));

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('List sessions error:', error);
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}
