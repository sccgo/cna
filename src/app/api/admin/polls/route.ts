import { NextRequest, NextResponse } from "next/server";
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
  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: { options: { include: { votes: true } } }
  });
  return NextResponse.json(polls);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json();
  const options: string[] = (body.options ?? []).filter((o: string) => o.trim());

  if (!body.question || options.length < 2) {
    return NextResponse.json({ error: "السؤال وخياران على الأقل مطلوبان" }, { status: 400 });
  }

  const poll = await prisma.poll.create({
    data: {
      question: body.question,
      endsAt: new Date(body.endsAt),
      active: true,
      options: { create: options.map((label) => ({ label })) }
    },
    include: { options: true }
  });

  return NextResponse.json(poll);
}
