"use client";

import { useEffect, useState } from "react";

type Dept = { id: string; nameAr: string; nameEn: string; slug: string };

export default function AdminDepartmentsPage() {
  const [depts, setDepts] = useState<Dept[]>([]);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");

  async function load() {
    const res = await fetch("/api/admin/departments");
    setDepts(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!nameAr.trim() || !slug.trim()) return;
    await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameAr, nameEn, slug })
    });
    setNameAr(""); setNameEn(""); setSlug("");
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/departments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h1>الأقسام</h1>
      <div style={{ display: "flex", gap: 8, margin: "16px 0 24px" }}>
        <input placeholder="الاسم بالعربي" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        <input placeholder="Name (EN)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        <input placeholder="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <button onClick={add}>إضافة</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {depts.map((d) => (
          <div key={d.id} style={{ display: "flex", gap: 10, border: "1px solid #333", borderRadius: 8, padding: 10 }}>
            <span style={{ flex: 1 }}>{d.nameAr} ({d.nameEn}) — /{d.slug}</span>
            <button onClick={() => remove(d.id)}>حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}
