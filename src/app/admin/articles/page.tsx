import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canWriteArticles } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING_REVIEW: "بانتظار المراجعة",
  PUBLISHED: "منشور",
  REJECTED: "مرفوض",
  ARCHIVED: "مؤرشف"
};

export default async function AdminArticlesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !canWriteArticles((session.user as any).role)) redirect("/admin");

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: { department: true }
  });

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>المقالات</h1>
        <Link href="/admin/articles/new" style={{ padding: "10px 18px", borderRadius: 8, background: "#c8952c", color: "#0a0f1c", fontWeight: 700, textDecoration: "none" }}>
          + مقال جديد
        </Link>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "right", opacity: 0.6, fontSize: 13 }}>
            <th style={{ padding: 8 }}>العنوان</th>
            <th style={{ padding: 8 }}>القسم</th>
            <th style={{ padding: 8 }}>المصدر</th>
            <th style={{ padding: 8 }}>الحالة</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a: (typeof articles)[number]) => (
            <tr key={a.id} style={{ borderTop: "1px solid #333" }}>
              <td style={{ padding: 8 }}>{a.titleAr}</td>
              <td style={{ padding: 8 }}>{a.department?.nameAr ?? "—"}</td>
              <td style={{ padding: 8 }}>{a.source === "API" ? `مستورد${a.sourceName ? " · " + a.sourceName : ""}` : "محلي"}</td>
              <td style={{ padding: 8 }}>{STATUS_LABEL[a.status]}</td>
              <td style={{ padding: 8 }}>
                <Link href={`/admin/articles/${a.id}`} className="cna-primary">تعديل</Link>
              </td>
            </tr>
          ))}
          {articles.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", opacity: 0.6 }}>لا توجد مقالات بعد.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
