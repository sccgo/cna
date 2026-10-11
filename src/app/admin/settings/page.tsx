import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canProposeDesign } from "@/lib/permissions";
import ThemeForm from "./ThemeForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || !canProposeDesign(role)) redirect("/admin");

  const settings = await prisma.siteSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const isDirector = role === "DIRECTOR";

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>نظام تصميم الموقع</h1>
      <p style={{ opacity: 0.6, marginBottom: 24 }}>
        {isDirector
          ? "أي تغيير هنا يُطبَّق فوراً على كامل الموقع لكل الزوار — لا يمكن تجاوزه."
          : "اقتراحاتك تُرسل للمدير، ولا تظهر للزوار إلا بعد موافقته."}
      </p>
      <ThemeForm settings={settings} role={role} />
    </div>
  );
}
