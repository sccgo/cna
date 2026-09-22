import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'analytics:read')) return apiError('غير مصرح', 403);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - 7 * 86400000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalNews, publishedNews, pendingNews, breakingNews,
    totalUsers, activeUsers, pendingUsers,
    totalViews, topNews,
    newsThisWeek, newsThisMonth, newsLastMonth,
    totalElections, activeElections, totalVotes,
    totalNewspapers,
    recentActivity,
    deptStats,
  ] = await Promise.all([
    prisma.news.count(),
    prisma.news.count({ where: { status: 'APPROVED' } }),
    prisma.news.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.news.count({ where: { isBreaking: true, status: 'APPROVED' } }),
    prisma.user.count(),
    prisma.user.count({ where: { status: 'APPROVED' } }),
    prisma.user.count({ where: { status: 'VERIFIED' } }),
    prisma.news.aggregate({ _sum: { views: true }, where: { status: 'APPROVED' } }),
    prisma.news.findMany({
      where: { status: 'APPROVED' },
      orderBy: { views: 'desc' },
      take: 10,
      select: { id:true, title:true, views:true, publishedAt:true, department:{ select:{ name:true } } },
    }),
    prisma.news.count({ where: { createdAt: { gte: thisWeek } } }),
    prisma.news.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.news.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
    prisma.election.count(),
    prisma.election.count({ where: { isActive: true } }),
    prisma.electionVote.count(),
    prisma.newspaper.count({ where: { isPublished: true } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { fullName:true, username:true, role:true } } },
    }),
    prisma.department.findMany({
      include: {
        _count: { select: { news: { where: { status:'APPROVED' } } } },
      },
      orderBy: { order: 'asc' },
    }),
  ]);

  // Views by day for last 7 days (approximate from publishedAt + views)
  const viewsByDay = await prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
    SELECT DATE(published_at) as day, SUM(views) as count
    FROM "News"
    WHERE status = 'APPROVED' AND published_at >= ${thisWeek}
    GROUP BY DATE(published_at)
    ORDER BY day ASC
  `.catch(() => []);

  return apiSuccess({
    news: {
      total: totalNews,
      published: publishedNews,
      pending: pendingNews,
      breaking: breakingNews,
      thisWeek: newsThisWeek,
      thisMonth: newsThisMonth,
      lastMonth: newsLastMonth,
      growth: newsLastMonth > 0 ? Math.round(((newsThisMonth - newsLastMonth) / newsLastMonth) * 100) : 0,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      pending: pendingUsers,
    },
    views: {
      total: totalViews._sum.views || 0,
      byDay: viewsByDay.map(r => ({ day: r.day, count: Number(r.count) })),
    },
    topNews,
    elections: {
      total: totalElections,
      active: activeElections,
      totalVotes,
    },
    newspapers: { total: totalNewspapers },
    departments: deptStats.map(d => ({
      id: d.id, name: d.name, color: d.color,
      newsCount: d._count.news,
    })),
    recentActivity: recentActivity.map(a => ({
      id: a.id,
      action: a.action,
      entity: a.entity,
      entityId: a.entityId,
      details: a.details,
      createdAt: a.createdAt,
      user: a.user ? { fullName: a.user.fullName, username: a.user.username, role: a.user.role } : null,
    })),
  });
}
