import { prisma } from '@/lib/db';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [settings, departments, breakingItems] = await Promise.all([
    prisma.setting.findMany().then(rows => {
      const s: Record<string,string> = {};
      rows.forEach(r => { s[r.key] = r.value; });
      return s;
    }).catch(() => ({})),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        news: {
          where: { status: 'APPROVED' },
          orderBy: { publishedAt: 'desc' },
          take: 8,
          select: {
            id:true, title:true, titleEn:true, slug:true,
            mainImage:true, shortDesc:true, isBreaking:true,
            isLive:true, views:true, publishedAt:true, createdAt:true,
          },
        },
      },
    }).catch(() => []),
    prisma.breakingNews.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: 'desc' }, take: 25,
    }).catch(() => []),
  ]);

  // Featured news for hero
  const featuredNews = await prisma.news.findFirst({
    where: { status: 'APPROVED', isFeatured: true },
    orderBy: { updatedAt: 'desc' },
    include: { department: true, counter: true },
  }).catch(() => null);

  // Top 4 latest news for left column
  const latestNews = await prisma.news.findMany({
    where: { status: 'APPROVED' },
    orderBy: { publishedAt: 'desc' },
    take: 4,
    select: { id:true, title:true, mainImage:true, publishedAt:true, createdAt:true, department:{ select:{ name:true, color:true } } },
  }).catch(() => []);

  // Banners
  const bannersRow = await prisma.setting.findUnique({ where: { key: 'ad_banners' } }).catch(() => null);
  const banners = bannersRow?.value ? JSON.parse(bannersRow.value).filter((b:any)=>b.isActive) : [];

  // Active election
  const activeElection = settings.election_active_id
    ? await prisma.election.findUnique({
        where: { id: settings.election_active_id },
        select: { id:true, title:true, type:true, isActive:true },
      }).catch(() => null)
    : null;

  return (
    <HomeClient
      settings={settings}
      departments={JSON.parse(JSON.stringify(departments))}
      breakingItems={JSON.parse(JSON.stringify(breakingItems))}
      featuredNews={featuredNews ? JSON.parse(JSON.stringify(featuredNews)) : null}
      latestNews={JSON.parse(JSON.stringify(latestNews))}
      banners={banners}
      activeElection={activeElection ? JSON.parse(JSON.stringify(activeElection)) : null}
    />
  );
}
