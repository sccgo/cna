import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  canWriteArticles, canReviewArticles, canProposeDesign, canApplyDesign,
  canApproveAccounts, canManageOperations, canManageEditors, canManageAllRoles
} from "@/lib/permissions";
import { ROLE_LABEL_AR, type Role } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as Role | undefined;
  if (!session || !role || role === "VIEWER") redirect("/");

  const [articles, users, pendingUsers, polls, pendingReview, pendingDesign] = await Promise.all([
    prisma.article.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count(),
    prisma.user.count({ where: { status: "PENDING_ADMIN" } }),
    prisma.poll.count({ where: { active: true } }),
    prisma.article.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.designProposal.count({ where: { status: "PENDING" } })
  ]);

  const stats = [
    { label: "المقالات المنشورة", value: articles },
    { label: "المستخدمون المسجلون", value: users },
    { label: "طلبات بانتظار القبول", value: pendingUsers },
    { label: "استطلاعات نشطة", value: polls }
  ];

  const allLinks = [
    { href: "/admin/articles", label: "المقالات", show: canWriteArticles(role) },
    { href: "/admin/review", label: `مراجعة المقالات${pendingReview ? ` (${pendingReview})` : ""}`, show: canReviewArticles(role) },
    { href: "/admin/world-news", label: "الأخبار العالمية", show: canWriteArticles(role) },
    { href: "/admin/scraper", label: "سحب مقال خارجي", show: canWriteArticles(role) },
    { href: "/admin/departments", label: "الأقسام", show: canManageOperations(role) },
    { href: "/admin/breaking-news", label: "الخبر العاجل", show: canManageOperations(role) },
    { href: "/admin/users", label: "طلبات الحسابات", show: canApproveAccounts(role) },
    { href: "/admin/polls", label: "الاستطلاعات", show: canManageOperations(role) },
    { href: "/admin/elections", label: "الانتخابات الأمريكية", show: canManageOperations(role) },
    { href: "/admin/live", label: "البث المباشر", show: canManageOperations(role) },
    { href: "/admin/newspaper", label: "الجريدة اليومية", show: canManageOperations(role) },
    { href: "/admin/counter", label: "العداد", show: canManageOperations(role) },
    { href: "/admin/settings", label: "تصميم الموقع", show: canProposeDesign(role) },
    { href: "/admin/design-review", label: `مراجعة التصميم${pendingDesign ? ` (${pendingDesign})` : ""}`, show: canApplyDesign(role) },
    { href: "/admin/editors", label: "التحكم بالمحررين", show: canManageEditors(role) },
    { href: "/admin/roles", label: "إدارة الأدوار والصلاحيات", show: canManageAllRoles(role) }
  ];
  const links = allLinks.filter((l) => l.show);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26 }}>لوحة تحكم وكالة الأنباء التنسيقية</h1>
        <span className="cna-primary" style={{ fontWeight: 700 }}>دورك: {ROLE_LABEL_AR[role]}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 36 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ border: "1px solid #333", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>{s.value}</div>
            <div style={{ opacity: 0.6, fontSize: 13 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ padding: 16, border: "1px solid #333", borderRadius: 10, textDecoration: "none", color: "inherit" }}>
            {l.label}
          </Link>
        ))}
      </div>

      {links.length === 0 && (
        <p style={{ opacity: 0.6 }}>لا توجد أدوات متاحة لدورك الحالي بعد.</p>
      )}
    </div>
  );
}
