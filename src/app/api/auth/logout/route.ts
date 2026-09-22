import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.destroy();
  return apiSuccess({ message: 'تم تسجيل الخروج' });
}
