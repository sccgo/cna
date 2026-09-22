import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can, isHigherRole, ROLE_LABELS_AR } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email';
import { Role } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'users:read')) return apiError('غير مصرح', 403);

  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') || undefined;
  const role   = sp.get('role')   || undefined;
  const search = sp.get('search') || undefined;
  const page   = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit  = Math.min(100, parseInt(sp.get('limit') || '20'));

  const where: any = {};
  if (status) where.status = status;
  if (role)   where.role   = role;
  if (search) where.OR = [
    { fullName: { contains: search, mode: 'insensitive' } },
    { username: { contains: search, mode: 'insensitive' } },
    { email:    { contains: search, mode: 'insensitive' } },
  ];

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, username: true, fullName: true,
        role: true, status: true, emailVerified: true,
        lastLoginAt: true, createdAt: true, rejectionNote: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return apiSuccess({ users, total, page, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('غير مصرح', 401);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');
  const { userId, action, role, note } = body;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return apiError('المستخدم غير موجود', 404);
  if (target.id === user.id) return apiError('لا يمكن تعديل حسابك الخاص بهذه الطريقة');

  switch (action) {
    case 'approve':
      if (!can(user.role, 'users:approve')) return apiError('غير مصرح', 403);
      if (!target.emailVerified) return apiError('لم يتحقق المستخدم من بريده بعد');
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'APPROVED', approvedBy: user.id, approvedAt: new Date(), rejectionNote: null },
      });
      await prisma.notification.create({
        data: { userId, type: 'approval', title: 'تمت الموافقة على حسابك', message: 'يمكنك الآن تسجيل الدخول والاستمتاع بالعضوية' },
      }).catch(() => {});
      sendApprovalEmail(target.email, target.fullName).catch(console.error);
      break;

    case 'reject':
      if (!can(user.role, 'users:reject')) return apiError('غير مصرح', 403);
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'REJECTED', rejectionNote: note || null },
      });
      sendRejectionEmail(target.email, target.fullName, note).catch(console.error);
      break;

    case 'suspend':
      if (!can(user.role, 'users:suspend')) return apiError('غير مصرح', 403);
      await prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
      break;

    case 'reactivate':
      if (!can(user.role, 'users:suspend')) return apiError('غير مصرح', 403);
      await prisma.user.update({ where: { id: userId }, data: { status: 'APPROVED' } });
      break;

    case 'change_role':
      if (!can(user.role, 'users:manage_roles')) return apiError('فقط رئيس الوكالة يمكنه تغيير الأدوار', 403);
      if (!Object.values(Role).includes(role)) return apiError('دور غير صالح');
      if (!isHigherRole(user.role, target.role)) return apiError('لا يمكنك تعديل مستخدم بصلاحيات أعلى منك');
      if (role === 'DIRECTOR' && user.role !== 'DIRECTOR') return apiError('لا يمكنك تعيين مدير');
      await prisma.user.update({ where: { id: userId }, data: { role } });
      await prisma.notification.create({
        data: { userId, type: 'role_change', title: 'تم تعديل دورك', message: `تم تعيينك كـ ${ROLE_LABELS_AR[role as Role]}` },
      }).catch(() => {});
      break;

    case 'delete':
      if (!can(user.role, 'users:delete')) return apiError('غير مصرح', 403);
      if (target.role === 'DIRECTOR') return apiError('لا يمكن حذف رئيس الوكالة');
      await prisma.user.delete({ where: { id: userId } });
      break;

    default:
      return apiError('إجراء غير معروف');
  }

  await prisma.activityLog.create({
    data: { userId: user.id, action: `USER_${action.toUpperCase()}`, entity: 'user', entityId: userId, details: { note, role } },
  }).catch(() => {});

  return apiSuccess({ success: true, action });
}
