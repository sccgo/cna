import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  userId: z.string(),
  code: z.string().length(6)
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { userId, code } = parsed.data;

  const record = await prisma.verificationCode.findFirst({
    where: { userId, code },
    orderBy: { createdAt: "desc" }
  });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "الرمز غير صحيح أو منتهي الصلاحية" }, { status: 400 });
  }

  // Email confirmed → account now awaits admission committee (عمادة القبول) approval,
  // per the unified login gate: verified email is necessary but not sufficient.
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date(), status: "PENDING_ADMIN" }
  });

  await prisma.verificationCode.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}
