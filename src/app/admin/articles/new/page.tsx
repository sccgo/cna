import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canWriteArticles, canPublishDirectly } from "@/lib/permissions";
import ArticleEditorForm from "@/components/ArticleEditorForm";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !canWriteArticles(role)) redirect("/admin");

  const departments = await prisma.department.findMany({ orderBy: { nameAr: "asc" } });
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 20 }}>مقال جديد</h1>
      <ArticleEditorForm mode="create" departments={departments} directPublish={canPublishDirectly(role)} />
    </div>
  );
}
