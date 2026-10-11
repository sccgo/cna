"use client";

import { useEffect, useState } from "react";

type StateRow = {
  id: string; stateCode: string; stateName: string; electoralVotes: number;
  votesCandidateA: number; votesCandidateB: number; leaning: string; reportingPercent: number;
};
type Cycle = { id: string; title: string; active: boolean; states: StateRow[] };

export default function AdminElectionsPage() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/elections");
    setCycles(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createCycle() {
    if (!title.trim()) return;
    await fetch("/api/admin/elections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    setTitle("");
    load();
  }

  async function updateState(s: StateRow, patch: Partial<StateRow>) {
    const updated = { ...s, ...patch };
    await fetch(`/api/admin/elections/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    load();
  }

  const active = cycles.find((c) => c.active);

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h1>الانتخابات الأمريكية - خريطة حية</h1>

      <div style={{ display: "flex", gap: 8, margin: "16px 0 28px" }}>
        <input placeholder="اسم الدورة الانتخابية (مثال: انتخابات 2028)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <button onClick={createCycle} style={{ padding: "10px 18px", fontWeight: 700 }}>بدء دورة جديدة</button>
      </div>

      {loading ? <p>...جارٍ التحميل</p> : !active ? (
        <p style={{ opacity: 0.6 }}>لا توجد دورة نشطة. ابدأ دورة جديدة أعلاه.</p>
      ) : (
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "right", opacity: 0.6 }}>
              <th style={{ padding: 6 }}>الولاية</th>
              <th style={{ padding: 6 }}>الأصوات الإلكترونية</th>
              <th style={{ padding: 6 }}>أصوات المرشح A</th>
              <th style={{ padding: 6 }}>أصوات المرشح B</th>
              <th style={{ padding: 6 }}>الميل</th>
              <th style={{ padding: 6 }}>نسبة الفرز %</th>
            </tr>
          </thead>
          <tbody>
            {active.states.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #333" }}>
                <td style={{ padding: 6 }}>{s.stateName} ({s.electoralVotes})</td>
                <td style={{ padding: 6 }}>{s.electoralVotes}</td>
                <td style={{ padding: 6 }}>
                  <input type="number" defaultValue={s.votesCandidateA} style={{ width: 90 }}
                    onBlur={(e) => updateState(s, { votesCandidateA: Number(e.target.value) })} />
                </td>
                <td style={{ padding: 6 }}>
                  <input type="number" defaultValue={s.votesCandidateB} style={{ width: 90 }}
                    onBlur={(e) => updateState(s, { votesCandidateB: Number(e.target.value) })} />
                </td>
                <td style={{ padding: 6 }}>
                  <select defaultValue={s.leaning} onChange={(e) => updateState(s, { leaning: e.target.value })}>
                    <option value="BLUE">أزرق</option>
                    <option value="RED">أحمر</option>
                    <option value="TOSSUP">متأرجحة</option>
                  </select>
                </td>
                <td style={{ padding: 6 }}>
                  <input type="number" min={0} max={100} defaultValue={s.reportingPercent} style={{ width: 60 }}
                    onBlur={(e) => updateState(s, { reportingPercent: Number(e.target.value) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
