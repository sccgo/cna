'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// State positions on SVG map (approximate geographic layout)
const STATES: Record<string,{x:number;y:number;w:number;h:number;ev:number;name:string}> = {
  WA:{x:85,y:48,w:68,h:55,ev:12,name:'Washington'}, OR:{x:72,y:105,w:72,h:58,ev:8,name:'Oregon'},
  CA:{x:58,y:165,w:72,h:130,ev:54,name:'California'}, NV:{x:103,y:148,w:56,h:78,ev:6,name:'Nevada'},
  ID:{x:145,y:72,w:58,h:78,ev:4,name:'Idaho'}, MT:{x:195,y:42,w:95,h:62,ev:4,name:'Montana'},
  WY:{x:228,y:130,w:72,h:55,ev:3,name:'Wyoming'}, UT:{x:178,y:180,w:60,h:68,ev:6,name:'Utah'},
  AZ:{x:165,y:252,w:65,h:68,ev:11,name:'Arizona'}, CO:{x:242,y:188,w:68,h:58,ev:10,name:'Colorado'},
  NM:{x:228,y:262,w:65,h:68,ev:5,name:'New Mexico'}, ND:{x:348,y:55,w:72,h:50,ev:3,name:'North Dakota'},
  SD:{x:348,y:108,w:72,h:52,ev:3,name:'South Dakota'}, NE:{x:350,y:162,w:78,h:50,ev:5,name:'Nebraska'},
  KS:{x:358,y:215,w:75,h:50,ev:6,name:'Kansas'}, OK:{x:358,y:268,w:82,h:52,ev:7,name:'Oklahoma'},
  TX:{x:330,y:302,w:115,h:118,ev:40,name:'Texas'}, MN:{x:432,y:52,w:68,h:72,ev:10,name:'Minnesota'},
  IA:{x:450,y:158,w:65,h:52,ev:6,name:'Iowa'}, MO:{x:465,y:215,w:68,h:60,ev:10,name:'Missouri'},
  AR:{x:488,y:278,w:58,h:48,ev:6,name:'Arkansas'}, LA:{x:478,y:328,w:62,h:50,ev:8,name:'Louisiana'},
  WI:{x:498,y:98,w:58,h:62,ev:10,name:'Wisconsin'}, IL:{x:518,y:165,w:46,h:72,ev:19,name:'Illinois'},
  MI:{x:552,y:95,w:72,h:68,ev:15,name:'Michigan'}, IN:{x:548,y:175,w:44,h:60,ev:11,name:'Indiana'},
  OH:{x:592,y:162,w:52,h:58,ev:17,name:'Ohio'}, KY:{x:558,y:238,w:82,h:38,ev:8,name:'Kentucky'},
  TN:{x:532,y:278,w:90,h:36,ev:11,name:'Tennessee'}, MS:{x:520,y:315,w:46,h:62,ev:6,name:'Mississippi'},
  AL:{x:560,y:312,w:48,h:58,ev:9,name:'Alabama'}, GA:{x:592,y:302,w:58,h:65,ev:16,name:'Georgia'},
  FL:{x:572,y:368,w:92,h:68,ev:30,name:'Florida'}, SC:{x:638,y:280,w:52,h:42,ev:9,name:'South Carolina'},
  NC:{x:622,y:240,w:90,h:40,ev:16,name:'North Carolina'}, VA:{x:650,y:198,w:85,h:42,ev:13,name:'Virginia'},
  WV:{x:632,y:192,w:44,h:45,ev:4,name:'West Virginia'}, PA:{x:658,y:145,w:78,h:45,ev:19,name:'Pennsylvania'},
  NY:{x:688,y:98,w:82,h:55,ev:28,name:'New York'}, MD:{x:700,y:172,w:56,h:28,ev:10,name:'Maryland'},
  DE:{x:738,y:170,w:20,h:24,ev:3,name:'Delaware'}, NJ:{x:732,y:148,w:26,h:36,ev:14,name:'New Jersey'},
  CT:{x:752,y:128,w:26,h:22,ev:7,name:'Connecticut'}, RI:{x:775,y:128,w:16,h:18,ev:4,name:'Rhode Island'},
  MA:{x:762,y:108,w:50,h:22,ev:11,name:'Massachusetts'}, VT:{x:755,y:75,w:22,h:38,ev:3,name:'Vermont'},
  NH:{x:775,y:72,w:22,h:40,ev:4,name:'New Hampshire'}, ME:{x:788,y:42,w:42,h:58,ev:4,name:'Maine'},
  AK:{x:85,y:370,w:72,h:58,ev:3,name:'Alaska'}, HI:{x:200,y:390,w:65,h:32,ev:4,name:'Hawaii'},
  DC:{x:722,y:188,w:12,h:12,ev:3,name:'D.C.'},
};

function blendColor(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  const bg = 209; // #d1d5db
  const nr = Math.round(bg + (r-bg)*opacity);
  const ng = Math.round(bg + (g-bg)*opacity);
  const nb = Math.round(bg + (b-bg)*opacity);
  return `rgb(${nr},${ng},${nb})`;
}

function getStateColor(code: string, stateResults: Record<string,any>, candidates: any[]): string {
  const r = stateResults?.[code];
  if (!r || !Object.keys(r).length) return '#d1d5db';
  let winner = '', maxV = 0, total = 0;
  for (const [cid, v] of Object.entries(r) as [string,number][]) {
    total += v;
    if (v > maxV) { maxV = v; winner = cid; }
  }
  if (!winner || total === 0) return '#d1d5db';
  const cand = candidates.find((c:any) => c.id === winner);
  if (!cand) return '#9ca3af';
  const margin = maxV / total;
  const intensity = Math.min(1, Math.max(0.35, (margin - 0.45) * 5 + 0.5));
  return blendColor(cand.color, intensity);
}

export default function ElectionsPage() {
  const [election, setElection]     = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [settings, setSettings]     = useState<Record<string,string>>({});
  const [user, setUser]             = useState<any>(null);
  const [tooltip, setTooltip]       = useState<{code:string;x:number;y:number}|null>(null);
  const [councilMsg, setCouncilMsg] = useState('');
  const [councilImg, setCouncilImg] = useState('');
  const [editingCouncil, setEditingCouncil] = useState(false);
  const [stateResults, setStateResults]     = useState<Record<string,any>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r=>r.json()),
      fetch('/api/settings').then(r=>r.json()),
    ]).then(([me, s]) => {
      setUser(me.user);
      setSettings(s);
      setCouncilMsg(s.council_support_msg || '');
      setCouncilImg(s.council_support_img || '');
      loadElection(s.election_active_id);
    });
  }, []);

  async function loadElection(id?: string) {
    if (!id) { setLoading(false); return; }
    const d = await fetch(`/api/elections?id=${id}`).then(r=>r.json()).catch(()=>null);
    if (d && !d.error) { setElection(d); setStateResults(d.stateResults || {}); }
    setLoading(false);
  }

  async function saveCouncil() {
    await fetch('/api/settings', { method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ council_support_msg: councilMsg, council_support_img: councilImg }) });
    setSettings(p=>({...p, council_support_msg: councilMsg, council_support_img: councilImg}));
    setEditingCouncil(false);
  }

  const candidates: any[] = election?.candidates || [];

  // Electoral vote counts
  const evCounts: Record<string,number> = {};
  for (const [code, st] of Object.entries(STATES)) {
    const r = stateResults[code] || {};
    let winner = '', maxV = 0;
    for (const [cid, v] of Object.entries(r) as [string,number][]) { if (v > maxV) { maxV = v; winner = cid; } }
    if (winner) evCounts[winner] = (evCounts[winner]||0) + st.ev;
  }

  const totalVotes = Object.values(election?.candidateTotals||{}).reduce((a:number,b:any)=>a+(b as number),0);
  const isChief    = user?.role === 'EDITOR_IN_CHIEF' || user?.role === 'DIRECTOR';

  function getTooltipData(code: string) {
    const st   = STATES[code];
    const r    = stateResults[code] || {};
    const total = Object.values(r).reduce((a:number,b:any)=>a+(b as number),0);
    let winner = '', maxV = 0;
    for (const [cid, v] of Object.entries(r) as [string,number][]) { if (v > maxV) { maxV = v; winner = cid; } }
    return { st, r, total, winner };
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="site-logo">
            <img src={settings.logo_path||'/img/logo.png'} alt="CNA" style={{height:50,width:'auto'}} onError={e=>{(e.currentTarget as any).style.display='none';}} />
          </Link>
          <div className="header-actions">
            <Link href="/" className="btn btn-sm">الرئيسية</Link>
          </div>
        </div>
      </header>

      <main style={{background:'#f3f4f6',minHeight:'70vh',paddingBottom:'3rem'}}>

        {/* US Flag bar */}
        <div style={{height:10,display:'flex',overflow:'hidden'}}>
          {Array.from({length:26}).map((_,i)=>(
            <div key={i} style={{flex:1,background:i%2===0?'#B22234':'#FFFFFF'}} />
          ))}
        </div>
        <div style={{height:7,background:'#3C3B6E'}} />

        <div className="container" style={{paddingTop:'1.75rem'}}>
          {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> :
          !election ? (
            <div className="empty-state">
              <div className="empty-state-title">لا توجد تغطية انتخابية نشطة</div>
              <Link href="/" className="btn btn-primary" style={{marginTop:'1rem',display:'inline-block'}}>الرئيسية</Link>
            </div>
          ) : (<>

            {/* Title */}
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'.4rem',flexWrap:'wrap'}}>
                {/* US Flag emoji replaced with colored div */}
                <div style={{width:36,height:24,background:'linear-gradient(0deg,#B22234 0 33%,#fff 33% 66%,#3C3B6E 66% 100%)',border:'1px solid #ccc',flexShrink:0}} />
                <h1 style={{fontFamily:'var(--font-heading)',fontSize:'clamp(1.2rem,3vw,2rem)',fontWeight:700,margin:0}}>{election.title}</h1>
                {election.isActive && <span style={{background:'#059669',color:'#fff',padding:'.2rem .7rem',fontSize:'.72rem',fontWeight:700,letterSpacing:'.1em'}}>مباشر</span>}
              </div>
              {election.description && <p style={{color:'var(--gray-500)',fontSize:'.9rem'}}>{election.description}</p>}
              <div style={{fontSize:'.78rem',color:'var(--gray-400)'}}>
                التغطية لأغراض إعلامية فقط — آخر تحديث: {new Date().toLocaleString('ar-SA')}
              </div>
            </div>

            {/* Council support */}
            <div style={{background:'#0d1b4b',color:'#fff',padding:'1.1rem 1.5rem',marginBottom:'1.5rem',borderRight:'4px solid #C9A84C'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem',flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'.7rem',fontWeight:700,letterSpacing:'.14em',color:'#C9A84C',marginBottom:'.4rem'}}>
                    الدعم الذي تم توجيهه من قبل مجلس التنسيق الأعلى:
                  </div>
                  {editingCouncil ? (
                    <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
                      <input className="form-control" value={councilMsg} onChange={e=>setCouncilMsg(e.target.value)}
                        style={{background:'rgba(255,255,255,.1)',color:'#fff',border:'1px solid rgba(255,255,255,.25)'}}
                        placeholder="اكتب موقف المجلس هنا..." />
                      <div style={{display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap'}}>
                        <input type="file" accept="image/*" onChange={async e=>{
                          const f=e.target.files?.[0]; if(!f) return;
                          const fd=new FormData(); fd.append('file',f); fd.append('type','image');
                          const res=await fetch('/api/upload',{method:'POST',body:fd}); const d=await res.json();
                          if(d.url) setCouncilImg(d.url);
                        }} style={{color:'rgba(255,255,255,.7)',fontSize:'.78rem',background:'transparent',border:'none'}} />
                        <button className="btn btn-xs" style={{borderColor:'#C9A84C',color:'#C9A84C'}} onClick={saveCouncil}>حفظ</button>
                        <button className="btn btn-xs btn-ghost" style={{color:'rgba(255,255,255,.5)'}} onClick={()=>setEditingCouncil(false)}>إلغاء</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
                      {councilImg && <img src={councilImg} alt="" style={{height:32,width:'auto',objectFit:'contain'}} />}
                      <p style={{fontFamily:'var(--font-heading)',fontSize:'1rem',color:'#fff',margin:0,lineHeight:1.6}}>
                        {councilMsg || <span style={{opacity:.5,fontStyle:'italic'}}>لم يتم تحديد موقف</span>}
                      </p>
                    </div>
                  )}
                </div>
                {isChief && !editingCouncil && (
                  <button className="btn btn-xs" style={{borderColor:'#C9A84C',color:'#C9A84C',flexShrink:0}} onClick={()=>setEditingCouncil(true)}>تعديل</button>
                )}
              </div>
            </div>

            {/* Candidate EV cards */}
            <div style={{display:'grid',gridTemplateColumns:`repeat(${candidates.length},1fr)`,gap:'1rem',marginBottom:'1.25rem'}}>
              {candidates.map((c:any) => {
                const ev   = evCounts[c.id] || 0;
                const pct  = totalVotes > 0 ? Math.round((election.candidateTotals?.[c.id]||0)/totalVotes*100) : 0;
                const lead = ev === Math.max(...candidates.map((cc:any)=>evCounts[cc.id]||0));
                return (
                  <div key={c.id} style={{background:'#fff',border:`3px solid ${lead?c.color:'#e5e7eb'}`,padding:'1.25rem 1rem',position:'relative'}}>
                    {election.winner===c.id && <div style={{position:'absolute',top:6,left:6,background:'#F59E0B',color:'#fff',padding:'.1rem .45rem',fontSize:'.65rem',fontWeight:700}}>فائز</div>}
                    <div style={{fontFamily:'var(--font-heading)',fontWeight:700,fontSize:'clamp(.9rem,2vw,1.15rem)',marginBottom:'.15rem'}}>{c.name}</div>
                    {c.nameEn && <div style={{fontSize:'.75rem',color:'var(--gray-500)',direction:'ltr',textAlign:'left',marginBottom:'.4rem'}}>{c.nameEn}</div>}
                    <div style={{fontSize:'.75rem',fontWeight:700,color:c.color,marginBottom:'.75rem'}}>{c.party}</div>
                    <div style={{fontFamily:'Georgia,serif',fontSize:'clamp(2rem,5vw,3rem)',fontWeight:900,color:c.color,lineHeight:1}}>{ev}</div>
                    <div style={{fontSize:'.7rem',color:'var(--gray-400)',marginBottom:'.5rem'}}>أصوات انتخابية</div>
                    <div style={{height:5,background:'var(--gray-200)',marginBottom:'.35rem'}}>
                      <div style={{height:'100%',background:c.color,width:`${Math.min(100,(ev/538)*100)}%`,transition:'width 1s ease'}} />
                    </div>
                    <div style={{fontSize:'.72rem',color:'var(--gray-500)',display:'flex',justifyContent:'space-between'}}>
                      <span>{(election.candidateTotals?.[c.id]||0).toLocaleString('ar')}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 270 needed bar */}
            <div style={{background:'#fff',border:'1px solid #e5e7eb',padding:'.55rem 1.25rem',marginBottom:'1.25rem',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem',fontSize:'.85rem'}}>
              <span>يحتاج المرشح الفائز <strong>270</strong> صوتاً انتخابياً من أصل <strong>538</strong></span>
              <div style={{display:'flex',gap:'1rem'}}>
                {candidates.map((c:any)=>(
                  <span key={c.id} style={{color:c.color,fontWeight:700}}>{c.name}: {evCounts[c.id]||0}</span>
                ))}
              </div>
            </div>

            {/* SVG Map */}
            <div style={{background:'#fff',border:'1px solid #e5e7eb',padding:'1.5rem',marginBottom:'1.5rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:'.5rem'}}>
                <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.1rem',fontWeight:700,margin:0}}>الخريطة الجغرافية — الولايات المتحدة</h2>
                <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap',alignItems:'center'}}>
                  {candidates.map((c:any)=>(
                    <div key={c.id} style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'.78rem'}}>
                      <div style={{width:14,height:14,background:c.color,flexShrink:0}} />{c.name}
                    </div>
                  ))}
                  <div style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'.78rem'}}>
                    <div style={{width:14,height:14,background:'#d1d5db',flexShrink:0}} />غير محسوم
                  </div>
                </div>
              </div>

              <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                <svg viewBox="0 0 880 480" style={{width:'100%',minWidth:520,display:'block',margin:'0 auto'}} xmlns="http://www.w3.org/2000/svg">
                  <rect width="880" height="480" fill="#e8f4f8" />
                  {/* Ocean texture */}
                  <defs>
                    <pattern id="ocean" width="8" height="8" patternUnits="userSpaceOnUse">
                      <path d="M0 4 Q2 2 4 4 Q6 6 8 4" stroke="#c8dde8" strokeWidth=".5" fill="none"/>
                    </pattern>
                  </defs>
                  <rect width="880" height="480" fill="url(#ocean)" />

                  {Object.entries(STATES).map(([code, st]) => {
                    const color  = getStateColor(code, stateResults, candidates);
                    const r      = stateResults[code] || {};
                    const total  = Object.values(r).reduce((a:number,b:any)=>a+(b as number),0);
                    let winner='', maxV=0;
                    for (const [cid,v] of Object.entries(r) as [string,number][]) { if(v>maxV){maxV=v;winner=cid;} }
                    const margin = total>0 ? maxV/total : 0;
                    const isClose = winner && margin>0 && margin<0.55;
                    const isTiny  = code==='DC'||code==='RI'||code==='DE';
                    return (
                      <g key={code} style={{cursor:'default'}}
                        onMouseEnter={e=>setTooltip({code,x:(e as any).clientX,y:(e as any).clientY})}
                        onMouseLeave={()=>setTooltip(null)}>
                        <rect x={st.x} y={st.y} width={st.w} height={st.h}
                          fill={color} stroke="#ffffff" strokeWidth={code==='DC'?1:2}
                          style={{transition:'fill .6s'}} rx={1} />
                        {isClose && <rect x={st.x+2} y={st.y+2} width={st.w-4} height={3} fill="#F59E0B" rx={1} />}
                        {!isTiny && (
                          <text x={st.x+st.w/2} y={st.y+st.h/2+1}
                            style={{fontSize:st.w<50?'7px':'8px',fontWeight:'bold',fill:'rgba(255,255,255,.95)',pointerEvents:'none',fontFamily:'Arial,sans-serif'}}
                            textAnchor="middle" dominantBaseline="middle">
                            {code}
                          </text>
                        )}
                        {!isTiny && (
                          <text x={st.x+st.w/2} y={st.y+st.h/2+11}
                            style={{fontSize:'6.5px',fill:'rgba(255,255,255,.75)',pointerEvents:'none',fontFamily:'Arial,sans-serif'}}
                            textAnchor="middle">
                            {st.ev}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  {/* Source label */}
                  <text x="10" y="475" style={{fontSize:'9px',fill:'#9ca3af',fontFamily:'Arial,sans-serif'}}>
                    وكالة الأنباء التنسيقية — تغطية إعلامية فقط
                  </text>
                </svg>
              </div>

              {/* Tooltip */}
              {tooltip && (() => {
                const {st, r, total, winner} = getTooltipData(tooltip.code);
                const wCand = candidates.find((c:any)=>c.id===winner);
                return (
                  <div style={{position:'fixed',left:tooltip.x+14,top:tooltip.y-50,background:'rgba(10,10,10,.94)',color:'#fff',padding:'.7rem 1rem',fontSize:'.78rem',zIndex:9000,pointerEvents:'none',minWidth:175,border:'1px solid rgba(255,255,255,.15)',boxShadow:'0 4px 20px rgba(0,0,0,.4)'}}>
                    <div style={{fontWeight:700,marginBottom:'.3rem',fontSize:'.88rem'}}>{st.name}</div>
                    <div style={{color:'#C9A84C',marginBottom:'.4rem',fontSize:'.72rem'}}>{st.ev} أصوات انتخابية</div>
                    {candidates.map((c:any)=>{
                      const v = (r[c.id]||0) as number;
                      const pct = total>0 ? Math.round(v/total*100) : 0;
                      return (
                        <div key={c.id} style={{display:'flex',justifyContent:'space-between',gap:'1rem',marginBottom:'.18rem',fontWeight:winner===c.id?700:400}}>
                          <span style={{color:c.color}}>{c.name}</span>
                          <span>{v>0?`${v.toLocaleString('ar')} (${pct}%)`:'—'}</span>
                        </div>
                      );
                    })}
                    {wCand && <div style={{marginTop:'.4rem',paddingTop:'.4rem',borderTop:'1px solid rgba(255,255,255,.15)',color:wCand.color,fontWeight:700}}>متقدم: {wCand.name}</div>}
                    {!winner && <div style={{color:'#9ca3af',marginTop:'.3rem',fontStyle:'italic'}}>غير محسوم</div>}
                  </div>
                );
              })()}
            </div>

            {/* States table */}
            <div style={{background:'#fff',border:'1px solid #e5e7eb',marginBottom:'1.5rem'}}>
              <div style={{padding:'1rem 1.5rem',borderBottom:'1px solid #e5e7eb'}}>
                <h2 style={{fontFamily:'var(--font-heading)',fontSize:'1.1rem',fontWeight:700,margin:0}}>نتائج الولايات تفصيلياً</h2>
              </div>
              <div style={{overflowX:'auto'}}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>الولاية</th>
                      <th style={{textAlign:'center'}}>أصوات انتخابية</th>
                      {candidates.map((c:any)=>(
                        <th key={c.id} style={{background:c.color,color:'#fff',textAlign:'center'}}>{c.name}</th>
                      ))}
                      <th style={{textAlign:'center'}}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(STATES).map(([code, st]) => {
                      const r = stateResults[code] || {};
                      const total = Object.values(r).reduce((a:number,b:any)=>a+(b as number),0);
                      let winner='', maxV=0;
                      for (const [cid,v] of Object.entries(r) as [string,number][]) { if(v>maxV){maxV=v;winner=cid;} }
                      const wCand = candidates.find((c:any)=>c.id===winner);
                      const margin = total>0 ? maxV/total : 0;
                      return (
                        <tr key={code}>
                          <td><strong>{st.name}</strong> <span style={{color:'var(--gray-400)',fontSize:'.75rem'}}>{code}</span></td>
                          <td style={{textAlign:'center',fontFamily:'Georgia,serif',fontWeight:700}}>{st.ev}</td>
                          {candidates.map((c:any)=>{
                            const v = (r[c.id]||0) as number;
                            const pct = total>0?Math.round(v/total*100):0;
                            return (
                              <td key={c.id} style={{textAlign:'center',fontWeight:winner===c.id?700:400,color:winner===c.id?c.color:'inherit'}}>
                                {total>0 ? <><div>{v.toLocaleString('ar')}</div><div style={{fontSize:'.72rem',color:'var(--gray-400)'}}>{pct}%</div></> : '—'}
                              </td>
                            );
                          })}
                          <td style={{textAlign:'center'}}>
                            {wCand ? (
                              <span style={{color:wCand.color,fontWeight:700,fontSize:'.82rem'}}>
                                {wCand.name} {margin<0.55&&<span style={{color:'#F59E0B',fontSize:'.72rem'}}>(متقارب)</span>}
                              </span>
                            ) : <span style={{color:'var(--gray-400)',fontSize:'.8rem'}}>غير محسوم</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{background:'#fefce8',border:'1px solid #fde047',padding:'1rem 1.5rem',fontSize:'.82rem',color:'#713f12',lineHeight:1.7}}>
              <strong>ملاحظة:</strong> هذه الصفحة لأغراض التغطية الإعلامية والتوثيقية فقط. البيانات المعروضة استناداً للتغطية الإخبارية المتاحة. لا يمثل هذا الموقع هيئة انتخابية رسمية.
            </div>
          </>)}
        </div>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {settings.site_name||'وكالة الأنباء التنسيقية'}</span>
            <Link href="/" style={{color:'rgba(255,255,255,.5)'}}>الرئيسية</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
