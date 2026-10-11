import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchWorldNews } from "@/lib/newsapi";
import { canWriteArticles } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canWriteArticles((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") ?? "us";
  const category = searchParams.get("category") ?? undefined;

  try {
    const articles = await fetchWorldNews({ country, category: category ?? undefined });
    return NextResponse.json(articles);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "تعذر جلب الأخبار العالمية" }, { status: 500 });
  }
}
