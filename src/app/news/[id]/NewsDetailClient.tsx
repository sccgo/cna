'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MONTHS_AR = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function dateAr(d: string) { const dt = new Date(d); return `${dt.getDate()} ${MONTHS_AR[dt.getMonth()+1]} ${dt.getFullYear()} — ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`; }

function Counter({ c }: { c: any }) {
  const [v, setV] = useState({d:'00',h:'00',m:'00',s:'00'});
  useEffect(() => {
    const u = () => { const start=new Date(c.startDate).getTime(),now=Date.now(); let diff=c.direction==='down'?(start-now):(now-start); if(diff<0)diff=0; const ts=Math.floor(diff/1000); setV({d:String(Math.floor(ts/86400)).padStart(2,'0'),h:String(Math.floor((ts%86400)/3600)).padStart(2,'0'),m:String(Math.floor((ts%3600)/60)).padStart(2,'0'),s:String(ts%60).padStart(2,'0')}); };
    u(); const iv = setInterval(u,1000); return ()=>clearInterval(iv);
  },[c]);
  const bg = c.bgGradient || c.bgColor || '#000';
  return (
    <div className="counter-widget" style={{background:bg,margin:'1rem 0'}}>
      {c.bgImage && <div className="counter-widget-bg" style={{backgroundImage:`url('${c.bgImage}')`}} />}
      <div className="counter-widget-inner" style={{color:c.textColor||'#fff'}}>
        <div className="counter-label">{c.label||'منذ'}</div>
        <div className="counter-grid">
          {[{v:v.d,l:'يوم'},{v:v.h,l:'ساعة'},{v:v.m,l:'دقيقة'},{v:v.s,l:'ثانية'}].map(u=>(
            <div key={u.l} className="counter-unit">
              <span className="counter-num" style={{fontFamily:'Georgia,serif'}}>{u.v}</span>
              <span className="counter-name">{u.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PollWidget({ poll, newsId }: { poll: any; newsId: string }) {
  const [user, setUser] = useState<any>(null);
  const [myVote, setMyVote] = useState<number|null>(poll.userVotedIdx ?? null);
  const [voteCounts, setVoteCounts] = useState<Record<number,number>>(poll.voteCounts||{});
  const [total, setTotal] = useState(Object.values(poll.voteCounts||{}).reduce((a:any,b:any)=>a+b,0) as number);
  const [msg, setMsg] = useState('');
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();

  useEffect(()=>{ fetch('/api/auth/me').then(r=>r.json()).then(d=>setUser(d.user)).catch(()=>{}); },[]);

  const vote = async (idx: number) => {
    if (!user) { window.location.href=`/login?redirect=/news/${newsId}`; return; }
    setMsg('');
    const res = await fetch(`/api/polls/${poll.id}/vote`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({optionIdx:idx})});
    const d = await res.json();
    if (!res.ok) { setMsg(d.error); return; }
    setMyVote(idx);
    const nc = {...voteCounts,[idx]:(voteCounts[idx]||0)+1};
    setVoteCounts(nc);
    setTotal(Object.values(nc).reduce((a,b)=>a+b,0));
  };

  const showResults = myVote !== null || isExpired || !user;

  return (
    <div className="poll-widget">
      <div className="poll-label">استطلاع الرأي {isExpired?'(منتهي)':''}</div>
      <div className="poll-question">{poll.question}</div>
      {msg && <div className="alert alert-error" style={{marginBottom:'.75rem'}}>{msg}</div>}
      {!user && !isExpired && (
        <div className="poll-locked">
          يجب <Link href={`/login?redirect=/news/${newsId}`}>تسجيل الدخول</Link> أو{' '}
          <Link href="/register">إنشاء حساب</Link> للمشاركة في التصويت
        </div>
      )}
      {user && !showResults && (
        <div className="poll-options">
          {poll.options.map((opt:string,i:number)=>(
            <button key={i} className="poll-option-btn" onClick={()=>vote(i)}>{opt}</button>
          ))}
        </div>
      )}
      {(showResults && user) && (<>
        {poll.options.map((opt:string,i:number)=>{
          const v=voteCounts[i]||0, pct=total>0?Math.round(v/total*100):0;
          return (
            <div key={i} className="poll-result">
              <div className="poll-result-lbl">
                <span>{opt}{myVote===i?' ✓':''}</span>
                <span>{pct}% ({v})</span>
              </div>
              <div className="poll-bar-track"><div className="poll-bar-fill" style={{width:`${pct}%`,background:myVote===i?'var(--black)':undefined}} /></div>
            </div>
          );
        })}
        <div className="poll-total">مجموع الأصوات: {total.toLocaleString('ar')}</div>
      </>)}
    </div>
  );
}

export default function NewsDetailClient({ news, related }: { news: any; related: any[] }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [lightbox, setLightbox] = useState<string|null>(null);
  const [lang, setLang] = useState<'ar'|'en'>('ar');
  const isEn = lang === 'en' && news.titleEn;
  const heroStyle = news.heroStyle as any;

  useEffect(()=>{ fetch('/api/auth/me').then(r=>r.json()).then(d=>setUser(d.user)).catch(()=>{}); },[]);

  const canEdit = user && ['DIRECTOR','EDITOR_IN_CHIEF','EDITOR'].includes(user.role);

  const deleteNews = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الخبر؟')) return;
    const res = await fetch(`/api/news/${news.id}`,{method:'DELETE'});
    if (res.ok) { router.push('/'); router.refresh(); }
  };

  const embedUrl = (url: string) => {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
    return url;
  };

  const liveUrl = news.isLive && news.liveUrl ? embedUrl(news.liveUrl) : null;
  const settings = {} as Record<string,string>;

  return (
    <>
      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="site-logo">
            <img src="/img/logo.png" alt="CNA" style={{height:50,width:'auto'}} onError={(e:any)=>e.currentTarget.style.display='none'} />
          </Link>
          <div className="header-actions">
            {user ? (<>
              {canEdit && <Link href={`/admin/cms?edit=${news.id}`} className="btn btn-sm">تعديل</Link>}
              {canEdit && <button className="btn btn-sm btn-danger" onClick={deleteNews}>حذف</button>}
              <Link href="/admin" className="btn btn-sm btn-ghost">الإدارة</Link>
              <button className="btn btn-sm btn-ghost" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.href='/';}}>خروج</button>
            </>) : (<>
              <Link href="/login" className="btn btn-sm btn-primary">دخول</Link>
            </>)}
          </div>
        </div>
      </header>

      <main style={{padding:'2.5rem 0',minHeight:'60vh'}}>
        <div className="container">
          {/* Breadcrumb */}
          <div style={{fontSize:'.82rem',color:'var(--gray-400)',marginBottom:'1.25rem',display:'flex',gap:'.5rem',alignItems:'center'}}>
            <Link href="/" style={{color:'var(--gray-400)'}}>الرئيسية</Link>
            <span>/</span>
            {news.department && <><Link href={`/?dept=${news.department.slug}`} style={{color:'var(--gray-400)'}}>{news.department.name}</Link><span>/</span></>}
            <span style={{color:'var(--gray-700)'}}>{news.title.substring(0,40)}...</span>
          </div>

          <div className="layout-with-sidebar">
            <article className="news-detail">
              <div className="detail-badges">
                {news.isLive && <span className="badge badge-live"><span className="live-dot"/>بث مباشر</span>}
                {news.isBreaking && <span className="detail-badge breaking">عاجل</span>}
                {news.department && <span className="detail-badge">{news.department.name}</span>}
                {news.titleEn && (
                  <div style={{display:'flex',gap:'.3rem',marginRight:'auto'}}>
                    <button className={`lang-btn ${lang==='ar'?'active':''}`} onClick={()=>setLang('ar')}>عربي</button>
                    <button className={`lang-btn ${lang==='en'?'active':''}`} onClick={()=>setLang('en')}>EN</button>
                  </div>
                )}
              </div>

              <h1 className="detail-title">{isEn ? news.titleEn : news.title}</h1>
              {(isEn ? news.shortDescEn : news.shortDesc) && (
                <p className="detail-desc">{isEn ? news.shortDescEn : news.shortDesc}</p>
              )}

              <div className="detail-meta">
                <span><strong>تاريخ النشر:</strong> {dateAr(news.publishedAt||news.createdAt)}</span>
                {news.updatedAt !== news.createdAt && <span><strong>تحديث:</strong> {dateAr(news.updatedAt)}</span>}
                <span><strong>المشاهدات:</strong> {(news.views||0).toLocaleString('ar')}</span>
                {news.author && <span><strong>الكاتب:</strong> {news.author.fullName}</span>}
                {news.source && <span><strong>المصدر:</strong> {news.sourceUrl ? <a href={news.sourceUrl} target="_blank" rel="noopener noreferrer">{news.source}</a> : news.source}</span>}
              </div>

              {/* Live player */}
              {liveUrl && (
                <>
                  <div className="live-banner"><span className="live-dot" style={{width:9,height:9,background:'#fff'}} />البث المباشر</div>
                  <div className="live-player"><iframe src={liveUrl} allowFullScreen allow="autoplay; encrypted-media" loading="lazy" /></div>
                </>
              )}

              {/* Main image */}
              {!news.isLive && news.mainImage && (
                <img src={news.mainImage} alt={news.title} className="detail-main-img" onClick={()=>setLightbox(news.mainImage)} style={{cursor:'zoom-in'}} />
              )}

              {/* Counter */}
              {news.counter?.isEnabled && <Counter c={news.counter} />}

              {/* Content */}
              <div className={`detail-content ${isEn?'ltr':''}`} dir={isEn?'ltr':'rtl'}
                dangerouslySetInnerHTML={{__html: isEn ? (news.contentEn||news.content) : news.content}} />

              {/* Gallery */}
              {news.images?.length > 0 && (
                <div style={{marginTop:'1.5rem'}}>
                  <div className="section-header"><h3 className="section-title">صور الخبر</h3></div>
                  <div className="detail-gallery">
                    {news.images.map((img:string,i:number)=>(
                      <img key={i} src={img} alt="" loading="lazy" onClick={()=>setLightbox(img)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Poll */}
              {news.poll && <PollWidget poll={news.poll} newsId={news.id} />}

              {/* Related */}
              {related.length > 0 && (
                <div style={{marginTop:'2.5rem'}}>
                  <div className="section-header"><h3 className="section-title">أخبار ذات صلة</h3></div>
                  <div className="news-grid">
                    {related.map(r=>(
                      <Link key={r.id} href={`/news/${r.id}`} className="news-card" style={{textDecoration:'none'}}>
                        <div className="news-card-img">
                          {r.mainImage ? <img src={r.mainImage} alt={r.title} loading="lazy" /> : <div className="news-card-no-img">CNA</div>}
                        </div>
                        <div className="news-card-body">
                          <h3 className="news-card-title">{r.title}</h3>
                          <div className="news-card-footer"><span>{r.department?.name||''}</span><span>{dateAr(r.publishedAt||r.createdAt).split('—')[0]}</span></div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-widget">
                <h3 className="sidebar-widget-title">معلومات الخبر</h3>
                <div style={{fontSize:'.85rem',display:'flex',flexDirection:'column',gap:'.55rem',color:'var(--gray-500)'}}>
                  {news.department && <div><strong style={{color:'var(--black)'}}>الشعبة:</strong> {news.department.name}</div>}
                  <div><strong style={{color:'var(--black)'}}>الفئة:</strong> {news.category}</div>
                  <div><strong style={{color:'var(--black)'}}>تاريخ النشر:</strong> {dateAr(news.publishedAt||news.createdAt)}</div>
                  <div><strong style={{color:'var(--black)'}}>المشاهدات:</strong> {(news.views||0).toLocaleString('ar')}</div>
                  {news.isBreaking && <div style={{fontWeight:700,color:'var(--black)'}}>خبر عاجل</div>}
                  {news.isLive && <div style={{fontWeight:700,color:'var(--black)'}}>بث مباشر نشط</div>}
                </div>
              </div>
              {!user && (
                <div className="sidebar-widget">
                  <h3 className="sidebar-widget-title">المشاركة</h3>
                  <p style={{fontSize:'.82rem',color:'var(--gray-500)',marginBottom:'.75rem',lineHeight:1.6}}>سجّل دخولك للمشاركة في التصويت وإدارة حسابك</p>
                  <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
                    <Link href={`/login?redirect=/news/${news.id}`} className="btn btn-primary btn-sm" style={{textAlign:'center'}}>تسجيل الدخول</Link>
                    <Link href="/register" className="btn btn-sm" style={{textAlign:'center'}}>إنشاء حساب</Link>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={()=>setLightbox(null)}>
          <button className="lightbox-close" onClick={()=>setLightbox(null)}>✕</button>
          <img src={lightbox} alt="" onClick={e=>e.stopPropagation()} />
        </div>
      )}

      <footer className="site-footer"><div className="container">
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} وكالة الأنباء التنسيقية — جميع الحقوق محفوظة</span>
          <Link href="/" style={{color:'rgba(255,255,255,.5)'}}>الرئيسية</Link>
        </div>
      </div></footer>
    </>
  );
}
