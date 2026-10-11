import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cna.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        fullName: "رئيس الوكالة",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "DIRECTOR",
        status: "APPROVED",
        emailVerified: new Date()
      }
    });
    console.log(`✅ Director account created: ${adminEmail} / ${adminPassword} — change the password after first login.`);
  } else if (existing.role !== "DIRECTOR") {
    // Keeps redeploys consistent if an older schema version created this account differently.
    await prisma.user.update({ where: { id: existing.id }, data: { role: "DIRECTOR", status: "APPROVED" } });
  }

  const departments = [
    { nameAr: "محلي", nameEn: "Local", slug: "local" },
    { nameAr: "سياسي", nameEn: "Politics", slug: "politics" },
    { nameAr: "اقتصادي", nameEn: "Economy", slug: "economy" },
    { nameAr: "رياضي", nameEn: "Sports", slug: "sports" },
    { nameAr: "عالمي", nameEn: "World", slug: "world" }
  ];
  for (const d of departments) {
    await prisma.department.upsert({ where: { slug: d.slug }, update: {}, create: d });
  }

  console.log("✅ Seed complete.");
}

main().finally(() => prisma.$disconnect());
