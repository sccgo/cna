'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Settings  = Record<string, string>;
type Dept      = { id: string; name: string; slug: string; color: string; _count?: { news: number } };
type NewsItem  = { id: string; title: string; titleEn?: string; mainImage?: string; shortDesc?: string; shortDescEn?: string; isBreaking?: boolean; isLive?: boolean; lang?: string; category?: string; publishedAt?: string; createdAt: string; department?: { name: string; slug: string }; views?: number };
type BreakingItem = { id: string; text: string; bgColor: string; textColor: string; linkUrl?: string };
type FeaturedNews = NewsItem & { counter?: any; heroStyle?: any };
type Election  = { id: string; title: string; type: string; isActive: boolean } | null;

const MONTHS = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function dateAr(d: string) { const dt = new Date(d); return `${dt.getDate()} ${MONTHS[dt.getMonth()+1]} ${dt.getFullYear()}`; }
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return dateAr(d);
}

function Counter({ c }: { c: any }) {
  const [v, setV] = useState({ d:'00', h:'00', m:'00', s:'00' });
  useEffect(() => {
    const u = () => {
      const start = new Date(c.startDate).getTime();
      let diff = c.direction === 'down' ? (start - Date.now()) : (Date.now() - start);
      if (diff < 0) diff = 0;
      const ts = Math.floor(diff / 1000);
      setV({ d:String(Math.floor(ts/86400)).padStart(2,'0'), h:String(Math.floor((ts%86400)/3600)).padStart(2,'0'), m:String(Math.floor((ts%3600)/60)).padStart(2,'0'), s:String(ts%60).padStart(2,'0') });
    };
    u(); const iv = setInterval(u, 1000); return () => clearInterval(iv);
  }, [c]);
  return (
    <div className="counter-widget" style={{ background: c.bgGradient || c.bgColor || '#000' }}>
      {c.bgImage && <div className="counter-widget-bg" style={{ backgroundImage:`url('${c.bgImage}')` }} />}
      <div className="counter-widget-inner" style={{ color: c.textColor || '#fff' }}>
        <div className="counter-label">{c.label || 'منذ'}</div>
        <div className="counter-grid">
          {[{v:v.d,l:'يوم'},{v:v.h,l:'ساعة'},{v:v.m,l:'دقيقة'},{v:v.s,l:'ثانية'}].map(u => (
            <div key={u.l} className="counter-unit">
              <span className="counter-num">{u.v}</span>
              <span className="counter-name">{u.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ticker({ items, bg, textColor, speed }: { items: BreakingItem[]; bg: string; textColor: string; speed: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef   = useRef(0);
  const rafRef   = useRef<number>(0);
  const paused   = useRef(false);
  const pps      = Math.max(20, 130 - speed);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !items.length) return;
    let last = performance.now();
    const step = (now: number) => {
      if (!paused.current) {
        posRef.current += (pps * (now - last)) / 1000;
        const half = el.scrollWidth / 3;
        if (posRef.current >= half) posRef.current = 0;
        el.style.transform = `translateX(${posRef.current}px)`;
      }
      last = now;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [items, pps]);
  const all = [...items, ...items, ...items];
  return (
    <div className="breaking-ticker" style={{ background:bg, color:textColor }} onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
      <div className="ticker-label" style={{ color:bg, background:textColor }}>
        <span className="ticker-dot" style={{ background:bg }} />عاجل
      </div>
      <div className="ticker-track-outer">
        <div ref={trackRef} className="ticker-track">
          {all.map((item, i) => (
            <span key={i} className="ticker-item" style={{ cursor: item.linkUrl ? 'pointer':'default' }} onClick={() => { if (item.linkUrl) window.open(item.linkUrl,'_blank'); }}>
              {item.text}<span className="ticker-sep"> ◆ </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewsCard({ news, lang = 'ar' }: { news: NewsItem; lang?: string }) {
  const title = (lang === 'en' && news.titleEn) ? news.titleEn : news.title;
  const desc  = (lang === 'en' && news.shortDescEn) ? news.shortDescEn : news.shortDesc;
  return (
    <Link href={`/news/${news.id}`} className="news-card" style={{ textDecoration:'none', display:'flex', flexDirection:'column' }}>
      <div className="news-card-img">
        {news.mainImage ? <img src={news.mainImage} alt={title} loading="lazy" /> : <div className="news-card-no-img">CNA</div>}
      </div>
      <div className="news-card-body">
        <div className="news-card-meta">
          {news.isLive && <span className="badge badge-live"><span className="live-dot" />LIVE</span>}
          {news.isBreaking && <span className="badge badge-breaking">عاجل</span>}
          <span>{news.department?.name || news.category}</span>
        </div>
        <h3 className="news-card-title">{title}</h3>
        {desc && <p className="news-card-desc">{desc}</p>}
        <div className="news-card-footer">
          <span>{timeAgo(news.publishedAt || news.createdAt)}</span>
          <span>{(news.views || 0).toLocaleString('ar')} مشاهدة</span>
        </div>
      </div>
    </Link>
  );
}

export default function HomeClient({ settings, departments, featuredNews, breakingItems, activeElection }: {
  settings: Settings; departments: Dept[]; featuredNews: FeaturedNews | null;
  breakingItems: BreakingItem[]; activeElection: Election;
}) {
  const [news, setNews]       = useState<NewsItem[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [dept, setDept]       = useState('');
  const [filter, setFilter]   = useState('all');
  const [lang, setLang]       = useState('ar');
  const [search, setSearch]   = useState('');
  const [user, setUser]       = useState<any>(null);
  const [worldNews, setWorldNews]   = useState<any[]>([]);
  const [worldLoading, setWL]       = useState(false);
  const [worldCountry, setCountry]  = useState('us');
  const [worldCat, setCat]          = useState('general');
  const [sideBreaking, setSideBreaking] = useState<NewsItem[]>([]);
  const pages = Math.ceil(total / 12);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
    fetch('/api/news?breaking=1&limit=6').then(r => r.json()).then(d => setSideBreaking(d.news || [])).catch(() => {});
  }, []);

  const loadNews = useCallback(async (p: number = 1) => {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(p), limit: '12' });
    if (dept)                 sp.set('department', dept);
    if (filter === 'breaking') sp.set('breaking', '1');
    if (filter === 'live')     sp.set('live', '1');
    if (lang !== 'both')      sp.set('lang', lang);
    if (search)               sp.set('search', search);
    const res = await fetch('/api/news?' + sp).catch(() => null);
    if (res?.ok) { const d = await res.json(); setNews(d.news || []); setTotal(d.total || 0); setPage(p); }
    setLoading(false);
  }, [dept, filter, lang, search]);

  useEffect(() => { loadNews(1); }, [loadNews]);

  const loadWorld = useCallback(async () => {
    if (!settings.newsapi_key || settings.show_world_news !== '1') return;
    setWL(true);
    const res = await fetch(`/api/world-news?country=${worldCountry}&category=${worldCat}`).catch(() => null);
    if (res?.ok) { const d = await res.json(); setWorldNews(d.articles || []); }
    setWL(false);
  }, [worldCountry, worldCat, settings]);

  useEffect(() => { loadWorld(); }, [loadWorld]);

  const doSearch = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); loadNews(1); };
  const heroStyle   = featuredNews?.heroStyle as any;
  const isDark      = heroStyle?.bgType !== 'white' && (heroStyle?.bgValue || heroStyle?.bgImage);
  const activeDept  = departments.find(d => d.slug === dept)?.name;

  const importArticle = async (url: string) => {
    if (!user) { window.location.href = '/login'; return; }
    try {
      const res = await fetch('/api/scrape?url=' + encodeURIComponent(url));
      const data = await res.json();
      sessionStorage.setItem('cna_import', JSON.stringify(data));
      window.location.href = '/admin/import';
    } catch (_e) { alert('فشل الاستيراد'); }
  };

  return (
    <>
      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="site-logo" style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <img src={settings.logo_path || '/img/logo.png'} alt="CNA" style={{ height:52, width:'auto' }}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            {settings.secondary_logo_path && (<>
              <div style={{width:1,height:40,background:'var(--border)'}} />
              <img src={settings.secondary_logo_path} alt="شعار" style={{height:46,width:'auto',opacity:.9}}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </>)}
          </Link>
          <form className="search-form" onSubmit={doSearch} style={{ flex:1, maxWidth:300 }}>
            <input type="text" placeholder="ابحث في الأخبار..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
            <button type="submit">بحث</button>
          </form>
          <div className="header-actions">
            {user ? (
              <>
                {user.role !== 'VIEWER' && <Link href="/admin" className="btn btn-sm">الإدارة</Link>}
                <Link href="/profile" className="btn btn-sm btn-ghost">{user.fullName || user.username}</Link>
                <button className="btn btn-sm btn-ghost" onClick={async () => { await fetch('/api/auth/logout',{method:'POST'}); window.location.reload(); }}>خروج</button>
              </>
            ) : (
              <>
                <Link href="/register" className="btn btn-sm">حساب جديد</Link>
                <Link href="/login"    className="btn btn-sm btn-primary">دخول</Link>
              </>
            )}
            <Link href="/newspaper" className="btn btn-sm" style={{ borderStyle:'dashed' }}>📰 عدد اليوم</Link>
          </div>
        </div>
        <nav className="nav-bar">
          <div className="nav-inner">
            <button className={`nav-link ${dept===''&&filter==='all'?'active':''}`} onClick={() => { setDept(''); setFilter('all'); }}>الكل</button>
            {departments.map(d => (
              <button key={d.id} className={`nav-link ${dept===d.slug?'active':''}`} onClick={() => { setDept(d.slug); setFilter('all'); }}>{d.name}</button>
            ))}
          </div>
        </nav>
      </header>

      {/* Ticker */}
      {breakingItems.length > 0 && (
        <Ticker items={breakingItems} bg={settings.ticker_bg||'#000'} textColor={settings.ticker_text_color||'#fff'} speed={parseInt(settings.ticker_speed||'40')} />
      )}

      <main style={{ padding:'2rem 0', minHeight:'60vh' }}>
        <div className="container">

          {/* Election banner */}
          {activeElection && (
            <div style={{ background:'var(--black)', color:'#fff', padding:'.85rem 1.25rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'.5rem' }}>
              <span style={{ fontFamily:'var(--font-heading)', fontSize:'1rem' }}>🗳️ {activeElection.title}</span>
              <Link href="/elections" className="btn btn-sm" style={{ borderColor:'#fff', color:'#fff' }}>شاهد النتائج</Link>
            </div>
          )}

          {/* Hero */}
          {featuredNews && (
            <section className="hero-section">
              <div className="section-header"><h2 className="section-title">الخبر الرئيسي</h2></div>
              <div className="hero-box">
                <div className="hero-img-wrap">
                  {featuredNews.mainImage
                    ? <img src={featuredNews.mainImage} alt={featuredNews.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div className="hero-no-img">CNA</div>}
                </div>
                <div className={`hero-info ${isDark?'dark':''}`} style={{ background: heroStyle?.bgType==='gradient'?heroStyle.bgValue:heroStyle?.bgType==='color'?heroStyle.bgValue:undefined }}>
                  {heroStyle?.bgImage && (<><div className="hero-info-bg" style={{ backgroundImage:`url('${heroStyle.bgImage}')` }} /><div className="hero-info-overlay" /></>)}
                  <div className="hero-info-content">
                    <span className="hero-badge">{featuredNews.isBreaking?'عاجل':'مميز'}</span>
                    <h1 className="hero-title">{featuredNews.title}</h1>
                    {featuredNews.shortDesc && <p className="hero-desc">{featuredNews.shortDesc}</p>}
                    <div className="hero-meta">
                      <span>{featuredNews.department?.name||''}</span>
                      <span>{dateAr(featuredNews.publishedAt||featuredNews.createdAt)}</span>
                    </div>
                    {featuredNews.counter?.isEnabled && <Counter c={featuredNews.counter} />}
                    <Link href={`/news/${featuredNews.id}`} className="hero-read-btn">قراءة الخبر كاملاً</Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Grid + Sidebar */}
          <div className="layout-with-sidebar">
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'.75rem', marginBottom:'1rem' }}>
                <div className="filters-bar" style={{ margin:0 }}>
                  <button className={`filter-chip ${filter==='all'?'active':''}`}      onClick={() => setFilter('all')}>الكل</button>
                  <button className={`filter-chip ${filter==='breaking'?'active':''}`} onClick={() => setFilter('breaking')}>عاجل</button>
                  <button className={`filter-chip ${filter==='live'?'active':''}`}     onClick={() => setFilter('live')}>بث مباشر</button>
                </div>
                <div style={{ display:'flex', gap:'.35rem' }}>
                  {(['ar','en','both'] as const).map(l => (
                    <button key={l} className={`lang-btn ${lang===l?'active':''}`} onClick={() => setLang(l)}>
                      {l==='ar'?'عربي':l==='en'?'English':'الكل'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="section-header">
                <h2 className="section-title">{filter==='breaking'?'عاجل':filter==='live'?'بث مباشر':activeDept||'آخر الأخبار'}</h2>
                <span style={{ fontSize:'.8rem', color:'var(--gray-400)' }}>{total.toLocaleString('ar')} خبر</span>
              </div>
              {loading
                ? <div className="loading-state"><div className="spinner" />جاري التحميل...</div>
                : news.length === 0
                  ? <div className="empty-state"><div className="empty-state-title">لا توجد أخبار</div></div>
                  : <div className="news-grid">{news.map(n => <NewsCard key={n.id} news={n} lang={lang==='both'?'ar':lang} />)}</div>
              }
              {pages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page<=1} onClick={() => loadNews(page-1)}>›</button>
                  {Array.from({length:Math.min(7,pages)},(_,i) => {
                    let p = i+1;
                    if (pages>7) { if(page<=4)p=i+1; else if(page>=pages-3)p=pages-6+i; else p=page-3+i; }
                    return <button key={p} className={`page-btn ${p===page?'active':''}`} onClick={() => loadNews(p)}>{p}</button>;
                  })}
                  <button className="page-btn" disabled={page>=pages} onClick={() => loadNews(page+1)}>‹</button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-widget">
                <h3 className="sidebar-widget-title">عاجل</h3>
                {sideBreaking.length === 0
                  ? <p style={{ fontSize:'.82rem', color:'var(--gray-400)', padding:'.5rem 0' }}>لا توجد أخبار عاجلة</p>
                  : sideBreaking.map(n => (
                    <Link key={n.id} href={`/news/${n.id}`} className="sidebar-news-item" style={{ display:'flex', textDecoration:'none' }}>
                      {n.mainImage && <img src={n.mainImage} alt={n.title} className="sidebar-thumb" />}
                      <div>
                        <div className="sidebar-news-title">{n.title}</div>
                        <div className="sidebar-news-date">{timeAgo(n.publishedAt||n.createdAt)}</div>
                      </div>
                    </Link>
                  ))}
              </div>
              <div className="sidebar-widget">
                <h3 className="sidebar-widget-title">الشعب</h3>
                {departments.map(d => (
                  <div key={d.id} className="sidebar-news-item" style={{ cursor:'pointer' }} onClick={() => { setDept(d.slug); setFilter('all'); }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:d.color, flexShrink:0, marginTop:4 }} />
                    <div>
                      <div className="sidebar-news-title">{d.name}</div>
                      <div className="sidebar-news-date">{d._count?.news||0} خبر</div>
                    </div>
                  </div>
                ))}
              </div>
              {activeElection && (
                <div className="sidebar-widget">
                  <h3 className="sidebar-widget-title">🗳️ انتخابات</h3>
                  <Link href="/elections" style={{ display:'block', border:'1.5px solid var(--black)', padding:'.85rem', textAlign:'center', fontFamily:'var(--font-heading)', fontSize:'.95rem', color:'var(--black)', textDecoration:'none' }}>
                    {activeElection.title}
                  </Link>
                </div>
              )}
            </aside>
          </div>

          {/* World News */}
          {settings.show_world_news === '1' && settings.newsapi_key && (
            <div style={{ marginTop:'3rem', borderTop:'2px solid var(--black)', paddingTop:'2rem' }}>
              <div className="section-header" style={{ marginBottom:'1rem' }}>
                <h2 className="section-title">أخبار عالمية</h2>
                <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                  <select value={worldCountry} onChange={e => setCountry(e.target.value)} className="form-control" style={{ width:'auto', padding:'.35rem .75rem', fontSize:'.82rem' }}>
                    <option value="ae">الإمارات</option><option value="us">الولايات المتحدة</option>
                    <option value="gb">بريطانيا</option><option value="sa">السعودية</option>
                  </select>
                  <select value={worldCat} onChange={e => setCat(e.target.value)} className="form-control" style={{ width:'auto', padding:'.35rem .75rem', fontSize:'.82rem' }}>
                    <option value="general">عام</option><option value="business">أعمال</option>
                    <option value="technology">تقنية</option><option value="sports">رياضة</option>
                  </select>
                  <button className="btn btn-sm" onClick={loadWorld}>تحديث</button>
                </div>
              </div>
              {worldLoading
                ? <div className="loading-state"><div className="spinner" />جاري التحميل...</div>
                : (
                  <div className="world-grid">
                    {worldNews.slice(0,12).map((a,i) => (
                      <div key={i} className="world-card" onClick={() => { if(user&&['DIRECTOR','EDITOR_IN_CHIEF','EDITOR'].includes(user.role)){importArticle(a.url);}else{window.open(a.url,'_blank');} }}>
                        {a.urlToImage && <img src={a.urlToImage} alt="" className="world-card-img" loading="lazy" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />}
                        <div className="world-card-body">
                          <div className="world-card-source">{a.source?.name}</div>
                          <div className="world-card-title">{a.title}</div>
                          <div className="world-card-date">{a.publishedAt?new Date(a.publishedAt).toLocaleDateString('ar-SA'):''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <img src={settings.logo_path||'/img/logo.png'} alt="CNA" style={{ height:42, width:'auto', filter:'invert(1) brightness(2)', marginBottom:'.65rem' }} onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
              <p className="footer-desc">{settings.site_tagline||'المصدر الرسمي للأنباء'}</p>
            </div>
            <div>
              <div className="footer-col-title">التصفح</div>
              <div className="footer-links">{departments.slice(0,5).map(d=><Link key={d.id} href={`/?dept=${d.slug}`}>{d.name}</Link>)}</div>
            </div>
            <div>
              <div className="footer-col-title">الوكالة</div>
              <div className="footer-links">
                <Link href="/newspaper">عدد اليوم</Link>
                <Link href="/elections">الانتخابات</Link>
                <Link href="/login">بوابة الدخول</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {settings.site_name||'وكالة الأنباء التنسيقية'} — جميع الحقوق محفوظة</span>
            <span>{settings.site_name_en||'CNA'}</span>
          </div>
        </div>
      </footer>
    </>
  );
}
