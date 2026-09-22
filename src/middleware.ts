import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from './lib/session';
import { getClientIP, rateLimit } from './lib/security';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next();
  const ip = getClientIP(req);

  // Global rate limiting
  const rl = rateLimit(`global:${ip}`, 300, 60_000);
  if (!rl.success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
    });
  }

  // Auth check for admin routes
  const isAdminPage = pathname.startsWith('/admin');
  
  if (isAdminPage) {
    const adminRL = rateLimit(`admin:${ip}`, 120, 60_000);
    if (!adminRL.success) {
      return NextResponse.redirect(new URL('/login?reason=rate_limit', req.url));
    }

    try {
      const session = await getIronSession<SessionData>(req, res, sessionOptions);
      const user = session.user;

      if (!user) {
        return NextResponse.redirect(
          new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url)
        );
      }

      if (user.status !== 'APPROVED') {
        return NextResponse.redirect(new URL('/login?reason=pending', req.url));
      }

      if (user.role === 'VIEWER') {
        return NextResponse.redirect(new URL('/', req.url));
      }

      // Role-based page restrictions
      const restricted: Record<string, string[]> = {
        '/admin/settings':    ['DEVELOPER', 'DIRECTOR'],
        '/admin/elections':   ['EDITOR_IN_CHIEF', 'DIRECTOR'],
        '/admin/newspaper':   ['EDITOR_IN_CHIEF', 'DIRECTOR'],
        '/admin/users':       ['ADMISSIONS', 'EDITOR_IN_CHIEF', 'DIRECTOR'],
        '/admin/logs':        ['DIRECTOR'],
        '/admin/breaking':    ['EDITOR_IN_CHIEF', 'DIRECTOR'],
        '/admin/departments': ['EDITOR_IN_CHIEF', 'DIRECTOR'],
      };

      for (const [route, roles] of Object.entries(restricted)) {
        if (pathname.startsWith(route) && !roles.includes(user.role)) {
          return NextResponse.redirect(new URL('/admin?error=forbidden', req.url));
        }
      }
    } catch(_e) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url)
      );
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
