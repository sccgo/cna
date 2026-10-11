"use client";

import { useState } from "react";
import type { SiteSettings } from "@prisma/client";

export default function ThemeForm({ settings, role }: { settings: SiteSettings; role: string }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isDirector = role === "DIRECTOR";

  function set<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setForm((f: SiteSettings) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleUpload(file: File, target: "logoUrl" | "eventLogoUrl" | "siteBgImageUrl" | "cardBgImageUrl" | "headerBgImageUrl") {
    const reader = new FileReader();
    reader.onload = async () => {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: JSON.stringify({ dataUrl: reader.result, folder: target === "logoUrl" || target === "eventLogoUrl" ? "logos" : "theme" }),
        headers: { "Content-Type": "application/json" }
      });
      const { url } = await res.json();
      set(target, url as any);
    };
    reader.readAsDataURL(file);
  }

  function diffFromOriginal(): Record<string, any> {
    const changes: Record<string, any> = {};
    for (const key of Object.keys(form) as (keyof SiteSettings)[]) {
      if (key === "updatedAt") continue;
      if (JSON.stringify(form[key]) !== JSON.stringify(settings[key])) {
        changes[key as string] = form[key];
      }
    }
    return changes;
  }

  async function save() {
    setSaving(true);

    if (isDirector) {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
    } else {
      const changes = diffFromOriginal();
      if (Object.keys(changes).length > 0) {
        await fetch("/api/design-proposals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changes })
        });
      }
    }

    setSaving(false);
    setSaved(true);
  }


  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section>
        <h3>الشعار</h3>
        <input type="file" accept="image/*" onChange={(e) => e.target.files && handleUpload(e.target.files[0], "logoUrl")} />
        {form.logoUrl && <img src={form.logoUrl} width={64} height={64} style={{ marginTop: 8, borderRadius: 8 }} />}

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={form.eventLogoActive}
            onChange={(e) => set("eventLogoActive", e.target.checked as any)}
          />
          تفعيل شعار مناسبة خاصة (يستبدل الشعار الأساسي مؤقتاً)
        </label>
        {form.eventLogoActive && (
          <input type="file" accept="image/*" onChange={(e) => e.target.files && handleUpload(e.target.files[0], "eventLogoUrl")} />
        )}
      </section>

      <section>
        <h3>الخط</h3>
        <select value={form.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>
          <option value="Cairo">Cairo</option>
          <option value="Amiri">Amiri</option>
        </select>
      </section>

      <BackgroundEditor
        title="خلفية الموقع"
        type={form.siteBgType}
        solid={form.siteBgSolid}
        onType={(v) => set("siteBgType", v as any)}
        onSolid={(v) => set("siteBgSolid", v)}
        onFrom={(v) => set("siteBgGradientFrom", v)}
        onTo={(v) => set("siteBgGradientTo", v)}
        onUpload={(f) => handleUpload(f, "siteBgImageUrl")}
        imageUrl={form.siteBgImageUrl}
      />

      <BackgroundEditor
        title="خلفية بطاقات الأخبار"
        type={form.cardBgType}
        solid={form.cardBgSolid}
        onType={(v) => set("cardBgType", v as any)}
        onSolid={(v) => set("cardBgSolid", v)}
        onFrom={(v) => set("cardBgGradientFrom", v as any)}
        onTo={(v) => set("cardBgGradientTo", v as any)}
        onUpload={(f) => handleUpload(f, "cardBgImageUrl")}
        imageUrl={form.cardBgImageUrl}
      />

      <BackgroundEditor
        title="خلفية الهيدر"
        type={form.headerBgType}
        solid={form.headerBgSolid}
        onType={(v) => set("headerBgType", v as any)}
        onSolid={(v) => set("headerBgSolid", v)}
        onFrom={(v) => set("headerBgGradientFrom", v as any)}
        onTo={(v) => set("headerBgGradientTo", v as any)}
        onUpload={(f) => handleUpload(f, "headerBgImageUrl")}
        imageUrl={form.headerBgImageUrl}
      />

      <section style={{ display: "flex", gap: 16 }}>
        <label>
          اللون الأساسي
          <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} />
        </label>
        <label>
          لون التمييز
          <input type="color" value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)} />
        </label>
        <label>
          لون النص
          <input type="color" value={form.textColor} onChange={(e) => set("textColor", e.target.value)} />
        </label>
      </section>

      <button onClick={save} disabled={saving} style={{ padding: "12px 24px", fontWeight: 700, borderRadius: 8 }}>
        {saving
          ? "جارٍ الحفظ..."
          : saved
          ? (isDirector ? "تم النشر فوراً ✓" : "أُرسل للمدير للمراجعة ✓")
          : (isDirector ? "حفظ ونشر التصميم فوراً" : "إرسال اقتراح للمدير")}
      </button>
      {!isDirector && (
        <p style={{ fontSize: 13, opacity: 0.6 }}>لن يظهر التغيير للزوار إلا بعد موافقة المدير.</p>
      )}
    </div>
  );
}

function BackgroundEditor({
  title, type, solid, onType, onSolid, onFrom, onTo, onUpload, imageUrl
}: {
  title: string;
  type: string;
  solid: string;
  onType: (v: string) => void;
  onSolid: (v: string) => void;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onUpload: (f: File) => void;
  imageUrl?: string | null;
}) {
  return (
    <section>
      <h3>{title}</h3>
      <select value={type} onChange={(e) => onType(e.target.value)}>
        <option value="SOLID">لون عادي</option>
        <option value="GRADIENT">تدرج ألوان</option>
        <option value="IMAGE">صورة من الجهاز</option>
      </select>
      {type === "SOLID" && <input type="color" value={solid} onChange={(e) => onSolid(e.target.value)} />}
      {type === "GRADIENT" && (
        <div style={{ display: "flex", gap: 8 }}>
          <input type="color" onChange={(e) => onFrom(e.target.value)} />
          <input type="color" onChange={(e) => onTo(e.target.value)} />
        </div>
      )}
      {type === "IMAGE" && (
        <>
          <input type="file" accept="image/*" onChange={(e) => e.target.files && onUpload(e.target.files[0])} />
          {imageUrl && <img src={imageUrl} width={120} style={{ marginTop: 8, borderRadius: 8 }} />}
        </>
      )}
    </section>
  );
}
