'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NewspaperListPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch('/api/newspaper').then(r=>r.json()).then(d=>{ setPapers(Array.isArray(d)?d:[]); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="site-logo"><img src="/img/logo.png" alt="CNA" style={{height:50,width:'auto'}} onError={(e:any)=>e.currentTarget.style.display='none'} /></Link>
          <div className="header-actions">
            <Link href="/" className="btn btn-sm btn-ghost">الرئيسية</Link>
          </div>
        </div>
      </header>
      <main style={{padding:'2.5rem 0',minHeight:'70vh'}}>
        <div className="container">
          <div className="section-header"><h1 className="section-title">📰 الجريدة</h1></div>
          {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> :
          papers.length===0 ? <div className="empty-state"><div className="empty-state-title">لا توجد إصدارات بعد</div></div> : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'1.25rem'}}>
              {papers.map(p=>(
                <Link key={p.id} href={`/newspaper/${p.id}`} style={{textDecoration:'none',color:'inherit'}}>
                  <div style={{border:'2px solid var(--black)',padding:'1.5rem',transition:'var(--transition)',background:'#fff'}}
                    onMouseOver={e=>{(e.currentTarget as any).style.background='var(--black)';(e.currentTarget as any).style.color='#fff';}}
                    onMouseOut={e=>{(e.currentTarget as any).style.background='#fff';(e.currentTarget as any).style.color='var(--black)';}}>
                    <div style={{fontFamily:'Georgia,serif',fontSize:'2.5rem',fontWeight:900,marginBottom:'.5rem'}}>#{p.edition}</div>
                    <div style={{fontFamily:'var(--font-heading)',fontSize:'1.1rem',fontWeight:700,marginBottom:'.5rem'}}>{p.title}</div>
                    <div style={{fontSize:'.82rem',opacity:.7}}>{new Date(p.date).toLocaleDateString('ar-SA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
