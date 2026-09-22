import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { prisma } from '@/lib/db';
import { sessionOptions, SessionData } from '@/lib/session';
import { apiError, apiSuccess } from '@/lib/security';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return apiError('غير مصرح', 401);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');

  const { fullName, currentPassword, newPassword } = body;
  const updates: any = {};

  if (fullName?.trim()) {
    if (fullName.trim().length < 2) return apiError('الاسم قصير جداً');
    updates.fullName = fullName.trim();
  }

  if (newPassword) {
    if (!currentPassword) return apiError('كلمة المرور الحالية مطلوبة');
    if (newPassword.length < 8) return apiError('كلمة المرور الجديدة 8 أحرف على الأقل');

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) return apiError('المستخدم غير موجود');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return apiError('كلمة المرور الحالية غير صحيحة');

    updates.password = await bcrypt.hash(newPassword, 12);
  }

  if (!Object.keys(updates).length) return apiError('لا توجد تغييرات');

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updates,
    select: { id: true, fullName: true, username: true, email: true, role: true, status: true },
  });

  // Refresh session
  session.user = { ...session.user, fullName: updated.fullName };
  await session.save();

  return apiSuccess({ updated: true, fullName: updated.fullName });
}

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) return apiError('غير مصرح', 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, username: true, fullName: true, role: true, status: true, createdAt: true, lastLoginAt: true },
  });

  return apiSuccess({ user });
}
