"use client";

import { useEffect, useState } from "react";

type UserRow = { id: string; fullName: string; email: string; role: string; canEdit: boolean };
type PermRequest = { id: string; message: string | null; createdAt: string; user: { fullName: string; email: string; role: string } };

const ROLES = [
  { value: "VIEWER", label: "زائر" },
  { value: "EDITOR", label: "محرر" },
  { value: "REVIEWER", label: "مراجع" },
  { value: "DEVELOPER", label: "مبرمج" },
  { value: "EDITOR_IN_CHIEF", label: "رئيس التحرير" },
  { value: "ADMISSIONS", label: "عمادة القبول" },
  { value: "DIRECTOR", label: "رئيس الوكالة" }
];

export default function AdminRolesPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [requests, setRequests] = useState<PermRequest[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [u, r] = await Promise.all([
      fetch("/api/admin/roles").then((res) => res.json()),
      fetch("/api/permission-requests").then((res) => res.json())
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setRequests(Array.isArray(r) ? r.filter((x: any) => x.status === "PENDING") : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setRole(userId: string, role: string) {
    await fetch(`/api/admin/roles/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role })
    });
    load();
  }

  async function decideRequest(id: string, approve: boolean) {
    await fetch(`/api/permission-requests/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve })
    });
    load();
  }

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <h1 style={{ marginBottom: 4 }}>إدارة الأدوار والصلاحيات</h1>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 24 }}>للمدير وحده — تعيين أي دور من الأدوار السبعة لأي مستخدم.</p>

      {requests.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16 }}>طلبات صلاحية معلّقة</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {requests.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #333", borderRadius: 8, padding: 10 }}>
                <div style={{ flex: 1 }}>
                  <strong>{r.user.fullName}</strong> ({r.user.email}) — {r.message}
                </div>
                <button onClick={() => decideRequest(r.id, true)} style={{ background: "#2e7d32", color: "#fff", padding: "6px 12px", borderRadius: 6 }}>موافقة</button>
                <button onClick={() => decideRequest(r.id, false)} style={{ background: "#c62828", color: "#fff", padding: "6px 12px", borderRadius: 6 }}>رفض</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16 }}>كل المستخدمين</h2>
      {loading ? <p>...جارٍ التحميل</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {users.map((u) => (
            <div key={u.id} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #333", borderRadius: 8, padding: 10 }}>
              <div style={{ flex: 1 }}>
                <strong>{u.fullName}</strong>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{u.email}</div>
              </div>
              <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
