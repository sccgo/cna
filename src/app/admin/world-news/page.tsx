"use client";

import { useState } from "react";

type Article = {
  title: string; description: string | null; url: string; urlToImage: string | null;
  publishedAt: string; source: { name: string }; content: string | null;
};

const COUNTRIES = [
  { code: "us", label: "أمريكا" }, { code: "gb", label: "بريطانيا" },
  { code: "ae", label: "الإمارات" }, { code: "sa", label: "السعودية" }, { code: "eg", label: "مصر" }
];
const CATEGORIES = ["general", "business", "sports", "technology", "health", "science"];

export default function AdminWorldNewsPage() {
  const [country, setCountry] = useState("us");
  const [category, setCategory] = useState("general");
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/newsapi?country=${country}&category=${category}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setArticles(data);
    setSelected(new Set());
  }

  function toggle(i: number) {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  }

  async function importSelected() {
    setImporting(true);
    const chosen = articles.filter((_, i) => selected.has(i));
    await fetch("/api/admin/newsapi/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles: chosen })
    });
    setImporting(false);
    setArticles(articles.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  }

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      <h1>الأخبار العالمية (NewsAPI)</h1>

      <div style={{ display: "flex", gap: 10, margin: "16px 0 20px" }}>
        <select value={country} onChange={(e) => setCountry(e.target.value)}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={search} disabled={loading}>{loading ? "..." : "بحث"}</button>
        {selected.size > 0 && (
          <button onClick={importSelected} disabled={importing} style={{ fontWeight: 700 }}>
            {importing ? "..." : `استيراد ${selected.size} خبر`}
          </button>
        )}
      </div>

      {error && <p style={{ color: "#e05252" }}>{error}</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {articles.map((a, i) => (
          <label key={i} style={{ display: "flex", gap: 10, border: "1px solid #333", borderRadius: 8, padding: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
            {a.urlToImage && <img src={a.urlToImage} width={90} height={60} style={{ objectFit: "cover", borderRadius: 6 }} />}
            <div>
              <div style={{ fontWeight: 700 }}>{a.title}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{a.source.name} · {new Date(a.publishedAt).toLocaleString("ar")}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
