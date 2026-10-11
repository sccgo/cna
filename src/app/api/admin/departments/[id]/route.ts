import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOperations } from "@/lib/permissions";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageOperations((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  await prisma.department.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
