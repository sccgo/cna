"use client";

import { useEffect, useState } from "react";

type Proposal = {
  id: string; changes: Record<string, any>; status: string; createdAt: string;
  proposedBy: { fullName: string; email: string };
};

const FIELD_LABEL: Record<string, string> = {
  fontFamily: "الخط", primaryColor: "اللون الأساسي", accentColor: "لون التمييز", textColor: "لون النص",
  siteBgType: "نوع خلفية الموقع", siteBgSolid: "لون خلفية الموقع",
  cardBgType: "نوع خلفية البطاقات", cardBgSolid: "لون خلفية البطاقات",
  headerBgType: "نوع خلفية الهيدر", headerBgSolid: "لون خلفية الهيدر",
  logoUrl: "الشعار", siteNameAr: "اسم الموقع (عربي)", siteNameEn: "اسم الموقع (إنجليزي)"
};

export default function AdminDesignReviewPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/design-proposals");
    const all = await res.json();
    setProposals(Array.isArray(all) ? all.filter((p: Proposal) => p.status === "PENDING") : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, approve: boolean) {
    setBusyId(id);
    await fetch(`/api/design-proposals/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve })
    });
    setBusyId(null);
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 700 }}>
      <h1 style={{ marginBottom: 4 }}>مراجعة اقتراحات التصميم</h1>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24 }}>
        الموافقة تُطبّق التصميم بالغصب على كامل الموقع فوراً لكل الزوار.
      </p>

      {loading ? <p>...جارٍ التحميل</p> : proposals.length === 0 ? (
        <p style={{ opacity: 0.6 }}>لا توجد اقتراحات تصميم بانتظار المراجعة.</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {proposals.map((p) => (
            <div key={p.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 10 }}>
                {p.proposedBy.fullName} · {new Date(p.createdAt).toLocaleString("ar")}
              </div>
              <div style={{ display: "grid", gap: 4, marginBottom: 12 }}>
                {Object.entries(p.changes).map(([key, value]) => (
                  <div key={key} style={{ fontSize: 13, display: "flex", gap: 8 }}>
                    <strong>{FIELD_LABEL[key] ?? key}:</strong>
                    {typeof value === "string" && value.startsWith("#") ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 14, height: 14, background: value, borderRadius: 4, display: "inline-block" }} />
                        {value}
                      </span>
                    ) : (
                      <span>{String(value)}</span>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button disabled={busyId === p.id} onClick={() => decide(p.id, true)} style={{ padding: "8px 16px", background: "#2e7d32", color: "#fff", borderRadius: 6, fontWeight: 700 }}>
                  موافقة وتطبيق فوري
                </button>
                <button disabled={busyId === p.id} onClick={() => decide(p.id, false)} style={{ padding: "8px 16px", background: "#c62828", color: "#fff", borderRadius: 6, fontWeight: 700 }}>
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
