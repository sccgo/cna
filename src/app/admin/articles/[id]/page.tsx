import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canWriteArticles, canPublishDirectly } from "@/lib/permissions";
import ArticleEditorForm from "@/components/ArticleEditorForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "مسودة", PENDING_REVIEW: "بانتظار المراجعة", PUBLISHED: "منشور", REJECTED: "مرفوض", ARCHIVED: "مؤرشف"
};

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !canWriteArticles(role)) redirect("/admin");

  const [departments, article] = await Promise.all([
    prisma.department.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.article.findUnique({ where: { id: params.id } })
  ]);

  if (!article) notFound();

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>تعديل: {article.titleAr}</h1>
        <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, border: "1px solid #444" }}>
          {STATUS_LABEL[article.status]}
        </span>
      </div>
      {article.status === "REJECTED" && article.reviewNote && (
        <p style={{ color: "#e05252", fontSize: 14, marginBottom: 16 }}>
          سبب الرفض من المراجع: {article.reviewNote}
        </p>
      )}
      <ArticleEditorForm
        mode="edit"
        articleId={article.id}
        departments={departments}
        directPublish={canPublishDirectly(role)}
        initial={{
          titleAr: article.titleAr,
          excerpt: article.excerpt,
          contentHtml: article.contentHtml,
          coverImageUrl: article.coverImageUrl,
          departmentId: article.departmentId,
          status: article.status
        }}
      />
    </div>
  );
}
