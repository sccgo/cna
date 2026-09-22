import { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sessionOptions, SessionData } from '@/lib/session';
import { LoginSchema, rateLimitAuth, getClientIP, apiError, apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = rateLimitAuth(ip);
  if (!rl.success) return new Response(JSON.stringify({ error: 'حاولت كثيراً، انتظر 15 دقيقة' }), { status: 429 });

  let body: unknown;
  try { body = await req.json(); } catch(_e) { return apiError('بيانات غير صالحة'); }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message || 'بيانات غير صالحة');

  const { identifier, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { username: identifier },
      ],
    },
  });

  if (!user) return apiError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return apiError('اسم المستخدم أو كلمة المرور غير صحيحة', 401);

  if (!user.emailVerified) return apiError('يرجى تأكيد بريدك الإلكتروني أولاً', 403);
  if (user.status === 'PENDING') return apiError('طلبك قيد المراجعة من عمادة القبول', 403);
  if (user.status === 'REJECTED') return apiError('تم رفض طلبك. تواصل مع الإدارة', 403);
  if (user.status === 'SUSPENDED') return apiError('تم إيقاف حسابك. تواصل مع الإدارة', 403);

  // Update last login
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  // Log activity
  await prisma.activityLog.create({
    data: { userId: user.id, action: 'LOGIN', ip, details: { userAgent: req.headers.get('user-agent') } },
  }).catch(() => {});

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.user = {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
  };
  await session.save();

  return apiSuccess({
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  });
}
