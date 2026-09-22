'use client';
import { useEffect, useState } from 'react';

export default function NewspaperAdmin() {
  const [papers, setPapers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ title:'', date:'', autoGenerate:true });

  useEffect(() => { loadPapers(); }, []);

  async function loadPapers() {
    setLoading(true);
    const d = await fetch('/api/newspaper?published=0').then(r=>r.json()).catch(()=>[]);
    setPapers(Array.isArray(d)?d:[]); setLoading(false);
  }

  async function create() {
    if(!form.title.trim()) { setMsg('العنوان مطلوب'); return; }
    const res = await fetch('/api/newspaper',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title:form.title, date:form.date||undefined, autoGenerate:form.autoGenerate }) });
    const d = await res.json();
    if(res.ok) { setMsg(`تم إنشاء الجريدة (عدد ${d.edition})`); setCreating(false); loadPapers(); }
    else setMsg(d.error||'خطأ');
  }

  async function paperAction(id: string, action: string) {
    const res = await fetch('/api/newspaper',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, action }) });
    if(res.ok) { setMsg('تم'); loadPapers(); }
    else setMsg('حدث خطأ');
  }

  async function deletePaper(id: string) {
    if(!confirm('حذف الجريدة نهائياً؟')) return;
    const res = await fetch('/api/newspaper?id='+id, { method:'DELETE' });
    if(res.ok) { setMsg('تم الحذف'); loadPapers(); }
  }

  return (<>
    <div className="admin-topbar">
      <h1 className="admin-page-title">إدارة الجريدة</h1>
      <div style={{display:'flex',gap:'.5rem'}}>
        <button className="btn btn-primary btn-sm" onClick={()=>setCreating(true)}>+ إصدار جديد</button>
        <a href="/newspaper" target="_blank" className="btn btn-sm btn-ghost">عرض الجريدة</a>
      </div>
    </div>
    <div className="admin-content">
      {msg && <div className="alert alert-success">{msg}</div>}

      {creating && (
        <div className="admin-card">
          <div className="admin-card-title">إصدار جريدة جديد</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">عنوان العدد *</label>
              <input className="form-control" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="مثال: أخبار اليوم — الثلاثاء" />
            </div>
            <div className="form-group">
              <label className="form-label">تاريخ الإصدار</label>
              <input type="date" className="form-control" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} />
            </div>
          </div>
          <label className="form-check" style={{marginBottom:'1rem'}}>
            <input type="checkbox" checked={form.autoGenerate} onChange={e=>setForm(p=>({...p,autoGenerate:e.target.checked}))} />
            <span>توليد صفحات تلقائياً من آخر الأخبار (16 صفحة)</span>
          </label>
          {!form.autoGenerate && <div className="alert alert-info">سيتم إنشاء جريدة فارغة يمكنك تعديلها لاحقاً</div>}
          <div style={{display:'flex',gap:'.5rem'}}>
            <button className="btn btn-primary" onClick={create}>إنشاء</button>
            <button className="btn btn-ghost" onClick={()=>setCreating(false)}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="admin-card">
        <div className="admin-card-title">الإصدارات</div>
        {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> :
        papers.length===0 ? <div className="empty-state"><p>لا توجد إصدارات بعد</p></div> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>العدد</th><th>العنوان</th><th>التاريخ</th><th>الحالة</th><th>PDF</th><th>إجراءات</th></tr></thead>
              <tbody>
                {papers.map((p:any)=>(
                  <tr key={p.id}>
                    <td style={{fontFamily:'Georgia,serif',fontWeight:700,fontSize:'1.1rem'}}>{p.edition}</td>
                    <td style={{fontFamily:'var(--font-heading)'}}>{p.title}</td>
                    <td style={{fontSize:'.8rem'}}>{new Date(p.date).toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</td>
                    <td><span className={`status-badge ${p.isPublished?'status-approved':'status-draft'}`}>{p.isPublished?'منشور':'مسودة'}</span></td>
                    <td>{p.pdfUrl ? <a href={p.pdfUrl} target="_blank" className="btn btn-xs">تحميل PDF</a> : '—'}</td>
                    <td>
                      <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap'}}>
                        <a href={`/newspaper/${p.id}`} target="_blank" className="btn btn-xs">عرض</a>
                        {!p.isPublished ? <button className="btn btn-xs btn-success" onClick={()=>paperAction(p.id,'publish')}>نشر</button>
                          : <button className="btn btn-xs btn-danger" onClick={()=>paperAction(p.id,'unpublish')}>إلغاء النشر</button>}
                        <button className="btn btn-xs btn-danger" onClick={()=>deletePaper(p.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>);
}
