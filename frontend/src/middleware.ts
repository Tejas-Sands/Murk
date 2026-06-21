import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  // Check if the hostname starts with 'app.'
  const isAppSubdomain = host.startsWith('app.');

  if (isAppSubdomain) {
    // If accessing root of app subdomain, redirect/rewrite to dashboard
    if (url.pathname === '/') {
      url.pathname = '/app/dashboard';
      return NextResponse.rewrite(url);
    }

    // List of paths that belong to the operational app
    const appPaths = ['/dashboard', '/create', '/audit', '/invoice', '/pay', '/reputation'];
    const matchedPath = appPaths.find(path => url.pathname.startsWith(path));

    if (matchedPath) {
      // Rewrite request internally to the /app/... page
      url.pathname = `/app${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  } else {
    // Main domain (e.g. localhost:3000 or murk.finance)
    // Redirect operational app paths to subdomain
    const appPaths = ['/dashboard', '/create', '/audit', '/invoice', '/pay', '/reputation'];
    const matchedPath = appPaths.find(path => url.pathname.startsWith(path));

    if (matchedPath) {
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      // Construct the subdomain URL. E.g. app.localhost:3000
      const redirectUrl = `${protocol}://app.${host}${url.pathname}${url.search}`;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
