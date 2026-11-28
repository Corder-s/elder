import { NextRequest, NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';

/**
 * Public / NGO-level organization self-registration is disabled.
 * Only an MFA-verified Platform Owner may provision new organizations via /api/platform/organizations.
 */
export async function POST(req: NextRequest) {
  const session = await verifyServerSession(req);
  if (!session) {
    return NextResponse.json(
      { error: 'Forbidden: Only an MFA-verified Platform Owner can create organizations.' },
      { status: 403 }
    );
  }
  if (!session.isPlatformAdmin || !session.mfaVerified) {
    return NextResponse.json(
      { error: 'Forbidden: Only an MFA-verified Platform Owner can create organizations.' },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { error: 'Use POST /api/platform/organizations from the Platform Owner console.' },
    { status: 400 }
  );
}
