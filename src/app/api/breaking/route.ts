import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await prisma.breakingNews.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return apiSuccess(items);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'news:breaking')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');

  const { text, textEn, style, bgColor, textColor, linkUrl, expiresAt } = body;
  if (!text?.trim()) return apiError('النص مطلوب');

  const item = await prisma.breakingNews.create({
    data: {
      text: text.trim(),
      textEn: textEn?.trim() || null,
      style: style || 'ticker',
      bgColor: bgColor || '#cc0000',
      textColor: textColor || '#ffffff',
      linkUrl: linkUrl || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
    },
  });

  return apiSuccess({ id: item.id }, 201);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'news:breaking')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body?.id) return apiError('ID مطلوب');

  await prisma.breakingNews.update({
    where: { id: body.id },
    data: { isActive: body.isActive ?? true },
  });

  return apiSuccess({ updated: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'news:breaking')) return apiError('غير مصرح', 403);

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return apiError('ID مطلوب');

  await prisma.breakingNews.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
