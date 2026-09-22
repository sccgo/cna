'use client';
import { useEffect, useState } from 'react';

const ROLES = ['VIEWER','EDITOR','REVIEWER','DEVELOPER','EDITOR_IN_CHIEF','ADMISSIONS','DIRECTOR'];
const ROLE_AR: Record<string,string> = { VIEWER:'زائر',EDITOR:'محرر',REVIEWER:'مراجع',DEVELOPER:'مبرمج',EDITOR_IN_CHIEF:'رئيس التحرير',ADMISSIONS:'عمادة القبول',DIRECTOR:'رئيس الوكالة' };
const ROLE_COLORS: Record<string,string> = { VIEWER:'#737373',EDITOR:'#2563eb',REVIEWER:'#059669',DEVELOPER:'#7c3aed',EDITOR_IN_CHIEF:'#dc2626',ADMISSIONS:'#b45309',DIRECTOR:'#0a0a0a' };
const STATUS_AR: Record<string,string> = { PENDING:'معلق',VERIFIED:'بانتظار القبول',APPROVED:'مقبول',REJECTED:'مرفوض',SUSPENDED:'موقوف' };

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page,  setPage]  = useState(1);
  const [tab,   setTab]   = useState('VERIFIED'); // VERIFIED = pending approval
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [toast, setToast] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string|null>(null);
  const [changeRoleTarget, setChangeRoleTarget] = useState<{id:string;name:string}|null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(()=>{ fetch('/api/auth/me').then(r=>r.json()).then(d=>setMe(d.user)); },[]);
  useEffect(()=>{ loadUsers(); },[tab,page,search]);

  async function loadUsers() {
    setLoading(true);
    const sp = new URLSearchParams({ page:String(page), limit:'20', status:tab });
    if(search) sp.set('search',search);
    const d = await fetch('/api/users?'+sp).then(r=>r.json()).catch(()=>({}));
    setUsers(d.users||[]); setTotal(d.total||0); setLoading(false);
  }

  async function action(userId: string, act: string, extra?: Record<string,any>) {
    const res = await fetch('/api/users',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, action: act, ...extra }) });
    const d = await res.json();
    if(res.ok) { showToast('تم بنجاح'); loadUsers(); }
    else showToast(d.error||'حدث خطأ', true);
  }

  function showToast(msg: string, err=false) {
    setToast(msg);
    setTimeout(()=>setToast(''),3000);
  }

  const pages = Math.ceil(total/20);
  const isDirector = me?.role==='DIRECTOR';
  const isChief    = me?.role==='EDITOR_IN_CHIEF'||isDirector;
  const isAdmissions = me?.role==='ADMISSIONS'||isChief;

  const TABS = [
    { key:'VERIFIED',  label:'بانتظار القبول' },
    { key:'APPROVED',  label:'مقبولون' },
    { key:'REJECTED',  label:'مرفوضون' },
    { key:'SUSPENDED', label:'موقوفون' },
    { key:'PENDING',   label:'لم يتحققوا' },
  ];

  return (<>
    <div className="admin-topbar">
      <h1 className="admin-page-title">إدارة المستخدمين</h1>
      <span style={{fontSize:'.85rem',color:'var(--gray-400)'}}>{total.toLocaleString('ar')} مستخدم</span>
    </div>
    <div className="admin-content">
      {/* Tabs */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--black)', marginBottom:'1.5rem', overflowX:'auto' }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>{setTab(t.key);setPage(1);}}
            style={{ padding:'.6rem 1.2rem', border:'none', background:tab===t.key?'var(--black)':'transparent', color:tab===t.key?'#fff':'var(--gray-500)', cursor:'pointer', fontFamily:'var(--font-body)', fontSize:'.875rem', fontWeight:600, whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'1.25rem' }}>
        <input className="form-control" style={{ maxWidth:320 }} placeholder="ابحث بالاسم أو البريد..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
      </div>

      {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th><th>اسم المستخدم</th><th>البريد</th>
                <th>الدور</th><th>الحالة</th><th>التسجيل</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:'2rem',color:'var(--gray-400)'}}>لا توجد نتائج</td></tr>}
              {users.map(u=>(
                <tr key={u.id}>
                  <td style={{fontWeight:600}}>{u.fullName}</td>
                  <td style={{fontSize:'.82rem',color:'var(--gray-500)',direction:'ltr',textAlign:'left'}}>{u.username}</td>
                  <td style={{fontSize:'.78rem',color:'var(--gray-500)',direction:'ltr',textAlign:'left'}}>{u.email}</td>
                  <td>
                    <span style={{ display:'inline-block',padding:'.15rem .55rem',fontSize:'.72rem',fontWeight:700,background:ROLE_COLORS[u.role]||'#000',color:'#fff' }}>
                      {ROLE_AR[u.role]||u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${u.status.toLowerCase()}`}>{STATUS_AR[u.status]||u.status}</span>
                  </td>
                  <td style={{fontSize:'.75rem',color:'var(--gray-400)'}}>{new Date(u.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td>
                    <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap'}}>
                      {isAdmissions && u.status==='VERIFIED' && (<>
                        <button className="btn btn-xs btn-success" onClick={()=>action(u.id,'approve')}>قبول</button>
                        <button className="btn btn-xs btn-danger" onClick={()=>{setRejectTarget(u.id);setRejectNote('');}}>رفض</button>
                      </>)}
                      {isChief && u.status==='APPROVED' && u.id!==me?.id && (
                        <button className="btn btn-xs btn-danger" onClick={()=>action(u.id,'suspend')}>إيقاف</button>
                      )}
                      {isChief && u.status==='SUSPENDED' && (
                        <button className="btn btn-xs btn-success" onClick={()=>action(u.id,'reactivate')}>تفعيل</button>
                      )}
                      {isDirector && u.id!==me?.id && u.role!=='DIRECTOR' && (
                        <button className="btn btn-xs" onClick={()=>{setChangeRoleTarget({id:u.id,name:u.fullName});setNewRole(u.role);}}>تغيير الدور</button>
                      )}
                      {isDirector && u.id!==me?.id && u.role!=='DIRECTOR' && (
                        <button className="btn btn-xs btn-danger" onClick={()=>{if(confirm('حذف المستخدم نهائياً؟'))action(u.id,'delete');}}>حذف</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages>1 && (
        <div className="pagination">
          {Array.from({length:pages},(_,i)=>(
            <button key={i} className={`page-btn ${page===i+1?'active':''}`} onClick={()=>setPage(i+1)}>{i+1}</button>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',padding:'2rem',width:400,border:'2px solid var(--black)'}}>
            <h3 style={{fontFamily:'var(--font-heading)',marginBottom:'1rem'}}>سبب الرفض (اختياري)</h3>
            <textarea className="form-control" value={rejectNote} onChange={e=>setRejectNote(e.target.value)} rows={3} placeholder="يمكن إرسال سبب الرفض للمستخدم..." />
            <div style={{display:'flex',gap:'.5rem',marginTop:'1rem',justifyContent:'flex-end'}}>
              <button className="btn btn-danger" onClick={()=>{action(rejectTarget,'reject',{note:rejectNote});setRejectTarget(null);}}>رفض</button>
              <button className="btn btn-ghost" onClick={()=>setRejectTarget(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Change role modal */}
      {changeRoleTarget && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',padding:'2rem',width:380,border:'2px solid var(--black)'}}>
            <h3 style={{fontFamily:'var(--font-heading)',marginBottom:'1rem'}}>تغيير دور: {changeRoleTarget.name}</h3>
            <select className="form-control" value={newRole} onChange={e=>setNewRole(e.target.value)}>
              {ROLES.filter(r=>r!=='DIRECTOR').map(r=><option key={r} value={r}>{ROLE_AR[r]}</option>)}
            </select>
            <div style={{display:'flex',gap:'.5rem',marginTop:'1rem',justifyContent:'flex-end'}}>
              <button className="btn btn-primary" onClick={()=>{action(changeRoleTarget.id,'change_role',{role:newRole});setChangeRoleTarget(null);}}>حفظ</button>
              <button className="btn btn-ghost" onClick={()=>setChangeRoleTarget(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-container"><div className="toast">{toast}</div></div>}
    </div>
  </>);
}
