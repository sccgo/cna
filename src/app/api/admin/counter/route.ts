import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOperations } from "@/lib/permissions";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !canManageOperations((session.user as any).role)) return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const counters = await prisma.eventCounter.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(counters);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await req.json();

  if (body.active) {
    // Only one counter can be active/displayed at a time
    await prisma.eventCounter.updateMany({ data: { active: false } });
  }

  const counter = await prisma.eventCounter.create({
    data: {
      title: body.title,
      targetDate: new Date(body.targetDate),
      direction: body.direction ?? "DESCENDING",
      active: !!body.active,
      labelColor: body.labelColor ?? "#f4f1ea",
      numberColor: body.numberColor ?? "#c8952c",
      bgSolid: body.bgSolid ?? "#141c2f"
    }
  });
  revalidatePath("/");
  return NextResponse.json(counter);
}
