'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';

/* ── Types ──────────────────────────────────────────────────── */
type S   = Record<string,string>;
type Dept = { id:string; name:string; nameEn?:string; slug:string; color:string; news: NewsItem[] };
type NewsItem = { id:string; title:string; titleEn?:string; mainImage?:string; shortDesc?:string; isBreaking?:boolean; isLive?:boolean; views?:number; publishedAt?:string; createdAt:string; department?:{ name:string; color:string } };
type Breaking = { id:string; text:string; bgColor:string; textColor:string; linkUrl?:string };
type Banner   = { id:string; type:string; position:string; imageUrl?:string; html?:string; text?:string; link?:string; bgColor?:string; bgImage?:string; textColor?:string; isTransparent?:boolean };
type Election = { id:string; title:string; type:string; isActive:boolean }|null;

/* ── Months العز ────────────────────────────────────────────── */
const MBASE = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const EZZ   = new Set([9,10,11,12,1,2]);
function mname(n:number){ const b=MBASE[n]||''; return EZZ.has(n)?b+' العز':b; }
function dateAr(d:string){ const dt=new Date(d); return `${dt.getDate()} ${mname(dt.getMonth()+1)} ${dt.getFullYear()}`; }
function timeAgo(d:string){
  const m=Math.floor((Date.now()-new Date(d).getTime())/60000);
  if(m<1) return 'الآن'; if(m<60) return `منذ ${m} د`;
  const h=Math.floor(m/60); if(h<24) return `منذ ${h} س`;
  return dateAr(d);
}

/* ── Date/Time Banner ───────────────────────────────────────── */
function DateBanner({ settings }: { settings: S }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const iv = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(iv); }, []);
  const days = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  return (
    <div style={{ background:'var(--black)', color:'rgba(255,255,255,.6)', fontSize:'.72rem', padding:'.3rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', letterSpacing:'.04em' }}>
      <span style={{ color:'rgba(255,255,255,.35)', fontFamily:'monospace' }}>{settings.site_name_en||'CNA'}</span>
      <span style={{ fontFamily:'monospace' }}>{days[now.getDay()]} {dateAr(now.toISOString())} — {time}</span>
    </div>
  );
}

/* ── Breaking Ticker ────────────────────────────────────────── */
function Ticker({ items, bg, textColor, speed }: { items: Breaking[]; bg:string; textColor:string; speed:number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef   = useRef(0);
  const rafRef   = useRef(0);
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
    <div style={{ background:bg, color:textColor, display:'flex', alignItems:'stretch', height:38, overflow:'hidden' }}
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}>
      <div style={{ background:textColor, color:bg, padding:'0 1.25rem', display:'flex', alignItems:'center', gap:'.45rem', fontWeight:900, fontSize:'.72rem', letterSpacing:'.15em', flexShrink:0 }}>
        <span style={{ width:7, height:7, borderRadius:'50%', background:bg, display:'inline-block', animation:'pulse-dot 1s step-start infinite' }} />
        عاجل
      </div>
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <div ref={trackRef} style={{ display:'flex', alignItems:'center', height:'100%', whiteSpace:'nowrap' }}>
          {all.map((item, i) => (
            <span key={i} style={{ padding:'0 1.75rem', fontSize:'.83rem', cursor:item.linkUrl?'pointer':'default' }}
              onClick={() => { if (item.linkUrl) window.open(item.linkUrl,'_blank'); }}>
              {item.text}<span style={{ opacity:.3, margin:'0 .5rem' }}>◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Counter ────────────────────────────────────────────────── */
function Counter({ c }: { c: any }) {
  const [v, setV] = useState({ d:'00', h:'00', m:'00', s:'00' });
  useEffect(() => {
    const u = () => {
      let diff = c.direction==='down' ? (new Date(c.startDate).getTime()-Date.now()) : (Date.now()-new Date(c.startDate).getTime());
      if (diff < 0) diff = 0;
      const ts = Math.floor(diff/1000);
      setV({ d:String(Math.floor(ts/86400)).padStart(2,'0'), h:String(Math.floor((ts%86400)/3600)).padStart(2,'0'), m:String(Math.floor((ts%3600)/60)).padStart(2,'0'), s:String(ts%60).padStart(2,'0') });
    };
    u(); const iv = setInterval(u,1000); return () => clearInterval(iv);
  }, [c]);
  return (
    <div style={{ background: c.bgGradient||c.bgColor||'#8B0000', padding:'1.25rem 1.5rem', color: c.textColor||'#fff', position:'relative' }}>
      {c.bgImage && <div style={{ position:'absolute', inset:0, backgroundImage:`url('${c.bgImage}')`, backgroundSize:'cover', backgroundPosition:'center', opacity:.35 }} />}
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ fontSize:'.72rem', fontWeight:700, letterSpacing:'.15em', marginBottom:'.6rem', opacity:.75 }}>{c.label||'منذ'}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'.35rem' }}>
          {[{v:v.d,l:'يوم'},{v:v.h,l:'ساعة'},{v:v.m,l:'دقيقة'},{v:v.s,l:'ثانية'}].map(u => (
            <div key={u.l} style={{ textAlign:'center', background:'rgba(0,0,0,.3)', padding:'.5rem .25rem' }}>
              <div style={{ fontFamily:'monospace', fontSize:'clamp(1.4rem,3vw,2.2rem)', fontWeight:700, lineHeight:1 }}>{u.v}</div>
              <div style={{ fontSize:'.6rem', opacity:.7, marginTop:'.2rem', letterSpacing:'.08em' }}>{u.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Ad Banner ──────────────────────────────────────────────── */
function AdBanner({ banner }: { banner: Banner }) {
  const bg = banner.isTransparent ? 'transparent' :
    banner.bgImage ? `url('${banner.bgImage}') center/cover` :
    banner.bgColor || '#111';

  const inner = banner.type === 'html'
    ? <div dangerouslySetInnerHTML={{ __html: banner.html||'' }} />
    : banner.type === 'image' && banner.imageUrl
      ? <img src={banner.imageUrl} alt="" style={{ width:'100%', maxHeight:200, objectFit:'cover', display:'block' }} />
      : <div style={{ padding:'1.25rem', textAlign:'center', color:banner.textColor||'#fff', fontSize:'.95rem' }}>{banner.text}</div>;

  return (
    <div style={{ background:bg, margin:'1.5rem 0', border:banner.isTransparent?'none':'1px solid rgba(255,255,255,.08)', overflow:'hidden' }}
      onClick={() => { if (banner.link) window.open(banner.link,'_blank'); }}
      style2={{ cursor: banner.link ? 'pointer':'default' }}>
      {inner}
    </div>
  );
}

/* ── Dept News Section ──────────────────────────────────────── */
function DeptSection({ dept, onAllClick }: { dept: Dept; onAllClick: (slug:string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'right'|'left') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir==='right' ? 300 : -300, behavior:'smooth' });
  };

  return (
    <section style={{ marginBottom:'2.5rem' }}>
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:'.65rem', borderBottom:`3px solid ${dept.color||'var(--black)'}`, marginBottom:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
          <div style={{ width:4, height:24, background:dept.color||'var(--black)' }} />
          <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.3rem', fontWeight:700, margin:0 }}>{dept.name}</h2>
        </div>
        <button onClick={() => onAllClick(dept.slug)}
          style={{ background:'none', border:`1.5px solid ${dept.color||'var(--black)'}`, color:dept.color||'var(--black)', padding:'.3rem .85rem', fontSize:'.78rem', fontWeight:700, cursor:'pointer', letterSpacing:'.05em' }}>
          كل الأخبار
        </button>
      </div>

      {/* Scrollable news row */}
      {dept.news.length === 0 ? (
        <p style={{ color:'var(--gray-400)', fontSize:'.9rem', padding:'1rem 0' }}>لا توجد أخبار</p>
      ) : (
        <div style={{ position:'relative' }}>
          {dept.news.length > 4 && (
            <button onClick={() => scroll('right')}
              style={{ position:'absolute', right:-16, top:'50%', transform:'translateY(-50%)', zIndex:2, width:36, height:36, border:'2px solid var(--black)', background:'var(--white)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>
              ›
            </button>
          )}
          <div ref={scrollRef} style={{ display:'flex', gap:'1px', overflowX:'auto', scrollbarWidth:'none', msOverflowStyle:'none', paddingBottom:'2px' }}>
            {dept.news.map(n => (
              <Link key={n.id} href={`/news/${n.id}`}
                style={{ flexShrink:0, width:220, textDecoration:'none', color:'inherit', display:'block', border:'1px solid var(--border)', background:'var(--white)', overflow:'hidden', transition:'transform .2s, box-shadow .2s' }}
                onMouseOver={e => { (e.currentTarget as any).style.transform='translateY(-3px)'; (e.currentTarget as any).style.boxShadow='0 6px 20px rgba(0,0,0,.1)'; }}
                onMouseOut={e  => { (e.currentTarget as any).style.transform=''; (e.currentTarget as any).style.boxShadow=''; }}>
                {/* Image */}
                <div style={{ height:120, overflow:'hidden', background:'#f0f0f0', position:'relative' }}>
                  {n.mainImage
                    ? <img src={n.mainImage} alt={n.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                    : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc', fontFamily:'Georgia,serif', fontSize:'.9rem', letterSpacing:'.2em' }}>CNA</div>}
                  {n.isBreaking && <div style={{ position:'absolute', top:6, right:6, background:'#B22234', color:'#fff', fontSize:'.6rem', fontWeight:700, padding:'.15rem .45rem', letterSpacing:'.08em' }}>عاجل</div>}
                  {n.isLive    && <div style={{ position:'absolute', top:6, right:6, background:'#059669', color:'#fff', fontSize:'.6rem', fontWeight:700, padding:'.15rem .45rem', display:'flex', alignItems:'center', gap:'.25rem' }}><span style={{ width:5, height:5, borderRadius:'50%', background:'#fff', animation:'pulse-dot .9s infinite' }} />مباشر</div>}
                </div>
                {/* Body */}
                <div style={{ padding:'.75rem' }}>
                  <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'.88rem', fontWeight:700, lineHeight:1.4, margin:'0 0 .4rem', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {n.title}
                  </h3>
                  <div style={{ fontSize:'.68rem', color:'var(--gray-400)', display:'flex', justifyContent:'space-between' }}>
                    <span>{timeAgo(n.publishedAt||n.createdAt)}</span>
                    <span>{(n.views||0).toLocaleString('ar')} مشاهدة</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {dept.news.length > 4 && (
            <button onClick={() => scroll('left')}
              style={{ position:'absolute', left:-16, top:'50%', transform:'translateY(-50%)', zIndex:2, width:36, height:36, border:'2px solid var(--black)', background:'var(--white)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>
              ‹
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ══ MAIN COMPONENT ══════════════════════════════════════════ */
export default function HomeClient({ settings, departments, breakingItems, featuredNews, latestNews, banners, activeElection }: {
  settings: S; departments: Dept[]; breakingItems: Breaking[];
  featuredNews: any; latestNews: any[]; banners: Banner[]; activeElection: Election;
}) {
  const [user, setUser]     = useState<any>(null);
  const [search, setSearch] = useState('');
  const [activeDept, setActiveDept] = useState('');
  const router = { push: (url: string) => { window.location.href = url; } };

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d=>setUser(d.user)).catch(()=>{});
    // Init sparkles
    fetch('/api/settings?keys=sparkles_enabled,sparkles_count,sparkles_speed,sparkles_colors,sparkles_shapes,sparkles_opacity')
      .then(r=>r.json())
      .then(d => {
        if (d.sparkles_enabled !== '1') return;
        const cfg = { enabled:true, count:parseInt(d.sparkles_count||'30'), speed:parseFloat(d.sparkles_speed||'1.2'), opacity:parseFloat(d.sparkles_opacity||'0.8'), colors:(d.sparkles_colors||'#C9A84C,#E8D48B,#FFFFFF').split(','), shapes:(d.sparkles_shapes||'star,diamond').split(',') };
        if ((window as any).CNA?.sparkles) (window as any).CNA.sparkles.start(cfg);
      }).catch(()=>{});
  }, []);

  const doSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (search.trim()) window.location.href = `/?search=${encodeURIComponent(search)}`;
  };

  const bannersAfter = (pos: string) => banners.filter(b => b.position === pos);

  // Filter departments if a dept is active
  const visibleDepts = activeDept ? departments.filter(d => d.slug === activeDept) : departments;

  return (
    <>
      {/* ── Date/Time banner ────────────────── */}
      <DateBanner settings={settings} />

      {/* ── Header ──────────────────────────── */}
      <header style={{ background:'var(--white)', borderBottom:'2px solid var(--black)', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'.85rem 1.5rem', display:'flex', alignItems:'center', gap:'1rem' }}>
          {/* Logo */}
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:'.85rem', flexShrink:0, textDecoration:'none' }}>
            <img src={settings.logo_path||'/img/logo.png'} alt="CNA" style={{ height:52, width:'auto' }} onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
            {settings.secondary_logo_path && (<>
              <div style={{ width:1, height:40, background:'var(--border)' }} />
              <img src={settings.secondary_logo_path} alt="" style={{ height:46, width:'auto' }} onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
            </>)}
          </Link>

          {/* Search */}
          <form onSubmit={doSearch} style={{ flex:1, display:'flex', border:'1.5px solid var(--black)', overflow:'hidden', maxWidth:360 }}>
            <input type="text" placeholder="ابحث في الأخبار..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{ flex:1, padding:'.45rem .9rem', border:'none', outline:'none', fontFamily:'var(--font-body)', fontSize:'.875rem', direction:'rtl' }} />
            <button type="submit" style={{ padding:'.45rem 1rem', background:'var(--black)', color:'#fff', border:'none', cursor:'pointer', fontSize:'.82rem' }}>بحث</button>
          </form>

          {/* Right: settings info + auth */}
          <div style={{ display:'flex', alignItems:'center', gap:'.65rem', flexShrink:0, marginRight:'auto' }}>
            {activeElection && (
              <Link href="/elections" style={{ padding:'.35rem .8rem', border:'1.5px solid #B22234', color:'#B22234', fontSize:'.78rem', fontWeight:700, textDecoration:'none', animation:'pulse-border 2s infinite' }}>
                انتخابات مباشرة
              </Link>
            )}
            {user ? (<>
              {user.role !== 'VIEWER' && <Link href="/admin" style={{ padding:'.4rem .9rem', background:'var(--black)', color:'#fff', fontSize:'.8rem', fontWeight:700, textDecoration:'none' }}>الإدارة</Link>}
              <Link href="/profile" style={{ fontSize:'.82rem', color:'var(--gray-500)', textDecoration:'none' }}>{user.fullName||user.username}</Link>
              <button onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});window.location.reload();}} style={{ background:'none', border:'1px solid var(--border)', padding:'.3rem .7rem', cursor:'pointer', fontSize:'.78rem', fontFamily:'var(--font-body)' }}>خروج</button>
            </>) : (<>
              <Link href="/register" style={{ padding:'.4rem .85rem', border:'1.5px solid var(--black)', fontSize:'.8rem', textDecoration:'none', color:'var(--black)', fontWeight:600 }}>حساب جديد</Link>
              <Link href="/login"    style={{ padding:'.4rem .85rem', background:'var(--black)', color:'#fff', fontSize:'.8rem', textDecoration:'none', fontWeight:600 }}>دخول</Link>
            </>)}
            <Link href="/newspaper" style={{ padding:'.4rem .75rem', border:'1.5px solid var(--border)', fontSize:'.78rem', textDecoration:'none', color:'var(--gray-500)' }}>الجريدة</Link>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ borderTop:'1px solid var(--gray-200)', background:'var(--gray-100)', overflowX:'auto' }}>
          <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 1.5rem', display:'flex', scrollbarWidth:'none' }}>
            <button onClick={() => setActiveDept('')}
              style={{ padding:'.65rem 1.1rem', border:'none', background:'transparent', borderBottom:`2px solid ${activeDept===''?'var(--black)':'transparent'}`, cursor:'pointer', fontSize:'.875rem', fontWeight:600, color:activeDept===''?'var(--black)':'var(--gray-500)', whiteSpace:'nowrap', fontFamily:'var(--font-body)', transition:'.15s' }}>
              الكل
            </button>
            {departments.map(d => (
              <button key={d.id} onClick={() => setActiveDept(activeDept===d.slug?'':d.slug)}
                style={{ padding:'.65rem 1.1rem', border:'none', background:'transparent', borderBottom:`2px solid ${activeDept===d.slug?d.color||'var(--black)':'transparent'}`, cursor:'pointer', fontSize:'.875rem', fontWeight:600, color:activeDept===d.slug?d.color||'var(--black)':'var(--gray-500)', whiteSpace:'nowrap', fontFamily:'var(--font-body)', transition:'.15s' }}>
                {d.name}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Breaking ticker ─────────────────── */}
      {breakingItems.length > 0 && (
        <Ticker items={breakingItems} bg={settings.ticker_bg||'#B22234'} textColor={settings.ticker_text_color||'#fff'} speed={parseInt(settings.ticker_speed||'40')} />
      )}

      {/* ── Occasions bar ───────────────────── */}
      {settings.occasion_enabled==='1' && settings.occasion_text && (
        <div style={{ background:settings.occasion_strip_bg||'#0d1b4b', color:settings.occasion_strip_color||'#fff', height:36, overflow:'hidden', display:'flex', alignItems:'center' }}>
          <div style={{ whiteSpace:'nowrap', animation:'tickerMove 28s linear infinite', fontSize:'.85rem', fontWeight:700, letterSpacing:'.06em' }}>
            {Array(8).fill(settings.occasion_text).join('   ★   ')}
          </div>
        </div>
      )}

      {/* ── Main ─────────────────────────────── */}
      <main style={{ minHeight:'60vh', padding:'0 0 3rem' }}>

        {/* ── Occasion image (full width) ─── */}
        {settings.occasion_enabled==='1' && settings.occasion_image && (
          <div style={{ width:'100%', maxHeight:340, overflow:'hidden', cursor:settings.occasion_link?'pointer':'default' }}
            onClick={() => settings.occasion_link && window.open(settings.occasion_link,'_blank')}>
            <img src={settings.occasion_image} alt="" style={{ width:'100%', maxHeight:340, objectFit:'cover', display:'block' }} />
          </div>
        )}

        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'1.5rem 1.5rem 0' }}>

          {/* ── Hero section: left latest + right featured ── */}
          {!activeDept && (<>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:'1px', border:'1px solid var(--border)', marginBottom:'2.5rem', background:'var(--border)' }}>

              {/* Left: latest 4 news */}
              <div style={{ background:'var(--white)', display:'flex', flexDirection:'column' }}>
                {/* Counter if featured has one */}
                {featuredNews?.counter?.isEnabled && <Counter c={featuredNews.counter} />}
                {/* Latest news list */}
                {latestNews.map((n, i) => (
                  <Link key={n.id} href={`/news/${n.id}`} style={{ display:'flex', gap:'.75rem', padding:'.85rem', borderBottom:'1px solid var(--gray-100)', textDecoration:'none', color:'inherit', background:i%2===0?'#fff':'#fafafa', transition:'background .15s' }}
                    onMouseOver={e=>{(e.currentTarget as any).style.background='var(--gray-100)';}}
                    onMouseOut={e=>{(e.currentTarget as any).style.background=i%2===0?'#fff':'#fafafa';}}>
                    <div style={{ width:72, height:56, flexShrink:0, overflow:'hidden', background:'var(--gray-200)' }}>
                      {n.mainImage
                        ? <img src={n.mainImage} alt={n.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.6rem', color:'#ccc', letterSpacing:'.1em' }}>CNA</div>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-heading)', fontSize:'.88rem', fontWeight:700, lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:'.3rem' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize:'.68rem', color:'var(--gray-400)', display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                        <span>{n.department?.name}</span>
                        <span>{timeAgo(n.publishedAt||n.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Right: featured / event banner */}
              <div style={{ background:'var(--black)', position:'relative', minHeight:380, display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                {/* Background */}
                {featuredNews?.mainImage && (
                  <img src={featuredNews.mainImage} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:.45 }} />
                )}
                {settings.occasion_enabled==='1' && settings.occasion_image && !featuredNews && (
                  <img src={settings.occasion_image} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:.55 }} />
                )}
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.2) 60%, transparent 100%)' }} />

                {/* Content */}
                <div style={{ position:'relative', zIndex:1, padding:'1.75rem' }}>
                  {featuredNews && (<>
                    {featuredNews.isBreaking && <div style={{ display:'inline-block', background:'#B22234', color:'#fff', fontSize:'.68rem', fontWeight:700, padding:'.25rem .75rem', marginBottom:'.75rem', letterSpacing:'.12em' }}>عاجل</div>}
                    <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'clamp(1.2rem,2.5vw,1.9rem)', fontWeight:700, color:'#fff', lineHeight:1.3, marginBottom:'.75rem' }}>
                      {featuredNews.title}
                    </h1>
                    {featuredNews.shortDesc && <p style={{ color:'rgba(255,255,255,.75)', fontSize:'.88rem', lineHeight:1.7, marginBottom:'1rem' }}>{featuredNews.shortDesc}</p>}
                    <div style={{ display:'flex', gap:'1rem', alignItems:'center', flexWrap:'wrap' }}>
                      <Link href={`/news/${featuredNews.id}`} style={{ display:'inline-block', padding:'.65rem 1.75rem', background:'#fff', color:'#000', fontWeight:700, fontSize:'.88rem', textDecoration:'none', transition:'.2s' }}
                        onMouseOver={e=>{(e.currentTarget as any).style.background='var(--black)';(e.currentTarget as any).style.color='#fff';}}
                        onMouseOut={e=>{(e.currentTarget as any).style.background='#fff';(e.currentTarget as any).style.color='#000';}}>
                        اقرأ الخبر كاملاً
                      </Link>
                      <span style={{ color:'rgba(255,255,255,.5)', fontSize:'.78rem' }}>{featuredNews.department?.name} — {dateAr(featuredNews.publishedAt||featuredNews.createdAt)}</span>
                    </div>
                  </>)}
                  {!featuredNews && (
                    <div style={{ textAlign:'center', color:'rgba(255,255,255,.4)', padding:'2rem', fontFamily:'Georgia,serif', fontSize:'1.1rem', letterSpacing:'.2em' }}>
                      {settings.site_name_en||'CNA'}
                    </div>
                  )}
                </div>

                {/* Pagination dots if multiple */}
                <div style={{ position:'absolute', bottom:'1rem', left:'1rem', display:'flex', gap:'.35rem', zIndex:1 }}>
                  {['E','1','2','3'].map((l,i) => (
                    <div key={l} style={{ width:l==='E'?36:28, height:28, border:'1.5px solid rgba(255,255,255,.6)', background:i===0?'rgba(255,255,255,.25)':'transparent', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.8)', fontSize:'.72rem', fontFamily:'monospace' }}>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Banners after hero */}
            {bannersAfter('top').map(b => <AdBanner key={b.id} banner={b} />)}
          </>)}

          {/* ── Department sections ─────────── */}
          {(activeDept ? departments.filter(d=>d.slug===activeDept) : departments).map((dept, idx) => (<>
            <DeptSection key={dept.id} dept={dept} onAllClick={slug => setActiveDept(slug)} />
            {/* Banner after each dept */}
            {bannersAfter(dept.slug).map(b => <AdBanner key={b.id} banner={b} />)}
          </>))}

        </div>
      </main>

      {/* ── Footer ──────────────────────────── */}
      <footer style={{ background:'var(--black)', color:'#fff', padding:'2.5rem 0 1.25rem' }}>
        <div style={{ maxWidth:'var(--max-w)', margin:'0 auto', padding:'0 1.5rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:'2rem', marginBottom:'2rem' }}>
            <div>
              <img src={settings.logo_path||'/img/logo.png'} alt="CNA" style={{ height:40, filter:'invert(1) brightness(2)', marginBottom:'.65rem' }} onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}} />
              <p style={{ fontSize:'.82rem', color:'rgba(255,255,255,.4)', lineHeight:1.7, marginTop:'.5rem' }}>{settings.site_tagline||'المصدر الرسمي للأنباء'}</p>
            </div>
            <div>
              <div style={{ fontSize:'.65rem', fontWeight:700, letterSpacing:'.15em', color:'rgba(255,255,255,.3)', marginBottom:'.85rem', textTransform:'uppercase' }}>التصفح</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'.45rem' }}>
                {departments.slice(0,5).map(d => (
                  <button key={d.id} onClick={()=>setActiveDept(d.slug)} style={{ background:'none', border:'none', color:'rgba(255,255,255,.55)', cursor:'pointer', fontSize:'.85rem', textAlign:'right', fontFamily:'var(--font-body)', padding:0 }}>{d.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:'.65rem', fontWeight:700, letterSpacing:'.15em', color:'rgba(255,255,255,.3)', marginBottom:'.85rem', textTransform:'uppercase' }}>الوكالة</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'.45rem' }}>
                {[{href:'/newspaper',label:'الجريدة'},{href:'/elections',label:'الانتخابات'},{href:'/login',label:'بوابة الدخول'},{href:'/register',label:'إنشاء حساب'}].map(l => (
                  <Link key={l.href} href={l.href} style={{ color:'rgba(255,255,255,.55)', fontSize:'.85rem', textDecoration:'none' }}>{l.label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.1)', paddingTop:'1.1rem', display:'flex', justifyContent:'space-between', fontSize:'.75rem', color:'rgba(255,255,255,.3)', flexWrap:'wrap', gap:'.5rem' }}>
            <span>© {new Date().getFullYear()} {settings.site_name||'وكالة الأنباء التنسيقية'} — جميع الحقوق محفوظة</span>
            <span>{settings.site_name_en||'CNA'}</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse-border { 0%,100%{border-color:#B22234;} 50%{border-color:#FF6B6B;} }
        @keyframes pulse-dot    { 0%,100%{opacity:1} 50%{opacity:.2} }
        @keyframes tickerMove   { 0%{transform:translateX(100vw)} 100%{transform:translateX(-100%)} }
        nav::-webkit-scrollbar  { display:none }
        div[style*="overflow-x: auto"]::-webkit-scrollbar { display:none }
      `}</style>
    </>
  );
}
