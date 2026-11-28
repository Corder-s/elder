import { NextRequest, NextResponse } from 'next/server';
import { verifyEdgeToken } from '@/lib/jwt';

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|images).*)',
  ],
};

const PUBLIC_ROUTES = [
  '/',
  '/welcome',
  '/login',
  '/register',
  '/register-ngo',
  '/forgot-password',
  '/reset-password',
  '/email-verification',
  '/unauthorized',
  '/platform/login',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/tenants/register',
  '/api/plans',
  '/api/webhooks/razorpay',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow explicitly listed public routes only (never wildcard /api/auth/*)
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // 2. Extract Session Token
  const cookieName = process.env.SESSION_COOKIE_NAME || 'eldercare_session';
  const token = req.cookies.get(cookieName)?.value;
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const session = token || bearerToken ? await verifyEdgeToken((token || bearerToken)!) : null;

  // 3. Platform Route Protection
  if (pathname.startsWith('/platform')) {
    if (!session || !session.isPlatformAdmin) {
      const loginUrl = new URL('/platform/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Allow /platform/mfa for MFA verification/enrollment; gate other /platform/* routes if MFA is not verified
    if (pathname !== '/platform/mfa' && session.mfaVerified === false) {
      return NextResponse.redirect(new URL('/platform/mfa', req.url));
    }

    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-user-id', session.userId);
    reqHeaders.set('x-is-platform-admin', 'true');
    return NextResponse.next({ request: { headers: reqHeaders } });
  }

  // 4. API Route Protection (including private /api/auth/* routes like /me, /sessions, /mfa/*, /switch-workspace)
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-user-id', session.userId);
    if (session.sessionId) {
      reqHeaders.set('x-session-id', session.sessionId);
    }
    if (session.activeOrgId) {
      reqHeaders.set('x-organization-id', session.activeOrgId);
      reqHeaders.set('x-role', session.roleSlug || '');
    }
    return NextResponse.next({
      request: {
        headers: reqHeaders,
      },
    });
  }

  // 5. Workspace Route Protection (Operational Modules)
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session.activeOrgId && !session.isPlatformAdmin && pathname !== '/role-selection') {
    return NextResponse.redirect(new URL('/register-ngo', req.url));
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-user-id', session.userId);
  if (session.activeOrgId) {
    reqHeaders.set('x-organization-id', session.activeOrgId);
    reqHeaders.set('x-role', session.roleSlug || '');
  }

  return NextResponse.next({ request: { headers: reqHeaders } });
}
