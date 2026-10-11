import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { canWriteArticles, canPublishDirectly } from "@/lib/permissions";

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

export async function GET() {
  const session = await requireWriter();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: { department: true, author: true, reviewedBy: true }
  });
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const session = await requireWriter();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const role = (session.user as any).role;
  const body = await req.json();

  // محرر عادي لا يستطيع نشر مباشرة: أي طلب نشر منه يتحول تلقائياً
  // لبانتظار المراجعة. رئيس التحرير والمدير فقط ينشرون مباشرة.
  const requestedStatus = body.status ?? "DRAFT";
  const canDirect = canPublishDirectly(role);
  const finalStatus =
    !canDirect && requestedStatus === "PUBLISHED" ? "PENDING_REVIEW" : requestedStatus;

  const article = await prisma.article.create({
    data: {
      titleAr: body.titleAr,
      slug: slugify(body.titleAr),
      excerpt: body.excerpt || null,
      contentHtml: body.contentHtml || "",
      coverImageUrl: body.coverImageUrl || null,
      departmentId: body.departmentId || null,
      source: body.source ?? "LOCAL",
      sourceName: body.sourceName || null,
      sourceUrl: body.sourceUrl || null,
      status: finalStatus,
      submittedForReviewAt: finalStatus === "PENDING_REVIEW" ? new Date() : null,
      publishedAt: finalStatus === "PUBLISHED" ? new Date() : null,
      authorId: (session.user as any).id ?? null
    }
  });

  if (finalStatus === "PUBLISHED") {
    revalidatePath("/");
    revalidatePath("/newspaper");
  }

  return NextResponse.json(article);
}
