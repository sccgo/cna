import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageAllRoles, canManageEditors } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !(canManageAllRoles(role) || canManageEditors(role))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const isDirector = canManageAllRoles(role);
  const users = await prisma.user.findMany({
    where: isDirector ? { status: "APPROVED" } : { status: "APPROVED", role: "EDITOR" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, role: true, canEdit: true }
  });
  return NextResponse.json(users);
}
