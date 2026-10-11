import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageEditors } from "@/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageEditors((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!target || target.role !== "EDITOR") {
    return NextResponse.json({ error: "هذا الإجراء لحسابات المحررين فقط" }, { status: 400 });
  }

  const { canEdit } = await req.json();
  const user = await prisma.user.update({ where: { id: params.userId }, data: { canEdit } });
  return NextResponse.json({ id: user.id, canEdit: user.canEdit });
}
