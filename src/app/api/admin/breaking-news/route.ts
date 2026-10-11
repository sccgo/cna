import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
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
  const items = await prisma.breakingNews.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const body = await req.json();
  const item = await prisma.breakingNews.create({
    data: {
      text: body.text,
      display: body.display ?? "TICKER",
      isAuto: false,
      active: true,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
    }
  });
  revalidatePath("/");
  return NextResponse.json(item);
}
