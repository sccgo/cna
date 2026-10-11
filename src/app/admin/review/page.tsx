"use client";

import { useEffect, useState } from "react";

type PendingArticle = {
  id: string; titleAr: string; excerpt: string | null; submittedForReviewAt: string;
  author: { fullName: string } | null; department: { nameAr: string } | null;
};

export default function AdminReviewPage() {
  const [articles, setArticles] = useState<PendingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [requestSent, setRequestSent] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/articles");
    const all = await res.json();
    setArticles(Array.isArray(all) ? all.filter((a: any) => a.status === "PENDING_REVIEW") : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, approve: boolean) {
    setBusyId(id);
    await fetch(`/api/admin/articles/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, note: note[id] || undefined })
    });
    setBusyId(null);
    load();
  }

  async function requestEditPermission() {
    await fetch("/api/permission-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "أطلب صلاحية تحرير المقالات مباشرة" })
    });
    setRequestSent(true);
  }

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>مراجعة المقالات</h1>
          <p style={{ opacity: 0.6, fontSize: 14 }}>القبول ينشر المقال للجميع فوراً. الرفض يبقيه مخفياً ويعود للمحرر مع الملاحظة.</p>
        </div>
        <button onClick={requestEditPermission} disabled={requestSent} style={{ fontSize: 13, padding: "8px 14px", whiteSpace: "nowrap" }}>
          {requestSent ? "تم إرسال الطلب ✓" : "اطلب صلاحية تحرير من المدير"}
        </button>
      </div>

      {loading ? (
        <p style={{ marginTop: 24 }}>...جارٍ التحميل</p>
      ) : articles.length === 0 ? (
        <p style={{ opacity: 0.6, marginTop: 24 }}>لا توجد مقالات بانتظار المراجعة حالياً.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          {articles.map((a) => (
            <div key={a.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{a.titleAr}</div>
              <div style={{ fontSize: 12, opacity: 0.6, margin: "4px 0 10px" }}>
                {a.author?.fullName ?? "—"} · {a.department?.nameAr ?? "بدون قسم"} · {new Date(a.submittedForReviewAt).toLocaleString("ar")}
              </div>
              {a.excerpt && <p style={{ fontSize: 14, opacity: 0.85, marginBottom: 10 }}>{a.excerpt}</p>}
              <input
                placeholder="ملاحظة (تظهر للمحرر عند الرفض)"
                value={note[a.id] ?? ""}
                onChange={(e) => setNote({ ...note, [a.id]: e.target.value })}
                style={{ width: "100%", padding: 8, marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={busyId === a.id} onClick={() => decide(a.id, true)} style={{ padding: "8px 16px", background: "#2e7d32", color: "#fff", borderRadius: 6, fontWeight: 700 }}>
                  قبول ونشر
                </button>
                <button disabled={busyId === a.id} onClick={() => decide(a.id, false)} style={{ padding: "8px 16px", background: "#c62828", color: "#fff", borderRadius: 6, fontWeight: 700 }}>
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
