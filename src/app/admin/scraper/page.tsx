"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Scraped = {
  title: string; description: string; contentHtml: string;
  imageUrl: string | null; author: string | null; publishedAt: string | null; siteName: string | null;
};

export default function AdminScraperPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [scraped, setScraped] = useState<Scraped | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPreview() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/scraper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    setScraped(data);
  }

  async function importArticle() {
    if (!scraped) return;
    setSaving(true);
    await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleAr: scraped.title,
        excerpt: scraped.description,
        contentHtml: scraped.contentHtml,
        coverImageUrl: scraped.imageUrl,
        source: "API",
        sourceName: scraped.siteName,
        sourceUrl: url,
        status: "PUBLISHED"
      })
    });
    setSaving(false);
    router.push("/admin/articles");
  }

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <h1>أداة سحب المقالات</h1>
      <p style={{ opacity: 0.7, fontSize: 14 }}>
        الصق رابط مقال خارجي، وسيتم استخراج العنوان والوصف والمحتوى والصورة والمؤلف والتاريخ ووضعها بقالب الموقع.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1, padding: 10 }} />
        <button onClick={fetchPreview} disabled={loading}>{loading ? "..." : "جلب"}</button>
      </div>

      {error && <p style={{ color: "#e05252" }}>{error}</p>}

      {scraped && (
        <div className="cna-card" style={{ padding: 16 }}>
          {scraped.imageUrl && <img src={scraped.imageUrl} style={{ width: "100%", borderRadius: 8, marginBottom: 10 }} />}
          <h2>{scraped.title}</h2>
          <p style={{ opacity: 0.7, fontSize: 13 }}>
            {scraped.siteName}{scraped.author && ` · ${scraped.author}`}{scraped.publishedAt && ` · ${new Date(scraped.publishedAt).toLocaleDateString("ar")}`}
          </p>
          <p>{scraped.description}</p>
          <div dangerouslySetInnerHTML={{ __html: scraped.contentHtml }} style={{ maxHeight: 200, overflow: "auto", fontSize: 13, opacity: 0.8 }} />
          <button onClick={importArticle} disabled={saving} style={{ marginTop: 14, padding: "10px 20px", fontWeight: 700 }}>
            {saving ? "..." : "استيراد ونشر بقالب الموقع"}
          </button>
        </div>
      )}
    </div>
  );
}
