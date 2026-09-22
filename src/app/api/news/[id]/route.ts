import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { sanitizeHTML, apiError, apiSuccess, getClientIP } from '@/lib/security';
import { uploadImage, getFile, getFiles, deleteBlob } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { id: string } };

// ─── GET single news ──────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  const user = session.user;

  const news = await prisma.news.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
      ...(user && can(user.role, 'news:review') ? {} : { status: 'APPROVED' }),
    },
    include: {
      author:     { select: { fullName: true, username: true, role: true } },
      department: true,
      poll:       { include: { votes: { select: { optionIdx: true, userId: true } } } },
      counter:    true,
    },
  });

  if (!news) return apiError('الخبر غير موجود', 404);

  // Increment views (fire and forget)
  prisma.news.update({ where: { id: news.id }, data: { views: { increment: 1 } } }).catch(() => {});

  // Related news
  const related = await prisma.news.findMany({
    where: {
      id: { not: news.id },
      status: 'APPROVED',
      OR: [
        { departmentId: news.departmentId ?? undefined },
        { category: news.category },
      ],
    },
    take: 4,
    orderBy: { publishedAt: 'desc' },
    select: { id: true, title: true, titleEn: true, mainImage: true, publishedAt: true, department: { select: { name: true, slug: true } } },
  });

  // Did current user vote in poll?
  let userVotedIdx: number | null = null;
  if (news.poll && user) {
    const v = news.poll.votes.find(v => v.userId === user.id);
    userVotedIdx = v?.optionIdx ?? null;
  }

  // Aggregate poll votes
  const pollVoteCounts = news.poll
    ? news.poll.votes.reduce<Record<number, number>>((acc, v) => {
        acc[v.optionIdx] = (acc[v.optionIdx] || 0) + 1;
        return acc;
      }, {})
    : null;

  return apiSuccess({
    ...news,
    poll: news.poll ? { ...news.poll, voteCounts: pollVoteCounts, userVotedIdx, votes: undefined } : null,
    related,
  });
}

// ─── PUT update news ──────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('غير مصرح', 401);

  const existing = await prisma.news.findUnique({ where: { id: params.id } });
  if (!existing) return apiError('الخبر غير موجود', 404);

  const canEdit = can(user.role, 'news:edit_any') ||
    (can(user.role, 'news:edit_own') && existing.authorId === user.id);
  if (!canEdit) return apiError('ليس لديك صلاحية التعديل', 403);

  let fd: FormData;
  try { fd = await req.formData(); } catch(_e) { return apiError('بيانات غير صالحة'); }

  const title = (fd.get('title') as string)?.trim();
  if (!title) return apiError('العنوان مطلوب');

  const content = await sanitizeHTML(fd.get('content') as string || '');
  const contentEn = fd.get('content_en') ? await sanitizeHTML(fd.get('content_en') as string) : null;

  // Handle main image
  let mainImage = existing.mainImage;
  const mainImageFile = getFile(fd, 'main_image');
  if (mainImageFile) {
    try {
      const r = await uploadImage(mainImageFile);
      mainImage = r.url;
      if (existing.mainImage) deleteBlob(existing.mainImage).catch(() => {});
    } catch (e: any) { return apiError(e.message); }
  }

  // Gallery — append new images
  const newImgFiles = getFiles(fd, 'images');
  const newImages: string[] = [];
  for (const f of newImgFiles.slice(0, 10)) {
    try { const r = await uploadImage(f); newImages.push(r.url); } catch(_e) {}
  }

  // Delete removed images
  const deleteImages = (fd.get('delete_images') as string || '').split(',').filter(Boolean);
  const currentImages = existing.images.filter(i => !deleteImages.includes(i));
  if (deleteImages.length) deleteImages.forEach(url => deleteBlob(url).catch(() => {}));
  const allImages = [...currentImages, ...newImages];

  // Hero bg
  let heroBgImage = (existing.heroStyle as any)?.bgImage || null;
  const heroBgFile = getFile(fd, 'hero_bg_image');
  if (heroBgFile) {
    try { const r = await uploadImage(heroBgFile, 'backgrounds'); heroBgImage = r.url; } catch(_e) {}
  }

  // Determine new status
  const wasApproved = existing.status === 'APPROVED';
  const autoPublish = can(user.role, 'news:publish');
  const newStatus = autoPublish ? 'APPROVED' : 'PENDING_REVIEW';

  await prisma.news.update({
    where: { id: params.id },
    data: {
      title,
      titleEn:      (fd.get('title_en') as string)?.trim() || null,
      shortDesc:    (fd.get('short_description') as string)?.trim() || null,
      shortDescEn:  (fd.get('short_description_en') as string)?.trim() || null,
      content,
      contentEn,
      lang:         fd.get('lang') as string || existing.lang,
      mainImage,
      images:       allImages,
      isBreaking:   fd.get('is_breaking') === '1' && can(user.role, 'news:breaking'),
      breakingStyle:fd.get('breaking_style') as string || 'ticker',
      isFeatured:   fd.get('is_featured') === '1' && can(user.role, 'news:featured'),
      isLive:       fd.get('is_live') === '1',
      liveUrl:      fd.get('live_url') as string || null,
      category:     fd.get('category') as string || existing.category,
      departmentId: fd.get('department_id') as string || null,
      tags:         (fd.get('tags') as string || '').split(',').map(t => t.trim()).filter(Boolean),
      source:       fd.get('source') as string || null,
      sourceUrl:    fd.get('source_url') as string || null,
      heroStyle:    {
        bgType:  fd.get('hero_bg_type') as string || 'white',
        bgValue: fd.get('hero_bg_value') as string || '',
        bgImage: heroBgImage,
      },
      status:       newStatus,
      publishedAt:  newStatus === 'APPROVED' && !wasApproved ? new Date() : existing.publishedAt,
    },
  });

  return apiSuccess({ id: params.id, status: newStatus });
}

// ─── PATCH — review/approve/reject ───────────────────────────
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('غير مصرح', 401);
  if (!can(user.role, 'news:review')) return apiError('ليس لديك صلاحية المراجعة', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');
  const { action, note } = body;

  if (!['approve', 'reject'].includes(action)) return apiError('إجراء غير صالح');

  const news = await prisma.news.findUnique({ where: { id: params.id } });
  if (!news) return apiError('الخبر غير موجود', 404);

  await prisma.news.update({
    where: { id: params.id },
    data: {
      status:      action === 'approve' ? 'APPROVED' : 'REJECTED',
      reviewNote:  note || null,
      publishedAt: action === 'approve' ? (news.publishedAt ?? new Date()) : news.publishedAt,
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: `NEWS_${action.toUpperCase()}`, entity: 'news', entityId: params.id },
  }).catch(() => {});

  return apiSuccess({ status: action === 'approve' ? 'APPROVED' : 'REJECTED' });
}

// ─── DELETE ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('غير مصرح', 401);
  if (!can(user.role, 'news:delete')) return apiError('ليس لديك صلاحية الحذف', 403);

  const news = await prisma.news.findUnique({ where: { id: params.id } });
  if (!news) return apiError('الخبر غير موجود', 404);

  // Delete associated blobs
  if (news.mainImage) deleteBlob(news.mainImage).catch(() => {});
  news.images.forEach(url => deleteBlob(url).catch(() => {}));

  await prisma.news.delete({ where: { id: params.id } });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'NEWS_DELETE', entity: 'news', entityId: params.id,
      details: { title: news.title } },
  }).catch(() => {});

  return apiSuccess({ deleted: true });
}
