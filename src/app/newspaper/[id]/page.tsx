'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function NewspaperViewer() {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [curPage, setCurPage] = useState(0);
  const [settings, setSettings] = useState<any>({});
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    Promise.all([
      fetch(`/api/newspaper?id=${id}`).then(r=>r.json()),
      fetch('/api/settings').then(r=>r.json()),
    ]).then(([p, s])=>{ setPaper(p); setSettings(s); setLoading(false); }).catch(()=>setLoading(false));
  },[id]);

  async function downloadPDF() {
    // Use browser print to PDF
    const style = document.createElement('style');
    style.textContent = `@media print { body > *:not(#newspaper-print){display:none!important} #newspaper-print{display:block!important} }`;
    document.head.appendChild(style);
    window.print();
    style.remove();
  }

  if(loading) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="spinner" style={{width:40,height:40,borderWidth:3}} /></div>;
  if(!paper || paper.error) return <div style={{textAlign:'center',padding:'4rem'}}><h2>الجريدة غير موجودة</h2><Link href="/newspaper" className="btn btn-primary" style={{marginTop:'1rem',display:'inline-block'}}>العودة</Link></div>;

  const pages = paper.pages || [];
  const currentPage = pages[curPage];
  const siteNameEn  = settings.site_name_en || 'CNA';
  const siteName    = settings.site_name    || 'وكالة الأنباء التنسيقية';
  const date        = new Date(paper.date).toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  return (
    <>
      <header className="site-header">
        <div className="header-inner" style={{maxWidth:960}}>
          <Link href="/" className="site-logo"><img src="/img/logo.png" alt="CNA" style={{height:46,width:'auto'}} onError={(e:any)=>e.currentTarget.style.display='none'} /></Link>
          <div style={{fontFamily:'var(--font-heading)',fontSize:'1rem',color:'var(--gray-500)'}}>
            صحيفة {siteName} — العدد {paper.edition}
          </div>
          <div className="header-actions">
            <button className="btn btn-sm btn-primary" onClick={downloadPDF}>⬇ تحميل PDF</button>
            <Link href="/newspaper" className="btn btn-sm btn-ghost">الإصدارات</Link>
            <Link href="/" className="btn btn-sm btn-ghost">الموقع</Link>
          </div>
        </div>
      </header>

      {/* Page navigation */}
      <div style={{background:'var(--gray-100)',borderBottom:'1px solid var(--border)',padding:'.6rem 1.5rem',display:'flex',alignItems:'center',gap:'.5rem',overflowX:'auto',justifyContent:'center'}}>
        {pages.map((p:any,i:number)=>(
          <button key={i} onClick={()=>setCurPage(i)}
            style={{padding:'.3rem .75rem',border:'1.5px solid',borderColor:curPage===i?'var(--black)':'var(--border)',background:curPage===i?'var(--black)':'#fff',color:curPage===i?'#fff':'var(--gray-500)',fontSize:'.78rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'var(--transition)',fontFamily:'var(--font-body)'}}>
            {i===0?'الغلاف':`ص ${i+1} — ${p.sectionAr||p.section}`}
          </button>
        ))}
      </div>

      <div className="newspaper-viewer" id="newspaper-print">
        <div className="newspaper-page">
          {/* Masthead (every page) */}
          <div className="newspaper-masthead">
            <div className="newspaper-name" style={{fontFamily:'Georgia,serif'}}>{siteNameEn}</div>
            <div className="newspaper-tagline">{siteName}</div>
            <div className="newspaper-date">
              <span>العدد: {paper.edition}</span>
              <span style={{fontFamily:'Georgia,serif',fontWeight:900,fontSize:'1.2rem',letterSpacing:'.05em'}}>{siteNameEn}</span>
              <span>{date}</span>
            </div>
          </div>

          {currentPage ? (
            <>
              {curPage !== 0 && (
                <div className="newspaper-section-banner">{currentPage.sectionAr || currentPage.section}</div>
              )}

              {/* Items */}
              {(currentPage.items||[]).length === 0 ? (
                <div style={{textAlign:'center',padding:'3rem',color:'#999',fontStyle:'italic'}}>صفحة فارغة</div>
              ) : curPage === 0 ? (
                /* Cover layout */
                <div>
                  {currentPage.items.map((item:any,i:number)=>{
                    const n=item.news||{};
                    return (
                      <div key={i} style={{textAlign:'center',marginBottom:'2rem'}}>
                        {(n.mainImage||item.image) && <img src={n.mainImage||item.image} alt="" style={{width:'100%',maxHeight:300,objectFit:'cover',border:'1px solid #ccc',marginBottom:'1rem'}} />}
                        <div style={{fontFamily:'Georgia,serif',fontSize:'2rem',fontWeight:700,marginBottom:'.5rem',lineHeight:1.2}}>{n.title||item.title}</div>
                        <div style={{fontSize:'.9rem',color:'#555',lineHeight:1.6}}>{n.shortDesc||item.content?.replace(/<[^>]+>/g,'').substring(0,200)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Standard grid layout */
                <div className="newspaper-cols">
                  {currentPage.items.map((item:any,i:number)=>{
                    const n=item.news||{};
                    const isLarge=item.size==='large';
                    return (
                      <div key={i} className="newspaper-story" style={isLarge?{gridColumn:'1/-1'}:{}}>
                        {(n.mainImage||item.image) && <img src={n.mainImage||item.image} alt="" className="newspaper-story-img" />}
                        <div className="newspaper-story-title">{n.title||item.title}</div>
                        <div className="newspaper-story-text" dangerouslySetInnerHTML={{__html:(n.content||item.content||n.shortDesc||'').replace(/<[^>]+>/g,'').substring(0,isLarge?600:300)}} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Page footer */}
              <div style={{borderTop:'1px solid #000',marginTop:'2rem',paddingTop:'.5rem',display:'flex',justifyContent:'space-between',fontSize:'.72rem',color:'#555'}}>
                <span>{siteName}</span>
                <span>الصفحة {curPage+1} من {pages.length}</span>
                <span>{date}</span>
              </div>
            </>
          ) : (
            <div style={{textAlign:'center',padding:'3rem',color:'#999'}}>لا توجد صفحة محددة</div>
          )}
        </div>

        {/* Navigation buttons */}
        <div style={{display:'flex',justifyContent:'center',gap:'1rem',marginTop:'1.5rem'}}>
          <button className="btn btn-sm" disabled={curPage===0} onClick={()=>setCurPage(p=>p-1)}>‹ الصفحة السابقة</button>
          <span style={{padding:'.3rem .75rem',fontSize:'.85rem',color:'var(--gray-500)'}}>
            {curPage+1} / {pages.length}
          </span>
          <button className="btn btn-sm" disabled={curPage>=pages.length-1} onClick={()=>setCurPage(p=>p+1)}>الصفحة التالية ›</button>
        </div>
      </div>
    </>
  );
}
