import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';
import { bumpThemeVersion } from '@/lib/theme';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'design:approve')) return apiError('غير مصرح', 403);

  const changes = await prisma.designChange.findMany({
    where: { status: 'PENDING' },
    include: { developer: { select: { fullName: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return apiSuccess(changes);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'design:approve')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.action) return apiError('بيانات غير صالحة');

  const change = await prisma.designChange.findUnique({ where: { id: body.id } });
  if (!change) return apiError('التعديل غير موجود', 404);

  if (body.action === 'approve') {
    // Apply settings immediately
    const settings = change.settings as Record<string, string>;
    await Promise.all(
      Object.entries(settings)
        .filter(([k]) => !k.startsWith('_'))
        .map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            update: { value: String(value), updatedBy: user.id },
            create: { key, value: String(value), updatedBy: user.id },
          })
        )
    );

    await prisma.designChange.update({
      where: { id: body.id },
      data: { status: 'APPROVED', reviewedBy: user.id, reviewedAt: new Date(), appliedAt: new Date() },
    });

    // Bump theme version to force all clients to reload CSS
    await bumpThemeVersion();

    await prisma.activityLog.create({
      data: { userId: user.id, action: 'DESIGN_APPROVE', entity: 'design_change', entityId: body.id },
    }).catch(() => {});

    return apiSuccess({ approved: true, message: 'تم تطبيق التصميم فوراً على الموقع' });
  }

  if (body.action === 'reject') {
    await prisma.designChange.update({
      where: { id: body.id },
      data: { status: 'REJECTED', reviewedBy: user.id, reviewedAt: new Date(), reviewNote: body.note || null },
    });
    return apiSuccess({ rejected: true });
  }

  return apiError('إجراء غير معروف');
}
