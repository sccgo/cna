import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
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
  const issues = await prisma.newspaperIssue.findMany({
    orderBy: { issueDate: "desc" },
    include: { pages: { include: { articles: { include: { article: true } } } } }
  });
  return NextResponse.json(issues);
}

/**
 * Auto-builds a classic paginated issue: one page per department containing
 * its recently published articles, ordered as محلي/سياسي/اقتصادي/رياضي/عالمي...
 * Minimum page count is enforced by repeating department rotation with older
 * articles if a single pass doesn't reach 12 pages, matching the "at least
 * 12-16 pages, classic layout, one section per page" requirement.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const issueDate = body.issueDate ? new Date(body.issueDate) : new Date();
  issueDate.setHours(0, 0, 0, 0);

  const departments = await prisma.department.findMany({ orderBy: { nameAr: "asc" } });
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 200,
    include: { department: true }
  });

  const byDept = new Map<string, typeof articles>();
  for (const d of departments) byDept.set(d.id, []);
  for (const a of articles) {
    if (a.departmentId && byDept.has(a.departmentId)) byDept.get(a.departmentId)!.push(a);
  }

  const MIN_PAGES = 12;
  const ARTICLES_PER_PAGE = 4;
  const pagesData: { departmentId: string; sectionNameAr: string; articleIds: string[] }[] = [];

  let round = 0;
  while (pagesData.length < MIN_PAGES && round < 10) {
    let addedAny = false;
    for (const d of departments) {
      const pool = byDept.get(d.id) ?? [];
      const start = round * ARTICLES_PER_PAGE;
      const slice = pool.slice(start, start + ARTICLES_PER_PAGE);
      if (slice.length > 0) {
        pagesData.push({ departmentId: d.id, sectionNameAr: d.nameAr, articleIds: slice.map((a: (typeof articles)[number]) => a.id) });
        addedAny = true;
      }
      if (pagesData.length >= MIN_PAGES) break;
    }
    round += 1;
    if (!addedAny) break; // no more content available across all departments
  }

  const issue = await prisma.newspaperIssue.upsert({
    where: { issueDate },
    update: {},
    create: { issueDate, isAutoBuilt: true }
  });

  // Clear previous auto-generated pages for this issue before rebuilding
  await prisma.newspaperPage.deleteMany({ where: { issueId: issue.id } });

  for (let i = 0; i < pagesData.length; i++) {
    const p = pagesData[i];
    await prisma.newspaperPage.create({
      data: {
        issueId: issue.id,
        pageNumber: i + 1,
        sectionNameAr: p.sectionNameAr,
        articles: {
          create: p.articleIds.map((articleId, idx) => ({ articleId, position: idx }))
        }
      }
    });
  }

  const full = await prisma.newspaperIssue.findUnique({
    where: { id: issue.id },
    include: { pages: { include: { articles: { include: { article: true } } }, orderBy: { pageNumber: "asc" } } }
  });

  revalidatePath("/newspaper");
  return NextResponse.json(full);
}
