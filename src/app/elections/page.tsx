'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// US State abbreviations with approximate grid positions for map visualization
const US_MAP_GRID = [
  ['','','','','','','','','','','ME'],
  ['','','','','','','','','','','NH'],
  ['WA','','MT','','ND','MN','','','VT',''],
  ['OR','ID','WY','SD','','WI','MI','NY','MA',''],
  ['CA','NV','CO','NE','IA','IL','IN','OH','PA','NJ','CT','RI'],
  ['','AZ','NM','KS','MO','KY','WV','VA','MD','DE',''],
  ['','','','OK','AR','TN','NC','SC','','',''],
  ['','','TX','','MS','AL','GA','','','',''],
  ['','','','LA','','','FL','','','',''],
  ['AK','','HI','','','','','','','',''],
];

const STATE_EV: Record<string,number> = {
  AL:9,AK:3,AZ:11,AR:6,CA:54,CO:10,CT:7,DE:3,FL:30,GA:16,HI:4,ID:4,IL:19,IN:11,IA:6,
  KS:6,KY:8,LA:8,ME:4,MD:10,MA:11,MI:15,MN:10,MS:6,MO:10,MT:4,NE:5,NV:6,NH:4,NJ:14,
  NM:5,NY:28,NC:16,ND:3,OH:17,OK:7,OR:8,PA:19,RI:4,SC:9,SD:3,TN:11,TX:40,UT:6,VT:3,
  VA:13,WA:12,WV:4,WI:10,WY:3,DC:3
};

export default function ElectionsPage() {
  const [election, setElection] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState<any>(null);
  const [voting, setVoting]     = useState(false);
  const [userVote, setUserVote] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string|null>(null);
  const [selectedState, setSelectedState] = useState<string|null>(null);
  const [msg, setMsg] = useState('');
  const [settings, setSettings] = useState<Record<string,string>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r=>r.json()),
      fetch('/api/settings').then(r=>r.json()),
    ]).then(([me, s]) => { setUser(me.user); setSettings(s); loadElection(s.election_active_id); });
  }, []);

  async function loadElection(id?: string) {
    if (!id) { setLoading(false); return; }
    const d = await fetch(`/api/elections?id=${id}`).then(r=>r.json()).catch(()=>null);
    if (d && !d.error) {
      setElection(d);
      setUserVote(d.userVote);
      if (d.userVote) setSelectedCandidate(d.userVote.candidateId);
    }
    setLoading(false);
  }

  async function castVote() {
    if (!selectedCandidate) { setMsg('اختر مرشحاً أولاً'); return; }
    if (!user) { window.location.href = '/login?redirect=/elections'; return; }
    setVoting(true);
    const res = await fetch('/api/elections/vote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ electionId: election.id, candidateId: selectedCandidate, state: selectedState }),
    });
    const d = await res.json();
    if (res.ok) { setMsg('تم التصويت بنجاح! شكراً لمشاركتك'); setUserVote(d); loadElection(election.id); }
    else setMsg(d.error || 'خطأ في التصويت');
    setVoting(false);
  }

  const totalVotes = election?.totalVotes || 0;
  const candidates: any[] = election?.candidates || [];
  const isUS = election?.type === 'us_presidential';
  const isExpired = election?.endsAt && new Date(election.endsAt) < new Date();
  const canVote = user && user.status === 'APPROVED' && !userVote && !isExpired && election?.isActive;

  function getStateWinner(stateCode: string) {
    const stV = election?.stateResults?.[stateCode] || {};
    if (!Object.keys(stV).length) return null;
    let winner = '', maxV = 0;
    for (const [cid, v] of Object.entries(stV) as [string,number][]) {
      if (v > maxV) { maxV = v; winner = cid; }
    }
    return winner;
  }

  function getCandidateColor(candidateId: string) {
    return candidates.find(c => c.id === candidateId)?.color || '#737373';
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="site-logo">
            <img src={settings.logo_path||'/img/logo.png'} alt="CNA" style={{height:50,width:'auto'}} onError={(e:any)=>e.currentTarget.style.display='none'} />
          </Link>
          <div className="header-actions">
            {user ? (
              <><span style={{fontSize:'.82rem',color:'var(--gray-500)'}}>{user.fullName}</span>
              <Link href="/" className="btn btn-sm btn-ghost">الرئيسية</Link></>
            ) : (
              <><Link href="/login?redirect=/elections" className="btn btn-sm btn-primary">دخول للتصويت</Link>
              <Link href="/" className="btn btn-sm btn-ghost">الرئيسية</Link></>
            )}
          </div>
        </div>
      </header>

      <main style={{padding:'2.5rem 0',minHeight:'70vh'}}>
        <div className="container">
          {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> :
          !election ? (
            <div className="empty-state">
              <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🗳️</div>
              <div className="empty-state-title">لا توجد انتخابات نشطة حالياً</div>
              <p>تابعونا للإعلان عن الانتخابات القادمة</p>
              <Link href="/" className="btn btn-primary" style={{marginTop:'1.5rem',display:'inline-block'}}>العودة للرئيسية</Link>
            </div>
          ) : (
            <>
              <div className="election-header">
                <div>
                  <h1 className="election-title">{election.title}</h1>
                  {election.description && <p style={{color:'var(--gray-500)',marginTop:'.5rem'}}>{election.description}</p>}
                  {election.endsAt && (
                    <p style={{fontSize:'.85rem',color:isExpired?'#dc2626':'var(--gray-400)',marginTop:'.35rem'}}>
                      {isExpired ? '⛔ انتهى التصويت' : `⏰ ينتهي التصويت: ${new Date(election.endsAt).toLocaleString('ar-SA')}`}
                    </p>
                  )}
                </div>
                <div style={{textAlign:'center',border:'2px solid var(--black)',padding:'1rem 1.75rem'}}>
                  <div style={{fontFamily:'Georgia,serif',fontSize:'2rem',fontWeight:700}}>{totalVotes.toLocaleString('ar')}</div>
                  <div style={{fontSize:'.78rem',color:'var(--gray-400)'}}>إجمالي الأصوات</div>
                </div>
              </div>

              {msg && <div className={`alert ${msg.includes('خطأ')?'alert-error':'alert-success'}`} style={{marginBottom:'1.5rem'}}>{msg}</div>}

              {/* Candidates */}
              <div className="election-candidates">
                {candidates.map(c => {
                  const votes = election.candidateTotals?.[c.id] || 0;
                  const pct   = totalVotes > 0 ? Math.round(votes/totalVotes*100) : 0;
                  const isSelected = selectedCandidate === c.id;
                  const isWinner   = election.winner === c.id;
                  return (
                    <div key={c.id} className={`candidate-card ${isSelected?'selected':''}`}
                      onClick={()=> canVote && setSelectedCandidate(c.id)}
                      style={{ cursor:canVote?'pointer':'default', borderColor: isSelected ? c.color : (isWinner ? '#f59e0b' : 'var(--border)'), outline: isWinner ? '3px solid #f59e0b' : 'none' }}>
                      {c.image && <img src={c.image} alt={c.name} style={{width:60,height:60,objectFit:'cover',borderRadius:'50%',border:`3px solid ${c.color}`}} />}
                      <div className="candidate-name">{c.name}</div>
                      {c.nameEn && <div style={{fontSize:'.78rem',color:'var(--gray-500)',direction:'ltr',textAlign:'left'}}>{c.nameEn}</div>}
                      <div className="candidate-party" style={{color:c.color}}>{c.party}</div>
                      {isWinner && <div style={{background:'#f59e0b',color:'#fff',padding:'.2rem .5rem',fontSize:'.72rem',fontWeight:700,alignSelf:'flex-start'}}>🏆 الفائز</div>}
                      <div className="candidate-votes" style={{color:c.color}}>{votes.toLocaleString('ar')}</div>
                      <div className="candidate-pct">{pct}% من الأصوات</div>
                      <div className="vote-bar-track"><div className="vote-bar-fill" style={{width:`${pct}%`,background:c.color}} /></div>
                      {isSelected && canVote && <div style={{fontSize:'.75rem',color:c.color,fontWeight:700}}>✓ اخترت هذا المرشح</div>}
                    </div>
                  );
                })}
              </div>

              {/* US Map */}
              {isUS && (
                <div style={{marginBottom:'2rem'}}>
                  <h2 style={{fontFamily:'var(--font-heading)',marginBottom:'1rem',fontSize:'1.2rem'}}>الخريطة التفاعلية — الولايات المتحدة</h2>
                  {isUS && selectedState && canVote && (
                    <div className="alert alert-info" style={{marginBottom:'1rem'}}>
                      التصويت من ولاية: <strong>{selectedState}</strong> — اختر مرشحاً ثم اضغط "صوّت"
                    </div>
                  )}
                  <div style={{overflowX:'auto'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(11,40px)',gap:3,margin:'0 auto',width:'fit-content'}}>
                      {US_MAP_GRID.flat().map((code,i) => {
                        if (!code) return <div key={i} style={{width:40,height:40}} />;
                        const winner = getStateWinner(code);
                        const color  = winner ? getCandidateColor(winner) : '#d4d4d4';
                        const ev     = STATE_EV[code] || 0;
                        const isSelected = selectedState === code;
                        return (
                          <div key={i} title={`${code} (${ev} أصوات انتخابية)`}
                            onClick={()=>{ if(canVote&&isUS) setSelectedState(code===selectedState?null:code); }}
                            style={{
                              width:40,height:40,background:color,display:'flex',alignItems:'center',justifyContent:'center',
                              fontSize:'.55rem',fontWeight:700,color:'#fff',cursor:canVote?'pointer':'default',
                              border:isSelected?'2px solid #000':'2px solid rgba(255,255,255,.3)',
                              transition:'opacity .2s',textShadow:'0 1px 2px rgba(0,0,0,.5)',
                            }}
                            onMouseOver={e=>{(e.currentTarget as any).style.opacity='.8';}}
                            onMouseOut={e=>{(e.currentTarget as any).style.opacity='1';}}>
                            {code}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* EV totals */}
                  <div style={{display:'flex',gap:'1rem',flexWrap:'wrap',marginTop:'1rem',justifyContent:'center'}}>
                    {candidates.map(c=>{
                      const evTotal = US_MAP_GRID.flat().filter(code=>code&&getStateWinner(code)===c.id).reduce((sum,code)=>sum+(STATE_EV[code]||0),0);
                      return (
                        <div key={c.id} style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.85rem'}}>
                          <div style={{width:14,height:14,background:c.color}} />
                          <span style={{fontWeight:600}}>{c.name}:</span>
                          <span style={{fontFamily:'Georgia,serif',fontSize:'1rem',fontWeight:700,color:c.color}}>{evTotal}</span>
                          <span style={{color:'var(--gray-400)'}}>أصوات انتخابية</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vote button */}
              {!user && !isExpired && election.isActive && (
                <div style={{textAlign:'center',marginTop:'1.5rem'}}>
                  <div className="alert alert-info" style={{marginBottom:'1rem',display:'inline-block',textAlign:'right'}}>
                    يجب تسجيل الدخول للمشاركة في التصويت
                  </div>
                  <br />
                  <Link href="/login?redirect=/elections" className="btn btn-primary" style={{padding:'.8rem 2.5rem'}}>تسجيل الدخول للتصويت</Link>
                  <Link href="/register" className="btn" style={{padding:'.8rem 2rem',marginRight:'.75rem'}}>إنشاء حساب جديد</Link>
                </div>
              )}

              {canVote && (
                <div style={{textAlign:'center',marginTop:'1.5rem'}}>
                  {!selectedCandidate && <p style={{color:'var(--gray-500)',marginBottom:'1rem'}}>اختر مرشحاً من القائمة أعلاه</p>}
                  <button className="btn btn-primary" onClick={castVote} disabled={!selectedCandidate||voting}
                    style={{padding:'.85rem 3rem',fontSize:'1.05rem',display:'inline-flex',alignItems:'center',gap:'.5rem'}}>
                    {voting ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}}/> جاري التصويت...</> : '🗳️ تأكيد التصويت'}
                  </button>
                </div>
              )}

              {userVote && (
                <div className="alert alert-success" style={{marginTop:'1.5rem',textAlign:'center'}}>
                  ✅ لقد صوّتت بالفعل في هذه الانتخابات. شكراً لمشاركتك!
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
