"use client";

import { useEffect, useState } from "react";

type Poll = {
  id: string;
  question: string;
  active: boolean;
  endsAt: string;
  options: { id: string; label: string; votes: { id: string }[] }[];
};

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [question, setQuestion] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/polls");
    setPolls(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!question.trim() || !endsAt) return;
    await fetch("/api/admin/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, endsAt, options })
    });
    setQuestion(""); setEndsAt(""); setOptions(["", ""]);
    load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/admin/polls/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active })
    });
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 16 }}>الاستطلاعات والتصويت</h1>

      <div style={{ border: "1px solid #333", borderRadius: 10, padding: 16, marginBottom: 28 }}>
        <h3>استطلاع جديد</h3>
        <input placeholder="السؤال" value={question} onChange={(e) => setQuestion(e.target.value)} style={{ width: "100%", padding: 8, marginBottom: 8 }} />
        {options.map((o, i) => (
          <input
            key={i}
            placeholder={`خيار ${i + 1}`}
            value={o}
            onChange={(e) => setOptions(options.map((x, idx) => (idx === i ? e.target.value : x)))}
            style={{ width: "100%", padding: 8, marginBottom: 6 }}
          />
        ))}
        <button onClick={() => setOptions([...options, ""])} style={{ marginBottom: 8 }}>+ خيار آخر</button>
        <div>
          <label>ينتهي في: </label>
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <button onClick={create} style={{ marginTop: 10, padding: "10px 20px", fontWeight: 700 }}>إنشاء الاستطلاع</button>
      </div>

      {loading ? <p>...جارٍ التحميل</p> : (
        <div style={{ display: "grid", gap: 16 }}>
          {polls.map((p) => {
            const total = p.options.reduce((s, o) => s + o.votes.length, 0);
            return (
              <div key={p.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{p.question}</strong>
                  <button onClick={() => toggle(p.id, p.active)}>{p.active ? "إنهاء" : "إعادة تفعيل"}</button>
                </div>
                <p style={{ fontSize: 12, opacity: 0.6 }}>ينتهي: {new Date(p.endsAt).toLocaleString("ar")}</p>
                {p.options.map((o) => (
                  <div key={o.id} style={{ fontSize: 14, marginTop: 4 }}>
                    {o.label} — {o.votes.length} صوت ({total ? Math.round((o.votes.length / total) * 100) : 0}%)
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
