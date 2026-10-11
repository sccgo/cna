import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canReviewArticles } from "@/lib/permissions";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !canReviewArticles(role)) {
    return NextResponse.json({ error: "غير مصرح — المراجعة لمن لديه صلاحية المراجعة فقط" }, { status: 403 });
  }

  const { approve, note } = await req.json();
  const current = await prisma.article.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (current.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "هذا المقال ليس بانتظار المراجعة" }, { status: 400 });
  }

  const article = await prisma.article.update({
    where: { id: params.id },
    data: {
      status: approve ? "PUBLISHED" : "REJECTED",
      reviewedById: (session.user as any).id ?? null,
      reviewNote: note || null,
      publishedAt: approve ? new Date() : null
    }
  });

  if (approve) {
    revalidatePath("/");
    revalidatePath("/newspaper");
  }

  return NextResponse.json(article);
}
