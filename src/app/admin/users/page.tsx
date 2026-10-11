"use client";

import { useEffect, useState } from "react";

type PendingUser = { id: string; fullName: string; email: string; createdAt: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    setUsers(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(userId: string, approve: boolean) {
    setBusyId(userId);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, approve })
    });
    setBusyId(null);
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 700 }}>
      <h1 style={{ marginBottom: 6 }}>طلبات إنشاء الحسابات</h1>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24 }}>
        عمادة القبول: هذه طلبات فعّلت بريدها الإلكتروني وتنتظر موافقتك للدخول والتصويت وإنشاء المقالات.
      </p>

      {loading ? (
        <p>...جارٍ التحميل</p>
      ) : users.length === 0 ? (
        <p style={{ opacity: 0.6 }}>لا توجد طلبات بانتظار المراجعة حالياً.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {users.map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid #333", borderRadius: 10, padding: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{u.fullName}</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{u.email}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>{new Date(u.createdAt).toLocaleString("ar")}</div>
              </div>
              <button disabled={busyId === u.id} onClick={() => decide(u.id, true)} style={{ padding: "8px 16px", fontWeight: 700, background: "#2e7d32", color: "#fff", borderRadius: 6 }}>
                قبول
              </button>
              <button disabled={busyId === u.id} onClick={() => decide(u.id, false)} style={{ padding: "8px 16px", fontWeight: 700, background: "#c62828", color: "#fff", borderRadius: 6 }}>
                رفض
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
