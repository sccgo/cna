import { prisma } from '@/lib/db';
import HomeClient from './HomeClient';

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, departments, featuredNews, breakingItems] = await Promise.all([
    prisma.setting.findMany().then(rows => {
      const s: Record<string,string> = {};
      rows.forEach(r => s[r.key] = r.value);
      return s;
    }).catch(() => ({})),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { order: 'asc' } }).catch(() => []),
    prisma.news.findFirst({
      where: { status: 'APPROVED', isFeatured: true },
      orderBy: { updatedAt: 'desc' },
      include: { author: { select: { fullName: true } }, department: true, counter: true },
    }).catch(() => null),
    prisma.breakingNews.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: 'desc' }, take: 25,
    }).catch(() => []),
  ]);

  const activeElectionId = settings.election_active_id;
  let activeElection = null;
  if (activeElectionId) {
    activeElection = await prisma.election.findUnique({
      where: { id: activeElectionId },
      select: { id: true, title: true, type: true, endsAt: true, isActive: true },
    }).catch(() => null);
  }

  return (
    <HomeClient
      settings={settings}
      departments={departments}
      featuredNews={featuredNews ? JSON.parse(JSON.stringify(featuredNews)) : null}
      breakingItems={JSON.parse(JSON.stringify(breakingItems))}
      activeElection={activeElection ? JSON.parse(JSON.stringify(activeElection)) : null}
    />
  );
}
