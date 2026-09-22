'use client';
import { useEffect, useState } from 'react';

export default function DesignReviewPage() {
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    // Get design changes from API
    const res = await fetch('/api/settings/design-changes').then(r=>r.json()).catch(()=>[]);
    setChanges(Array.isArray(res) ? res : []);
    setLoading(false);
  }

  async function approve(id: string) {
    const res = await fetch('/api/settings/design-changes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    });
    const d = await res.json();
    if (res.ok) { setMsg('✅ تمت الموافقة وتطبيق التصميم فوراً'); load(); }
    else setMsg(d.error || 'خطأ');
  }

  async function reject(id: string) {
    const note = prompt('سبب الرفض (اختياري):');
    const res = await fetch('/api/settings/design-changes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'reject', note: note || '' }),
    });
    if (res.ok) { setMsg('تم الرفض'); load(); }
  }

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-page-title">مراجعة تعديلات التصميم</h1>
      </div>
      <div className="admin-content">
        {msg && <div className="alert alert-success">{msg}</div>}
        {loading ? <div className="loading-state"><div className="spinner" />جاري التحميل...</div> :
        changes.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎨</div>
            <div className="empty-state-title">لا توجد تعديلات بانتظار المراجعة</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {changes.map((c: any) => (
              <div key={c.id} className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.75rem' }}>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', marginBottom: '.3rem' }}>{c.title}</h3>
                    {c.description && <p style={{ fontSize: '.85rem', color: 'var(--gray-500)', margin: 0 }}>{c.description}</p>}
                    <div style={{ fontSize: '.75rem', color: 'var(--gray-400)', marginTop: '.35rem' }}>
                      المطور: {c.developer?.fullName} — {new Date(c.createdAt).toLocaleString('ar-SA')}
                    </div>
                  </div>
                  <span className={`status-badge status-${c.status === 'PENDING' ? 'pending' : c.status === 'APPROVED' ? 'approved' : 'rejected'}`}>
                    {c.status === 'PENDING' ? 'بانتظار المراجعة' : c.status === 'APPROVED' ? 'مقبول' : 'مرفوض'}
                  </span>
                </div>

                {/* Show changed settings */}
                <div style={{ marginTop: '.75rem', padding: '.75rem', background: 'var(--gray-100)', borderRadius: 0 }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--gray-500)' }}>التغييرات المقترحة:</div>
                  <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
                    {Object.entries(c.settings as Record<string,string>).map(([k, v]) => (
                      <div key={k} style={{ fontSize: '.72rem', border: '1px solid var(--border)', padding: '.2rem .5rem', background: '#fff' }}>
                        <span style={{ color: 'var(--gray-400)' }}>{k}: </span>
                        {v.startsWith('#') ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}>
                            <span style={{ width: 12, height: 12, background: v, border: '1px solid var(--border)' }} />{v}
                          </span>
                        ) : <span style={{ fontFamily: 'monospace' }}>{String(v).substring(0, 40)}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {c.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                    <button className="btn btn-success btn-sm" onClick={() => approve(c.id)}>✓ موافقة وتطبيق فوري</button>
                    <button className="btn btn-danger btn-sm" onClick={() => reject(c.id)}>✗ رفض</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
