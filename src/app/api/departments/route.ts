import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const depts = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    include: { _count: { select: { news: { where: { status: 'APPROVED' } } } } },
  });
  return apiSuccess(depts);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'departments:manage')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');
  const { name, nameEn, slug, color, icon } = body;
  if (!name?.trim() || !slug?.trim()) return apiError('الاسم والمعرف مطلوبان');
  if (!/^[a-z0-9-]+$/.test(slug)) return apiError('المعرف يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطة فقط');

  try {
    const maxOrder = await prisma.department.aggregate({ _max: { order: true } });
    const dept = await prisma.department.create({
      data: { name: name.trim(), nameEn: nameEn?.trim()||null, slug: slug.trim(), color: color||'#0a0a0a', icon: icon||null, order: (maxOrder._max.order||0)+1 },
    });
    return apiSuccess({ id: dept.id }, 201);
  } catch(_e) { return apiError('هذه الشعبة موجودة مسبقاً'); }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'departments:manage')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body?.id) return apiError('ID مطلوب');
  const { id, name, nameEn, color, icon, isActive, order } = body;

  await prisma.department.update({
    where: { id },
    data: { name: name?.trim(), nameEn: nameEn?.trim()||null, color, icon, isActive, order },
  });
  return apiSuccess({ updated: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'departments:manage')) return apiError('غير مصرح', 403);

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return apiError('ID مطلوب');

  const newsCount = await prisma.news.count({ where: { departmentId: id } });
  if (newsCount > 0) return apiError(`لا يمكن حذف الشعبة - يوجد ${newsCount} خبر مرتبط بها`);

  await prisma.department.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
