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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await req.json();
  const poll = await prisma.poll.update({ where: { id: params.id }, data: { active: body.active } });
  return NextResponse.json(poll);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  await prisma.poll.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
