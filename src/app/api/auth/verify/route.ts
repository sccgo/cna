import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { prisma } from '@/lib/db';
import { sessionOptions, SessionData } from '@/lib/session';
import { apiError, apiSuccess } from '@/lib/security';
import { sendApprovalEmail, sendNewRegistrationAlert } from '@/lib/email';

export const runtime = 'nodejs';

// GET /api/auth/verify?token=xxx
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return apiError('رمز التحقق مطلوب');

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user) return apiError('رمز التحقق غير صالح أو منتهي', 400);
  if (user.verifyExpires && user.verifyExpires < new Date()) {
    return apiError('انتهت صلاحية رمز التحقق. أعد التسجيل', 400);
  }
  if (user.emailVerified) return apiSuccess({ message: 'تم تأكيد بريدك مسبقاً', alreadyVerified: true });

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, status: 'VERIFIED', verifyToken: null, verifyExpires: null },
  });

  // Notify admissions of new pending user
  sendNewRegistrationAlert(user.fullName, user.email).catch(console.error);

  return apiSuccess({ message: 'تم تأكيد بريدك الإلكتروني بنجاح. طلبك قيد المراجعة.' });
}
