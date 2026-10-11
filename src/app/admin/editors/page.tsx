"use client";

import { useEffect, useState } from "react";

type UserRow = { id: string; fullName: string; email: string; role: string; canEdit: boolean };

export default function AdminEditorsPage() {
  const [editors, setEditors] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/roles"); // scoped to EDITOR-role users for this role
    const data = await res.json();
    setEditors(Array.isArray(data) ? data.filter((u: UserRow) => u.role === "EDITOR") : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(userId: string, canEdit: boolean) {
    await fetch(`/api/admin/editors/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canEdit: !canEdit })
    });
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 700 }}>
      <h1 style={{ marginBottom: 4 }}>التحكم بالمحررين</h1>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24 }}>منح أو سحب صلاحية التحرير من أي محرر دون تغيير حسابه.</p>

      {loading ? <p>...جارٍ التحميل</p> : editors.length === 0 ? (
        <p style={{ opacity: 0.6 }}>لا يوجد محررون بعد.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {editors.map((u) => (
            <div key={u.id} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #333", borderRadius: 8, padding: 10 }}>
              <div style={{ flex: 1, opacity: u.canEdit ? 1 : 0.5 }}>
                <strong>{u.fullName}</strong>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{u.email}</div>
              </div>
              <button onClick={() => toggle(u.id, u.canEdit)} style={{ padding: "8px 16px", borderRadius: 6, fontWeight: 700 }}>
                {u.canEdit ? "سحب صلاحية التحرير" : "منح صلاحية التحرير"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
