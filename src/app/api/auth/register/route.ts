import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { RegisterSchema, rateLimitRegister, getClientIP, apiError, apiSuccess } from '@/lib/security';
import { sendVerificationEmail, sendNewRegistrationAlert } from '@/lib/email';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = rateLimitRegister(ip);
  if (!rl.success) return apiError('محاولات كثيرة، حاول بعد ساعة', 429);

  // Check registration enabled
  const regSetting = await prisma.setting.findUnique({ where: { key: 'registration_enabled' } });
  if (regSetting?.value !== '1') return apiError('التسجيل مغلق حالياً', 403);

  let body: unknown;
  try { body = await req.json(); } catch(_e) { return apiError('بيانات غير صالحة'); }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message || 'بيانات غير صالحة');

  const { email, username, password, fullName } = parsed.data;

  // Check existing
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (exists) {
    if (exists.email === email) return apiError('هذا البريد الإلكتروني مسجل مسبقاً');
    return apiError('اسم المستخدم محجوز، اختر اسماً آخر');
  }

  const verifyToken = randomBytes(32).toString('hex');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  const hashed = await bcrypt.hash(password, 12); // cost 12

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hashed,
      fullName,
      role: 'VIEWER',
      status: 'PENDING',
      emailVerified: false,
      verifyToken,
      verifyExpires,
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'REGISTER', ip },
  }).catch(() => {});

  // Send verification email (non-blocking)
  sendVerificationEmail(email, fullName, verifyToken).catch(console.error);

  return apiSuccess({ message: 'تم إنشاء الحساب. يرجى تأكيد بريدك الإلكتروني' }, 201);
}
