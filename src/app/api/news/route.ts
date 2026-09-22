import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { NewsCreateSchema, sanitizeHTML, apiError, apiSuccess, getClientIP, rateLimitAPI } from '@/lib/security';
import { uploadImage, uploadMedia, getFile, getFiles } from '@/lib/upload';
import { sendContentReviewAlert } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET /api/news ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = rateLimitAPI(ip, 'news-list');
  if (!rl.success) return apiError('طلبات كثيرة', 429);

  const sp = req.nextUrl.searchParams;
  const page       = Math.max(1, parseInt(sp.get('page') || '1'));
  const limit      = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '12')));
  const offset     = (page - 1) * limit;
  const search     = sp.get('search')?.trim();
  const department = sp.get('department');
  const category   = sp.get('category');
  const breaking   = sp.get('breaking') === '1';
  const featured   = sp.get('featured') === '1';
  const live       = sp.get('live') === '1';
  const lang       = sp.get('lang');
  const archYear   = sp.get('year');
  const archMonth  = sp.get('month');
  const statusFilter = sp.get('status'); // admin use

  // Determine visible statuses based on session
  const session = await getSession();
  const user = session.user;
  const canSeeAll = user && can(user.role, 'news:review');
  const statusWhere = canSeeAll && statusFilter
    ? { status: statusFilter as any }
    : { status: 'APPROVED' as const };

  const where: any = { ...statusWhere };
  if (search) where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { shortDesc: { contains: search, mode: 'insensitive' } },
    { titleEn: { contains: search, mode: 'insensitive' } },
  ];
  if (department) where.department = { slug: department };
  if (category) where.category = category;
  if (breaking) where.isBreaking = true;
  if (featured) where.isFeatured = true;
  if (live) where.isLive = true;
  if (lang && lang !== 'both') where.lang = { in: [lang, 'both'] };
  if (archYear) {
    const y = parseInt(archYear);
    const m = archMonth ? parseInt(archMonth) - 1 : 0;
    where.publishedAt = {
      gte: new Date(y, m, 1),
      lt: archMonth ? new Date(y, m + 1, 1) : new Date(y + 1, 0, 1),
    };
  }

  const [news, total] = await Promise.all([
    prisma.news.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true, title: true, titleEn: true, slug: true,
        shortDesc: true, shortDescEn: true,
        mainImage: true, isBreaking: true, breakingStyle: true,
        isFeatured: true, isLive: true, lang: true,
        category: true, status: true, views: true,
        publishedAt: true, createdAt: true,
        author: { select: { fullName: true, username: true } },
        department: { select: { name: true, slug: true, color: true } },
      },
    }),
    prisma.news.count({ where }),
  ]);

  return apiSuccess({ news, total, page, pages: Math.ceil(total / limit) });
}

// ─── POST /api/news ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('غير مصرح', 401);
  if (!can(user.role, 'news:create')) return apiError('ليس لديك صلاحية إنشاء أخبار', 403);

  const ip = getClientIP(req);
  const rl = rateLimitAPI(ip, 'news-create');
  if (!rl.success) return apiError('طلبات كثيرة', 429);

  let fd: FormData;
  try { fd = await req.formData(); } catch(_e) { return apiError('بيانات غير صالحة'); }

  const raw = {
    title:        fd.get('title') as string,
    titleEn:      fd.get('title_en') as string || null,
    shortDesc:    fd.get('short_description') as string || null,
    shortDescEn:  fd.get('short_description_en') as string || null,
    content:      fd.get('content') as string || '',
    contentEn:    fd.get('content_en') as string || null,
    lang:         fd.get('lang') as string || 'ar',
    isBreaking:   fd.get('is_breaking') === '1',
    breakingStyle:fd.get('breaking_style') as string || 'ticker',
    isFeatured:   fd.get('is_featured') === '1',
    isLive:       fd.get('is_live') === '1',
    liveUrl:      fd.get('live_url') as string || null,
    category:     fd.get('category') as string || 'general',
    departmentId: fd.get('department_id') as string || null,
    tags:         (fd.get('tags') as string || '').split(',').map(t => t.trim()).filter(Boolean),
    source:       fd.get('source') as string || null,
    sourceUrl:    fd.get('source_url') as string || null,
    heroStyle: {
      bgType:  fd.get('hero_bg_type') as string || 'white',
      bgValue: fd.get('hero_bg_value') as string || '',
    },
  };

  const parsed = NewsCreateSchema.safeParse(raw);
  if (!parsed.success) return apiError(parsed.error.errors[0]?.message || 'بيانات غير صالحة');

  // Sanitize HTML content
  const content   = await sanitizeHTML(raw.content);
  const contentEn = raw.contentEn ? await sanitizeHTML(raw.contentEn) : null;

  // Handle image uploads
  let mainImage: string | null = null;
  const mainImageFile = getFile(fd, 'main_image');
  if (mainImageFile) {
    try { const r = await uploadImage(mainImageFile); mainImage = r.url; }
    catch (e: any) { return apiError(e.message); }
  }
  // Remote image URL (from scraper)
  if (!mainImage && fd.get('main_image_url')) {
    mainImage = fd.get('main_image_url') as string;
  }

  // Gallery images
  const imageFiles = getFiles(fd, 'images');
  const images: string[] = [];
  for (const f of imageFiles.slice(0, 10)) {
    try { const r = await uploadImage(f); images.push(r.url); } catch(_e) {}
  }

  // Hero bg image
  let heroBgImage: string | null = null;
  const heroBgFile = getFile(fd, 'hero_bg_image');
  if (heroBgFile) {
    try { const r = await uploadImage(heroBgFile, 'backgrounds'); heroBgImage = r.url; } catch(_e) {}
  }

  // Determine status
  const autoPublish = can(user.role, 'news:publish');
  const status = autoPublish ? 'APPROVED' : 'PENDING_REVIEW';

  // Generate unique slug
  const slug = await generateUniqueSlug(raw.title);

  const news = await prisma.news.create({
    data: {
      title:        raw.title.trim(),
      titleEn:      raw.titleEn?.trim() || null,
      slug,
      shortDesc:    raw.shortDesc?.trim() || null,
      shortDescEn:  raw.shortDescEn?.trim() || null,
      content,
      contentEn,
      lang:         raw.lang,
      mainImage,
      images,
      isBreaking:   raw.isBreaking && can(user.role, 'news:breaking'),
      breakingStyle:raw.breakingStyle,
      isFeatured:   raw.isFeatured && can(user.role, 'news:featured'),
      isLive:       raw.isLive,
      liveUrl:      raw.liveUrl || null,
      category:     raw.category,
      departmentId: raw.departmentId || null,
      tags:         raw.tags,
      source:       raw.source || null,
      sourceUrl:    raw.sourceUrl || null,
      heroStyle:    { ...raw.heroStyle, bgImage: heroBgImage },
      status,
      authorId:     user.id,
      publishedAt:  status === 'APPROVED' ? new Date() : null,
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'NEWS_CREATE', entity: 'news', entityId: news.id, ip },
  }).catch(() => {});

  // Notify reviewers if pending
  if (status === 'PENDING_REVIEW') {
    sendContentReviewAlert(news.title, news.id).catch(console.error);
  }

  return apiSuccess({ id: news.id, slug: news.slug, status }, 201);
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = title
    .toLowerCase()
    .replace(/[\u0600-\u06FF]/g, c => c) // keep Arabic
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 80) + '-' + Date.now();
  return base;
}
