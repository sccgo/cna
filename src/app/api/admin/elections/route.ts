import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { US_STATES } from "@/lib/usStatesGrid";
import { canManageOperations } from "@/lib/permissions";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageOperations((session.user as any).role)) return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const cycles = await prisma.electionCycle.findMany({ include: { states: true }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json(cycles);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { title } = await req.json();

  await prisma.electionCycle.updateMany({ data: { active: false } });

  const cycle = await prisma.electionCycle.create({
    data: {
      title,
      active: true,
      states: {
        create: US_STATES.map((s) => ({
          stateCode: s.code,
          stateName: s.nameAr,
          electoralVotes: s.ev,
          leaning: "TOSSUP"
        }))
      }
    },
    include: { states: true }
  });

  revalidatePath("/elections");
  return NextResponse.json(cycle);
}
