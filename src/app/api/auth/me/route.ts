import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  return apiSuccess({ user: session.user ?? null });
}
