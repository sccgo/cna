import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { apiError, apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('يجب تسجيل الدخول للتصويت', 401);
  if (user.status !== 'APPROVED') return apiError('حسابك غير معتمد', 403);

  const body = await req.json().catch(() => null);
  if (body === null || body.optionIdx === undefined) return apiError('بيانات غير صالحة');

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: { votes: { where: { userId: user.id } } },
  });
  if (!poll) return apiError('الاستطلاع غير موجود', 404);
  if (!poll.isActive) return apiError('الاستطلاع غير نشط');
  if (poll.expiresAt && poll.expiresAt < new Date()) return apiError('انتهت مدة التصويت');
  if (poll.votes.length > 0) return apiError('لقد صوّتت بالفعل في هذا الاستطلاع', 400);

  const idx = parseInt(body.optionIdx);
  if (isNaN(idx) || idx < 0 || idx >= poll.options.length) return apiError('خيار غير صالح');

  await prisma.pollVote.create({ data: { pollId: poll.id, userId: user.id, optionIdx: idx } });

  const allVotes = await prisma.pollVote.groupBy({
    by: ['optionIdx'], where: { pollId: poll.id }, _count: { _all: true },
  });
  const voteCounts: Record<number,number> = {};
  for (const v of allVotes) voteCounts[v.optionIdx] = v._count._all;
  const total = Object.values(voteCounts).reduce((a,b)=>a+b,0);

  return apiSuccess({ voted: true, optionIdx: idx, voteCounts, total });
}
