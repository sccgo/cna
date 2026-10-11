"use client";

import { useEffect, useState } from "react";

export default function AdminLivePage() {
  const [active, setActive] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        setActive(s.liveActive);
        setUrl(s.liveYoutubeUrl ?? "");
        setTitle(s.liveTitle ?? "");
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ liveActive: active, liveYoutubeUrl: url, liveTitle: title })
    });
    setSaving(false);
  }

  return (
    <div style={{ padding: 32, maxWidth: 500 }}>
      <h1 style={{ marginBottom: 16 }}>البث المباشر</h1>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          تفعيل وضع البث المباشر
        </label>
        <input placeholder="عنوان البث" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="رابط يوتيوب" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button disabled={saving} onClick={save} style={{ padding: "10px 20px", fontWeight: 700 }}>
          {saving ? "..." : "حفظ"}
        </button>
      </div>
    </div>
  );
}
