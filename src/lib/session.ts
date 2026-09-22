import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Role, UserStatus } from '@prisma/client';

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: Role;
  status: UserStatus;
}

export interface SessionData {
  user?: SessionUser;
  csrfToken?: string;
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters');
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'cna_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

// Get session in Server Components / Route Handlers
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Get session in middleware / edge
export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}

// Get current user from session
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

// Require authentication — throws if not logged in
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('UNAUTHORIZED', 'يرجى تسجيل الدخول أولاً');
  }
  if (user.status !== 'APPROVED') {
    throw new AuthError('FORBIDDEN', 'حسابك في انتظار القبول');
  }
  return user;
}

// Require specific role(s)
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new AuthError('FORBIDDEN', 'ليس لديك صلاحية للوصول');
  }
  return user;
}

export class AuthError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN';
  constructor(code: 'UNAUTHORIZED' | 'FORBIDDEN', message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}
