import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { apiError, apiSuccess } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('يجب تسجيل الدخول للتصويت', 401);
  if (user.status !== 'APPROVED') return apiError('حسابك لم يُعتمد بعد', 403);

  const body = await req.json().catch(() => null);
  if (!body) return apiError('بيانات غير صالحة');
  const { electionId, candidateId, state } = body;

  if (!electionId || !candidateId) return apiError('بيانات التصويت غير مكتملة');

  const election = await prisma.election.findUnique({ where: { id: electionId } });
  if (!election) return apiError('الانتخابات غير موجودة', 404);
  if (!election.isActive) return apiError('هذه الانتخابات غير نشطة');
  if (election.endsAt && election.endsAt < new Date()) return apiError('انتهت مدة التصويت');

  // Verify candidate exists
  const candidates = election.candidates as Array<{ id: string }>;
  if (!candidates.some(c => c.id === candidateId)) return apiError('مرشح غير صالح');

  try {
    await prisma.electionVote.create({
      data: { electionId, userId: user.id, candidateId, state: state || null },
    });
  } catch(_e) {
    return apiError('لقد صوتت بالفعل في هذه الانتخابات', 400);
  }

  // Update total vote count
  await prisma.election.update({
    where: { id: electionId },
    data: { totalVotes: { increment: 1 } },
  });

  return apiSuccess({ voted: true, candidateId });
}
