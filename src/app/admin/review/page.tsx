'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReviewPage() {
  const [news, setNews]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');
  const [rejectId, setRejectId] = useState<string|null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/news?status=PENDING_REVIEW&limit=50').then(r=>r.json()).catch(()=>({}));
    setNews(d.news||[]); setLoading(false);
  }

  async function review(id: string, action: 'approve'|'reject', note?: string) {
    const res = await fetch(`/api/news/${id}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action, note }) });
    if(res.ok) { setMsg(action==='approve'?'تم قبول الخبر':'تم رفض الخبر'); setRejectId(null); load(); }
    else { const d=await res.json(); setMsg(d.error||'خطأ'); }
  }

  return (<>
    <div className="admin-topbar">
      <h1 className="admin-page-title">مراجعة المحتوى</h1>
      <span style={{fontSize:'.9rem',color:'var(--gray-400)'}}>{news.length} بانتظار المراجعة</span>
    </div>
    <div className="admin-content">
      {msg && <div className="alert alert-success" style={{marginBottom:'1rem'}}>{msg}</div>}
      {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> :
      news.length===0 ? (
        <div className="empty-state">
          <div style={{fontSize:'3rem',marginBottom:'1rem'}}>✅</div>
          <div className="empty-state-title">لا يوجد محتوى بانتظار المراجعة</div>
          <p>جميع المقالات تمت مراجعتها</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          {news.map(n=>(
            <div key={n.id} className="admin-card" style={{padding:'1.25rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',gap:'.5rem',marginBottom:'.5rem',flexWrap:'wrap'}}>
                    {n.isBreaking && <span className="badge badge-breaking">عاجل</span>}
                    {n.isFeatured && <span className="badge badge-imported">مميز</span>}
                    <span className="status-badge status-pending">بانتظار المراجعة</span>
                    <span style={{fontSize:'.75rem',color:'var(--gray-400)'}}>{n.department?.name||n.category}</span>
                  </div>
                  <h3 style={{fontFamily:'var(--font-heading)',fontSize:'1.1rem',marginBottom:'.4rem'}}>{n.title}</h3>
                  {n.titleEn && <div style={{fontSize:'.85rem',color:'var(--gray-500)',direction:'ltr',textAlign:'left',marginBottom:'.4rem'}}>{n.titleEn}</div>}
                  {n.shortDesc && <p style={{fontSize:'.85rem',color:'var(--gray-500)',margin:0}}>{n.shortDesc.substring(0,200)}...</p>}
                  <div style={{display:'flex',gap:'1rem',marginTop:'.5rem',fontSize:'.75rem',color:'var(--gray-400)'}}>
                    <span>الكاتب: {n.author?.fullName||'—'}</span>
                    <span>{new Date(n.createdAt).toLocaleString('ar-SA')}</span>
                  </div>
                </div>
                {n.mainImage && <img src={n.mainImage} alt="" style={{width:120,height:80,objectFit:'cover',flexShrink:0,border:'1px solid var(--border)'}} />}
              </div>
              <div style={{display:'flex',gap:'.5rem',marginTop:'1rem',paddingTop:'.75rem',borderTop:'1px solid var(--border)'}}>
                <a href={`/news/${n.id}`} target="_blank" className="btn btn-xs btn-ghost">معاينة</a>
                <Link href={`/admin/cms?edit=${n.id}`} className="btn btn-xs btn-ghost">تعديل</Link>
                <button className="btn btn-xs btn-success" onClick={()=>review(n.id,'approve')}>✓ قبول ونشر</button>
                <button className="btn btn-xs btn-danger" onClick={()=>{setRejectId(n.id);setNote('');}}>✗ رفض</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',padding:'2rem',width:420,border:'2px solid var(--black)'}}>
            <h3 style={{fontFamily:'var(--font-heading)',marginBottom:'1rem'}}>سبب الرفض</h3>
            <textarea className="form-control" value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="اكتب سبب الرفض للمحرر (اختياري)..." />
            <div style={{display:'flex',gap:'.5rem',marginTop:'1rem',justifyContent:'flex-end'}}>
              <button className="btn btn-danger" onClick={()=>review(rejectId,'reject',note)}>رفض المقال</button>
              <button className="btn btn-ghost" onClick={()=>setRejectId(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>);
}
