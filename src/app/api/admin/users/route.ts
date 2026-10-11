import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalDecision } from "@/lib/mailer";
import { canApproveAccounts } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canApproveAccounts((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const pending = await prisma.user.findMany({
    where: { status: "PENDING_ADMIN" },
    orderBy: { createdAt: "asc" }
  });
  return NextResponse.json(pending);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canApproveAccounts((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { userId, approve } = await req.json();

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status: approve ? "APPROVED" : "REJECTED" }
  });

  await sendApprovalDecision(user.email, approve);

  return NextResponse.json({ ok: true });
}
