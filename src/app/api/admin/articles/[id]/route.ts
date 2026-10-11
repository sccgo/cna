import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteArticles, canPublishDirectly, canDeleteContent } from "@/lib/permissions";

async function requireWriter() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !canWriteArticles(role)) return null;

  if (role === "EDITOR") {
    const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
    if (!user?.canEdit) return null;
  }

  return session;
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireWriter();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  const article = await prisma.article.findUnique({ where: { id: params.id } });
  if (!article) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(article);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireWriter();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const role = (session.user as any).role;
  const body = await req.json();
  const current = await prisma.article.findUnique({ where: { id: params.id } });
  if (!current) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // محرر عادي: أي تعديل يعيد المقال لبانتظار المراجعة، حتى لو كان منشوراً
  // من قبل — لا يستطيع نشر تعديلاته مباشرة بنفسه.
  const canDirect = canPublishDirectly(role);
  let finalStatus = body.status ?? current.status;
  if (!canDirect) {
    finalStatus = finalStatus === "DRAFT" ? "DRAFT" : "PENDING_REVIEW";
  }

  const becomingPublished = finalStatus === "PUBLISHED" && current.status !== "PUBLISHED";

  const article = await prisma.article.update({
    where: { id: params.id },
    data: {
      titleAr: body.titleAr,
      excerpt: body.excerpt || null,
      contentHtml: body.contentHtml,
      coverImageUrl: body.coverImageUrl || null,
      departmentId: body.departmentId || null,
      status: finalStatus,
      submittedForReviewAt: finalStatus === "PENDING_REVIEW" ? new Date() : current.submittedForReviewAt,
      publishedAt: becomingPublished ? new Date() : current.publishedAt
    }
  });

  revalidatePath("/");
  revalidatePath(`/article/${current.slug}`);

  return NextResponse.json(article);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || !canDeleteContent((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح — الحذف لرئيس التحرير والمدير فقط" }, { status: 403 });
  }
  await prisma.article.delete({ where: { id: params.id } });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
