import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';

export const runtime  = 'nodejs';
export const dynamic  = 'force-dynamic';

// Banners stored as JSON in Settings key 'ad_banners'
type Banner = {
  id: string;
  type: 'image' | 'html' | 'text';
  position: string; // after which dept slug or 'top'
  imageUrl?: string;
  html?: string;
  text?: string;
  link?: string;
  bgColor?: string;
  bgImage?: string;
  textColor?: string;
  isTransparent?: boolean;
  isActive: boolean;
};

async function getBanners(): Promise<Banner[]> {
  const row = await prisma.setting.findUnique({ where: { key: 'ad_banners' } });
  if (!row?.value) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

async function saveBanners(banners: Banner[]) {
  await prisma.setting.upsert({
    where: { key: 'ad_banners' },
    update: { value: JSON.stringify(banners) },
    create: { key: 'ad_banners', value: JSON.stringify(banners) },
  });
}

export async function GET() {
  const banners = await getBanners();
  return apiSuccess(banners.filter(b => b.isActive));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'settings:theme')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');

  const banners = await getBanners();
  const newBanner: Banner = {
    id:            Date.now().toString(),
    type:          body.type || 'text',
    position:      body.position || 'top',
    imageUrl:      body.imageUrl || '',
    html:          body.html || '',
    text:          body.text || '',
    link:          body.link || '',
    bgColor:       body.bgColor || '#000000',
    bgImage:       body.bgImage || '',
    textColor:     body.textColor || '#ffffff',
    isTransparent: !!body.isTransparent,
    isActive:      true,
  };
  banners.push(newBanner);
  await saveBanners(banners);
  return apiSuccess({ id: newBanner.id }, 201);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'settings:theme')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body?.id) return apiError('ID مطلوب');

  const banners = await getBanners();
  const idx = banners.findIndex(b => b.id === body.id);
  if (idx === -1) return apiError('البنر غير موجود', 404);
  banners[idx] = { ...banners[idx], ...body };
  await saveBanners(banners);
  return apiSuccess({ updated: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'settings:theme')) return apiError('غير مصرح', 403);

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return apiError('ID مطلوب');

  const banners = (await getBanners()).filter(b => b.id !== id);
  await saveBanners(banners);
  return apiSuccess({ deleted: true });
}
