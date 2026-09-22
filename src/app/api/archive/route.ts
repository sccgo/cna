import { prisma } from '@/lib/db';
import { apiSuccess } from '@/lib/security';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  // Use Prisma's findMany and group in JS for compatibility
  const news = await prisma.news.findMany({
    where: { status: 'APPROVED', publishedAt: { not: null } },
    select: { publishedAt: true },
    orderBy: { publishedAt: 'desc' },
  }).catch(() => []);

  const map: Record<string, number> = {};
  for (const n of news) {
    if (!n.publishedAt) continue;
    const d = new Date(n.publishedAt);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    map[key] = (map[key]||0) + 1;
  }

  const result = Object.entries(map)
    .sort((a,b) => b[0].localeCompare(a[0]))
    .slice(0, 24)
    .map(([key, count]) => {
      const [year, month] = key.split('-');
      return { year, month, count };
    });

  return apiSuccess(result);
}
