import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageAllRoles } from "@/lib/permissions";

const VALID_ROLES = ["VIEWER", "EDITOR", "REVIEWER", "DEVELOPER", "EDITOR_IN_CHIEF", "ADMISSIONS", "DIRECTOR"];

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canManageAllRoles((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح — تعيين الأدوار للمدير فقط" }, { status: 403 });
  }

  const { role } = await req.json();
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
  }

  const user = await prisma.user.update({ where: { id: params.userId }, data: { role } });
  return NextResponse.json({ id: user.id, role: user.role });
}
