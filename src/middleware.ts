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
  '/api/tenants/register',
  '/api/plans',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith('/api/auth/'))) {
    return NextResponse.next();
  }

  // 2. Extract Session Token
  const token = req.cookies.get('eldercare_session')?.value;
  const session = token ? await verifyEdgeToken(token) : null;

  // 3. Platform Route Protection
  if (pathname.startsWith('/platform')) {
    if (!session || !session.isPlatformAdmin) {
      const loginUrl = new URL('/platform/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const response = NextResponse.next();
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-is-platform-admin', 'true');
    return response;
  }

  // 4. API Route Protection
  if (pathname.startsWith('/api/')) {
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-user-id', session.userId);
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

  // If user has no active organization, redirect to NGO registration or workspace selection
  if (!session.activeOrgId && !session.isPlatformAdmin && pathname !== '/role-selection') {
    return NextResponse.redirect(new URL('/register-ngo', req.url));
  }

  const response = NextResponse.next();
  response.headers.set('x-user-id', session.userId);
  if (session.activeOrgId) {
    response.headers.set('x-organization-id', session.activeOrgId);
    response.headers.set('x-role', session.roleSlug || '');
  }

  return response;
}
