"use client";

import { useEffect, useState } from "react";

type Issue = {
  id: string; issueDate: string; isAutoBuilt: boolean;
  pages: { id: string; pageNumber: number; sectionNameAr: string; articles: any[] }[];
};

export default function AdminNewspaperPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [building, setBuilding] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/newspaper");
    setIssues(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function build() {
    setBuilding(true);
    await fetch("/api/admin/newspaper", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBuilding(false);
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h1>الجريدة اليومية</h1>
      <p style={{ opacity: 0.7, fontSize: 14 }}>
        البناء الآلي ينشئ عدد اليوم من المقالات المنشورة، صفحة واحدة لكل قسم، بحد أدنى 12 صفحة.
      </p>
      <button disabled={building} onClick={build} style={{ padding: "10px 20px", fontWeight: 700, margin: "12px 0 24px" }}>
        {building ? "...جارٍ البناء" : "بناء عدد اليوم آلياً"}
      </button>

      <div style={{ display: "grid", gap: 12 }}>
        {issues.map((iss) => (
          <div key={iss.id} style={{ border: "1px solid #333", borderRadius: 10, padding: 14 }}>
            <strong>{new Date(iss.issueDate).toLocaleDateString("ar")}</strong>
            <span style={{ opacity: 0.6, fontSize: 12 }}> — {iss.pages.length} صفحة {iss.isAutoBuilt && "(آلي)"}</span>
            <div>
              <a href={`/api/newspaper/${iss.id}/pdf`} target="_blank" className="cna-primary">تنزيل PDF</a>
              {" · "}
              <a href={`/newspaper?issue=${iss.id}`} target="_blank" className="cna-primary">معاينة</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
