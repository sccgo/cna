import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { scrapeArticle } from "@/lib/scraper";
import { canWriteArticles } from "@/lib/permissions";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !canWriteArticles((session.user as any).role)) return null;
  return session;
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const { url } = await req.json();

  try {
    const scraped = await scrapeArticle(url);
    return NextResponse.json(scraped);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "تعذر جلب المقال" }, { status: 500 });
  }
}
