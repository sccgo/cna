import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/security';
import bcrypt from 'bcryptjs';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return apiError('غير مصرح', 401);
  const body = await req.json().catch(()=>null);
  if (!body?.current_password || !body?.new_password) return apiError('بيانات ناقصة');
  if (body.new_password.length < 8) return apiError('8 أحرف على الأقل');
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return apiError('المستخدم غير موجود');
  const valid = await bcrypt.compare(body.current_password, user.password);
  if (!valid) return apiError('كلمة المرور الحالية غير صحيحة');
  await prisma.user.update({ where:{ id:user.id }, data:{ password: await bcrypt.hash(body.new_password, 12) } });
  return apiSuccess({ changed: true });
}
