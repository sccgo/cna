import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canApplyDesign, canProposeDesign } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !(canApplyDesign(role) || canProposeDesign(role))) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const settings = await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return NextResponse.json(settings);
}

// تطبيق مباشر وفوري — للمدير فقط. المبرمج يقترح عبر /api/design-proposals
// وينتظر موافقة المدير قبل أن يظهر أي تغيير للزوار.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !canApplyDesign((session.user as any).role)) {
    return NextResponse.json({ error: "غير مصرح — تطبيق التصميم مباشرة صلاحية المدير فقط" }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: body,
    create: { id: 1, ...body }
  });

  // RootLayout stays force-dynamic so the new design is force-applied,
  // site-wide, on next page load. Other pages use revalidate-based caching
  // for speed, so we explicitly bust them here.
  revalidatePath("/", "layout");

  return NextResponse.json(updated);
}
