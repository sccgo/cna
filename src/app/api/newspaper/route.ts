import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const id = sp.get('id');
  const published = sp.get('published') !== '0';

  if (id) {
    const paper = await prisma.newspaper.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNum: 'asc' },
          include: {
            items: {
              orderBy: { order: 'asc' },
              include: { news: { select: { id:true, title:true, titleEn:true, mainImage:true, shortDesc:true, content:true } } },
            },
          },
        },
      },
    });
    if (!paper) return apiError('الجريدة غير موجودة', 404);
    return apiSuccess(paper);
  }

  const papers = await prisma.newspaper.findMany({
    where: published ? { isPublished: true } : {},
    orderBy: { date: 'desc' },
    take: 30,
    select: { id:true, title:true, edition:true, date:true, isPublished:true, coverImage:true, template:true, createdAt:true },
  });
  return apiSuccess(papers);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'newspaper:create')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');

  const { title, edition, date, template, pages, autoGenerate } = body;
  if (!title?.trim()) return apiError('عنوان الجريدة مطلوب');

  // Auto-generate pages from recent approved news
  let resolvedPages = pages;
  if (autoGenerate) {
    resolvedPages = await autoGeneratePages();
  }

  if (!resolvedPages?.length || resolvedPages.length < 1) return apiError('يجب أن تحتوي الجريدة على صفحة واحدة على الأقل');

  const maxEdition = await prisma.newspaper.aggregate({ _max: { edition: true } });
  const newEdition = edition || (maxEdition._max.edition || 0) + 1;

  const paper = await prisma.newspaper.create({
    data: {
      title: title.trim(),
      edition: newEdition,
      date: date ? new Date(date) : new Date(),
      template: template || 'classic',
      pages: {
        create: resolvedPages.map((p: any, idx: number) => ({
          pageNum: p.pageNum || idx + 1,
          section: p.section || 'general',
          sectionAr: p.sectionAr || 'عام',
          layout: p.layout || 'standard',
          items: {
            create: (p.items || []).map((item: any, order: number) => ({
              newsId: item.newsId || null,
              title: item.title || null,
              content: item.content || null,
              image: item.image || null,
              order,
              size: item.size || 'medium',
            })),
          },
        })),
      },
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'NEWSPAPER_CREATE', entity: 'newspaper', entityId: paper.id },
  }).catch(() => {});

  return apiSuccess({ id: paper.id, edition: paper.edition }, 201);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'newspaper:publish')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body?.id) return apiError('ID مطلوب');

  const { id, action, pdfUrl, coverImage } = body;

  if (action === 'publish') {
    await prisma.newspaper.update({ where: { id }, data: { isPublished: true } });
  } else if (action === 'unpublish') {
    await prisma.newspaper.update({ where: { id }, data: { isPublished: false } });
  } else if (action === 'set_pdf') {
    await prisma.newspaper.update({ where: { id }, data: { pdfUrl } });
  } else if (action === 'set_cover') {
    await prisma.newspaper.update({ where: { id }, data: { coverImage } });
  }

  return apiSuccess({ updated: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'newspaper:delete')) return apiError('غير مصرح', 403);

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return apiError('ID مطلوب');

  await prisma.newspaper.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}

// Auto-generate 16 pages from recent news
async function autoGeneratePages() {
  const sections = [
    { section: 'local',         sectionAr: 'محلي',       count: 5 },
    { section: 'international', sectionAr: 'دولي',        count: 3 },
    { section: 'economy',       sectionAr: 'اقتصاد',     count: 2 },
    { section: 'politics',      sectionAr: 'سياسة',      count: 2 },
    { section: 'sports',        sectionAr: 'رياضة',      count: 2 },
    { section: 'culture',       sectionAr: 'ثقافة وفنون', count: 2 },
  ];

  const pages = [];
  let pageNum = 1;

  // Cover page
  const featuredNews = await prisma.news.findFirst({
    where: { status: 'APPROVED', isFeatured: true },
    orderBy: { publishedAt: 'desc' },
    select: { id:true, title:true, mainImage:true, shortDesc:true },
  });
  pages.push({
    pageNum: pageNum++,
    section: 'cover',
    sectionAr: 'الغلاف',
    layout: 'featured',
    items: featuredNews ? [{ newsId: featuredNews.id, size: 'full' }] : [],
  });

  for (const sec of sections) {
    const news = await prisma.news.findMany({
      where: {
        status: 'APPROVED',
        OR: [{ department: { slug: sec.section } }, { category: sec.section }],
      },
      orderBy: { publishedAt: 'desc' },
      take: sec.count * 3,
      select: { id:true, title:true, mainImage:true, shortDesc:true },
    });

    // Fill pages for this section
    let chunk: typeof news = [];
    for (const item of news) {
      chunk.push(item);
      if (chunk.length >= 3) {
        pages.push({
          pageNum: pageNum++,
          section: sec.section,
          sectionAr: sec.sectionAr,
          layout: 'standard',
          items: chunk.map((n, i) => ({ newsId: n.id, size: i === 0 ? 'large' : 'medium' })),
        });
        chunk = [];
        if (pages.length >= 16) break;
      }
    }
    if (chunk.length && pages.length < 16) {
      pages.push({
        pageNum: pageNum++,
        section: sec.section,
        sectionAr: sec.sectionAr,
        layout: 'standard',
        items: chunk.map((n,i) => ({ newsId: n.id, size: i===0?'large':'medium' })),
      });
    }
    if (pages.length >= 16) break;
  }

  // Pad to 16 minimum
  while (pages.length < 16) {
    pages.push({ pageNum: pageNum++, section: 'general', sectionAr: 'عام', layout: 'standard', items: [] });
  }

  return pages;
}
