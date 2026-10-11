import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import type { NewsApiArticle } from "@/lib/newsapi";
import { canWriteArticles, canPublishDirectly } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !canWriteArticles(role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { articles }: { articles: NewsApiArticle[] } = await req.json();
  const directPublish = canPublishDirectly(role);

  const worldDept = await prisma.department.upsert({
    where: { slug: "world" },
    update: {},
    create: { nameAr: "عالمي", nameEn: "World", slug: "world" }
  });

  const created = [];
  for (const a of articles) {
    // Copies the API article fully into CNA's own article model/template —
    // it renders through the same ArticlePage component as local content.
    // Editors importing world news still go through review, same as any
    // other article they write.
    const article = await prisma.article.create({
      data: {
        titleAr: a.title,
        slug: slugify(a.title),
        excerpt: a.description,
        contentHtml: `<p>${(a.content ?? a.description ?? "").replace(/\n/g, "</p><p>")}</p>`,
        coverImageUrl: a.urlToImage,
        departmentId: worldDept.id,
        source: "API",
        sourceName: a.source?.name ?? "NewsAPI",
        sourceUrl: a.url,
        status: directPublish ? "PUBLISHED" : "PENDING_REVIEW",
        submittedForReviewAt: directPublish ? null : new Date(),
        publishedAt: directPublish ? new Date(a.publishedAt) : null,
        authorId: (session!.user as any).id ?? null
      }
    });
    created.push(article);
  }

  if (directPublish) revalidatePath("/");

  return NextResponse.json({ ok: true, count: created.length, pendingReview: !directPublish });
}
