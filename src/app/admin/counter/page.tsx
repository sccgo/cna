"use client";

import { useEffect, useState } from "react";

type Counter = {
  id: string; title: string; targetDate: string; direction: string; active: boolean;
  labelColor: string; numberColor: string; bgSolid: string;
};

export default function AdminCounterPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [direction, setDirection] = useState("DESCENDING");

  async function load() {
    const res = await fetch("/api/admin/counter");
    setCounters(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!title.trim() || !targetDate) return;
    await fetch("/api/admin/counter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, targetDate, direction, active: true })
    });
    setTitle(""); setTargetDate("");
    load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/counter/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active })
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/counter/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 600 }}>
      <h1>عداد الحدث</h1>
      <p style={{ opacity: 0.7, fontSize: 14 }}>عداد واحد فقط يظهر بالموقع في كل مرة (المُفعَّل).</p>

      <div style={{ display: "grid", gap: 8, margin: "16px 0 24px" }}>
        <input placeholder="عنوان العداد (مثال: الانتخابات الأمريكية)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="datetime-local" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <select value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="DESCENDING">تنازلي (وقت متبقٍ)</option>
          <option value="ASCENDING">تصاعدي (منذ متى)</option>
        </select>
        <button onClick={create} style={{ padding: "10px 20px", fontWeight: 700 }}>إضافة عداد</button>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {counters.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #333", borderRadius: 8, padding: 10 }}>
            <span style={{ flex: 1, opacity: c.active ? 1 : 0.5 }}>{c.title} — {new Date(c.targetDate).toLocaleString("ar")}</span>
            <button onClick={() => toggle(c.id, c.active)}>{c.active ? "إيقاف" : "تفعيل"}</button>
            <button onClick={() => remove(c.id)}>حذف</button>
          </div>
        ))}
      </div>
    </div>
  );
}
