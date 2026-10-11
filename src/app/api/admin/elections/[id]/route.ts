import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOperations } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageOperations((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await req.json();
  const state = await prisma.electionState.update({
    where: { id: params.id },
    data: {
      votesCandidateA: body.votesCandidateA,
      votesCandidateB: body.votesCandidateB,
      leaning: body.leaning,
      reportingPercent: body.reportingPercent
    }
  });

  revalidatePath("/elections");
  return NextResponse.json(state);
}
