import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess, getClientIP } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/elections
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const active = sp.get('active') === '1';
  const id = sp.get('id');

  if (id) {
    const election = await prisma.election.findUnique({
      where: { id },
      include: { _count: { select: { votes: true } } },
    });
    if (!election) return apiError('الانتخابات غير موجودة', 404);

    // Get vote counts per candidate + per state (US)
    const voteCounts = await prisma.electionVote.groupBy({
      by: ['candidateId', 'state'],
      where: { electionId: id },
      _count: { _all: true },
    });

    // Tally per candidate
    const candidateTotals: Record<string, number> = {};
    const stateResults: Record<string, Record<string, number>> = {};

    for (const v of voteCounts) {
      candidateTotals[v.candidateId] = (candidateTotals[v.candidateId] || 0) + v._count._all;
      if (v.state) {
        if (!stateResults[v.state]) stateResults[v.state] = {};
        stateResults[v.state][v.candidateId] = (stateResults[v.state][v.candidateId] || 0) + v._count._all;
      }
    }

    const session = await getSession();
    const user = session.user;
    let userVote = null;
    if (user) {
      userVote = await prisma.electionVote.findUnique({
        where: { electionId_userId: { electionId: id, userId: user.id } },
        select: { candidateId: true, state: true },
      });
    }

    return apiSuccess({
      ...election,
      totalVotes: election._count.votes,
      candidateTotals,
      stateResults,
      userVote,
    });
  }

  const elections = await prisma.election.findMany({
    where: active ? { isActive: true } : {},
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { votes: true } } },
  });

  return apiSuccess(elections);
}

// POST /api/elections — create election (Director only)
export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'elections:create')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');

  const { title, titleEn, type, description, endsAt, candidates } = body;
  if (!title || !candidates?.length) return apiError('العنوان والمرشحون مطلوبان');
  if (!['local', 'us_presidential'].includes(type)) return apiError('نوع انتخابات غير صالح');

  const election = await prisma.election.create({
    data: {
      title: title.trim(),
      titleEn: titleEn?.trim() || null,
      type,
      description: description?.trim() || null,
      endsAt: endsAt ? new Date(endsAt) : null,
      candidates,
      isActive: true,
    },
  });

  // Set as active election in settings
  await prisma.setting.upsert({
    where: { key: 'election_active_id' },
    update: { value: election.id },
    create: { key: 'election_active_id', value: election.id },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'ELECTION_CREATE', entity: 'election', entityId: election.id },
  }).catch(() => {});

  return apiSuccess({ id: election.id }, 201);
}

// PATCH /api/elections — manage (activate/deactivate/end)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'elections:manage')) return apiError('غير مصرح', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');
  const { electionId, action, stateData } = body;

  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return apiError('الانتخابات غير موجودة', 404);

  if (action === 'activate') {
    await prisma.election.update({ where: { id: electionId }, data: { isActive: true } });
    await prisma.setting.upsert({ where:{key:'election_active_id'}, update:{value:electionId}, create:{key:'election_active_id',value:electionId} });
  } else if (action === 'deactivate') {
    await prisma.election.update({ where: { id: electionId }, data: { isActive: false } });
  } else if (action === 'update_states' && stateData) {
    // Update US state results manually (for director override)
    await prisma.election.update({ where: { id: electionId }, data: { stateData } });
  } else if (action === 'declare_winner') {
    const { winner } = body;
    await prisma.election.update({ where: { id: electionId }, data: { winner, isActive: false } });
  }

  return apiSuccess({ success: true });
}
