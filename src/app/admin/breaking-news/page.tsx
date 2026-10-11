"use client";

import { useEffect, useState } from "react";

type Item = { id: string; text: string; active: boolean; display: string; isAuto: boolean };

export default function AdminBreakingNewsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [display, setDisplay] = useState("TICKER");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/breaking-news");
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!text.trim()) return;
    await fetch("/api/admin/breaking-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, display })
    });
    setText("");
    load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/breaking-news/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active })
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/breaking-news/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 700 }}>
      <h1 style={{ marginBottom: 16 }}>الخبر العاجل</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          placeholder="نص الخبر العاجل"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1, padding: 10 }}
        />
        <select value={display} onChange={(e) => setDisplay(e.target.value)}>
          <option value="TICKER">شريط</option>
          <option value="POPUP">شاشة منبثقة</option>
          <option value="BOTH">الاثنان</option>
        </select>
        <button onClick={add} style={{ padding: "10px 18px", fontWeight: 700 }}>إضافة</button>
      </div>

      {loading ? (
        <p>...جارٍ التحميل</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((i) => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #333", borderRadius: 8, padding: 10 }}>
              <span style={{ flex: 1, opacity: i.active ? 1 : 0.4 }}>{i.text}{i.isAuto && " (آلي)"}</span>
              <button onClick={() => toggle(i.id, i.active)}>{i.active ? "إيقاف" : "تفعيل"}</button>
              <button onClick={() => remove(i.id)}>حذف</button>
            </div>
          ))}
          {items.length === 0 && <p style={{ opacity: 0.6 }}>لا توجد أخبار عاجلة.</p>}
        </div>
      )}
    </div>
  );
}
