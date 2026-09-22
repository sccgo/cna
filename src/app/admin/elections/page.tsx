'use client';
import { useEffect, useState } from 'react';

const US_STATES = [
  {code:'AL',name:'Alabama',ev:9},{code:'AK',name:'Alaska',ev:3},{code:'AZ',name:'Arizona',ev:11},
  {code:'AR',name:'Arkansas',ev:6},{code:'CA',name:'California',ev:54},{code:'CO',name:'Colorado',ev:10},
  {code:'CT',name:'Connecticut',ev:7},{code:'DE',name:'Delaware',ev:3},{code:'FL',name:'Florida',ev:30},
  {code:'GA',name:'Georgia',ev:16},{code:'HI',name:'Hawaii',ev:4},{code:'ID',name:'Idaho',ev:4},
  {code:'IL',name:'Illinois',ev:19},{code:'IN',name:'Indiana',ev:11},{code:'IA',name:'Iowa',ev:6},
  {code:'KS',name:'Kansas',ev:6},{code:'KY',name:'Kentucky',ev:8},{code:'LA',name:'Louisiana',ev:8},
  {code:'ME',name:'Maine',ev:4},{code:'MD',name:'Maryland',ev:10},{code:'MA',name:'Massachusetts',ev:11},
  {code:'MI',name:'Michigan',ev:15},{code:'MN',name:'Minnesota',ev:10},{code:'MS',name:'Mississippi',ev:6},
  {code:'MO',name:'Missouri',ev:10},{code:'MT',name:'Montana',ev:4},{code:'NE',name:'Nebraska',ev:5},
  {code:'NV',name:'Nevada',ev:6},{code:'NH',name:'New Hampshire',ev:4},{code:'NJ',name:'New Jersey',ev:14},
  {code:'NM',name:'New Mexico',ev:5},{code:'NY',name:'New York',ev:28},{code:'NC',name:'North Carolina',ev:16},
  {code:'ND',name:'North Dakota',ev:3},{code:'OH',name:'Ohio',ev:17},{code:'OK',name:'Oklahoma',ev:7},
  {code:'OR',name:'Oregon',ev:8},{code:'PA',name:'Pennsylvania',ev:19},{code:'RI',name:'Rhode Island',ev:4},
  {code:'SC',name:'South Carolina',ev:9},{code:'SD',name:'South Dakota',ev:3},{code:'TN',name:'Tennessee',ev:11},
  {code:'TX',name:'Texas',ev:40},{code:'UT',name:'Utah',ev:6},{code:'VT',name:'Vermont',ev:3},
  {code:'VA',name:'Virginia',ev:13},{code:'WA',name:'Washington',ev:12},{code:'WV',name:'West Virginia',ev:4},
  {code:'WI',name:'Wisconsin',ev:10},{code:'WY',name:'Wyoming',ev:3},{code:'DC',name:'D.C.',ev:3},
];

export default function ElectionsAdmin() {
  const [elections, setElections] = useState<any[]>([]);
  const [selected, setSelected]   = useState<any>(null);
  const [creating, setCreating]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState('');
  const [newElection, setNew]     = useState({ title:'', titleEn:'', type:'local', description:'', endsAt:'', candidates:[ {id:'c1',name:'',nameEn:'',party:'',color:'#2563eb'}, {id:'c2',name:'',nameEn:'',party:'',color:'#dc2626'} ] });

  useEffect(()=>{ loadElections(); },[]);

  async function loadElections() {
    setLoading(true);
    const d = await fetch('/api/elections').then(r=>r.json()).catch(()=>[]);
    setElections(Array.isArray(d)?d:[]);
    setLoading(false);
  }

  async function loadSelected(id: string) {
    const d = await fetch(`/api/elections?id=${id}`).then(r=>r.json());
    setSelected(d);
  }

  async function createElection() {
    const cands = newElection.candidates.filter(c=>c.name.trim());
    if(!newElection.title||cands.length<2) { setMsg('العنوان ومرشحان على الأقل مطلوبان'); return; }
    const res = await fetch('/api/elections',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...newElection,candidates:cands})});
    const d = await res.json();
    if(res.ok) { setMsg('تم إنشاء الانتخابات'); setCreating(false); loadElections(); }
    else setMsg(d.error||'خطأ');
  }

  async function manageElection(electionId: string, action: string, extra?: any) {
    const res = await fetch('/api/elections',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({electionId,action,...extra})});
    if(res.ok) { setMsg('تم'); loadElections(); if(selected?.id===electionId) loadSelected(electionId); }
    else setMsg('حدث خطأ');
  }

  function addCandidate() {
    setNew(p=>({...p,candidates:[...p.candidates,{id:'c'+Date.now(),name:'',nameEn:'',party:'',color:'#'+Math.floor(Math.random()*16777215).toString(16)}]}));
  }

  return (<>
    <div className="admin-topbar">
      <h1 className="admin-page-title">الانتخابات</h1>
      <button className="btn btn-primary btn-sm" onClick={()=>setCreating(true)}>+ إنشاء انتخابات</button>
    </div>
    <div className="admin-content">
      {msg && <div className="alert alert-info">{msg}</div>}

      {/* Create form */}
      {creating && (
        <div className="admin-card">
          <div className="admin-card-title">إنشاء انتخابات جديدة</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">العنوان *</label><input className="form-control" value={newElection.title} onChange={e=>setNew(p=>({...p,title:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">العنوان الإنجليزي</label><input className="form-control ltr" value={newElection.titleEn} onChange={e=>setNew(p=>({...p,titleEn:e.target.value}))} dir="ltr" /></div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">النوع</label>
              <select className="form-control" value={newElection.type} onChange={e=>setNew(p=>({...p,type:e.target.value}))}>
                <option value="local">محلية</option>
                <option value="us_presidential">رئاسية أمريكية</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">تنتهي في</label><input type="datetime-local" className="form-control" value={newElection.endsAt} onChange={e=>setNew(p=>({...p,endsAt:e.target.value}))} /></div>
          </div>
          <div className="form-group"><label className="form-label">وصف (اختياري)</label><textarea className="form-control" value={newElection.description} onChange={e=>setNew(p=>({...p,description:e.target.value}))} rows={2} /></div>

          <div className="admin-card-title" style={{marginTop:'1.25rem'}}>المرشحون</div>
          {newElection.candidates.map((c,i)=>(
            <div key={c.id} className="form-row" style={{alignItems:'start',marginBottom:'.75rem'}}>
              <div className="form-group" style={{margin:0}}><label className="form-label">الاسم العربي</label><input className="form-control" value={c.name} onChange={e=>{const cds=[...newElection.candidates];cds[i]={...cds[i],name:e.target.value};setNew(p=>({...p,candidates:cds}));}} /></div>
              <div className="form-group" style={{margin:0}}><label className="form-label">الحزب</label><input className="form-control" value={c.party} onChange={e=>{const cds=[...newElection.candidates];cds[i]={...cds[i],party:e.target.value};setNew(p=>({...p,candidates:cds}));}} /></div>
              <div className="form-group" style={{margin:0}}><label className="form-label">اللون</label><input type="color" className="form-control" value={c.color} onChange={e=>{const cds=[...newElection.candidates];cds[i]={...cds[i],color:e.target.value};setNew(p=>({...p,candidates:cds}));}} style={{height:45}} /></div>
              {i>=2 && <button type="button" className="btn btn-xs btn-danger" style={{marginTop:'1.6rem'}} onClick={()=>setNew(p=>({...p,candidates:p.candidates.filter((_,j)=>j!==i)}))}>-</button>}
            </div>
          ))}
          <button type="button" className="btn btn-xs" onClick={addCandidate} style={{marginBottom:'1rem'}}>+ مرشح</button>

          <div style={{display:'flex',gap:'.5rem',marginTop:'1rem'}}>
            <button className="btn btn-primary" onClick={createElection}>إنشاء</button>
            <button className="btn btn-ghost" onClick={()=>setCreating(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Elections list */}
      {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> : (
        elections.length===0 ? <div className="empty-state"><div className="empty-state-title">لا توجد انتخابات</div></div> :
        <div className="admin-table-wrap" style={{marginBottom:'1.5rem'}}>
          <table className="admin-table">
            <thead><tr><th>العنوان</th><th>النوع</th><th>الأصوات</th><th>الحالة</th><th>ينتهي</th><th>إجراءات</th></tr></thead>
            <tbody>
              {elections.map((e:any)=>(
                <tr key={e.id}>
                  <td style={{fontFamily:'var(--font-heading)',fontWeight:600}}>{e.title}</td>
                  <td><span className="badge badge-breaking" style={{background:e.type==='us_presidential'?'#1e3a5f':'#059669'}}>{e.type==='us_presidential'?'أمريكية':'محلية'}</span></td>
                  <td>{(e._count?.votes||e.totalVotes||0).toLocaleString('ar')}</td>
                  <td><span className={`status-badge ${e.isActive?'status-approved':'status-rejected'}`}>{e.isActive?'نشطة':'منتهية'}</span></td>
                  <td style={{fontSize:'.78rem'}}>{e.endsAt?new Date(e.endsAt).toLocaleDateString('ar-SA'):'—'}</td>
                  <td>
                    <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap'}}>
                      <button className="btn btn-xs" onClick={()=>selected?.id===e.id?setSelected(null):loadSelected(e.id)}>{selected?.id===e.id?'إخفاء':'عرض'}</button>
                      {e.isActive ? <button className="btn btn-xs btn-danger" onClick={()=>manageElection(e.id,'deactivate')}>إنهاء</button> : <button className="btn btn-xs btn-success" onClick={()=>manageElection(e.id,'activate')}>تفعيل</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected election details */}
      {selected && (
        <div className="admin-card">
          <div className="admin-card-title">{selected.title} — النتائج التفصيلية</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'1rem',marginBottom:'1.5rem'}}>
            {(selected.candidates as any[]).map((c:any)=>{
              const votes = selected.candidateTotals?.[c.id]||0;
              const total = selected.totalVotes||1;
              const pct   = Math.round(votes/total*100);
              return (
                <div key={c.id} style={{border:`2px solid ${c.color}`,padding:'1rem'}}>
                  <div style={{fontFamily:'var(--font-heading)',fontWeight:700,fontSize:'1rem',marginBottom:'.25rem'}}>{c.name}</div>
                  <div style={{fontSize:'.78rem',color:'var(--gray-500)',marginBottom:'.75rem'}}>{c.party}</div>
                  <div style={{fontFamily:'Georgia,serif',fontSize:'1.8rem',fontWeight:700,color:c.color}}>{votes.toLocaleString('ar')}</div>
                  <div style={{fontSize:'.8rem',color:'var(--gray-400)'}}>{pct}% من الأصوات</div>
                  <div style={{height:6,background:'var(--gray-200)',marginTop:'.5rem'}}><div style={{height:'100%',background:c.color,width:`${pct}%`,transition:'width .5s'}} /></div>
                </div>
              );
            })}
          </div>
          {selected.type==='us_presidential' && (
            <div>
              <h3 style={{fontFamily:'var(--font-heading)',marginBottom:'1rem'}}>الولايات الأمريكية</h3>
              <div style={{overflowX:'auto'}}>
                <table className="admin-table" style={{minWidth:500}}>
                  <thead><tr><th>الولاية</th><th>الأصوات الانتخابية</th>{(selected.candidates||[]).map((c:any)=><th key={c.id} style={{color:'#fff',background:c.color}}>{c.name}</th>)}</tr></thead>
                  <tbody>
                    {US_STATES.map(st=>{
                      const stV = selected.stateResults?.[st.code]||{};
                      return (
                        <tr key={st.code}>
                          <td>{st.name} ({st.code})</td>
                          <td>{st.ev}</td>
                          {(selected.candidates||[]).map((c:any)=><td key={c.id}>{(stV[c.id]||0).toLocaleString('ar')}</td>)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {selected.isActive && (
            <div style={{marginTop:'1rem',display:'flex',gap:'.5rem'}}>
              <button className="btn btn-sm btn-danger" onClick={()=>{const winner=prompt('اكتب ID المرشح الفائز:');if(winner)manageElection(selected.id,'declare_winner',{winner});}}>إعلان الفائز</button>
            </div>
          )}
        </div>
      )}
    </div>
  </>);
}
