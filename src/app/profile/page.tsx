'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
const ROLE_AR: Record<string,string> = { VIEWER:'زائر',EDITOR:'محرر',REVIEWER:'مراجع',DEVELOPER:'مبرمج',EDITOR_IN_CHIEF:'رئيس التحرير',ADMISSIONS:'عمادة القبول',DIRECTOR:'رئيس الوكالة' };
export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ fullName:'', currentPassword:'', newPassword:'' });
  const [msg, setMsg]   = useState('');
  const [err, setErr]   = useState('');
  const router = useRouter();
  useEffect(()=>{ fetch('/api/auth/me').then(r=>r.json()).then(d=>{ if(!d.user){router.push('/login');return;} setUser(d.user); setForm(p=>({...p,fullName:d.user.fullName})); }); },[]);
  async function save() {
    setMsg(''); setErr('');
    const res = await fetch('/api/profile',{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ fullName: form.fullName, currentPassword: form.currentPassword||undefined, newPassword: form.newPassword||undefined }) });
    const d = await res.json();
    if(res.ok) { setMsg('تم الحفظ'); setForm(p=>({...p,currentPassword:'',newPassword:''})); }
    else setErr(d.error||'خطأ');
  }
  if (!user) return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><div className="spinner" style={{width:36,height:36,borderWidth:3}}/></div>;
  return (
    <div className="auth-page" style={{alignItems:'flex-start',paddingTop:'3rem'}}>
      <div className="auth-box" style={{maxWidth:480}}>
        <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
          <div style={{fontFamily:'Georgia,serif',fontSize:'2.5rem',fontWeight:900,letterSpacing:'.2em'}}>CNA</div>
          <div style={{fontSize:'.85rem',color:'var(--gray-500)',marginTop:'.25rem'}}>ملفي الشخصي</div>
        </div>
        <div style={{background:'var(--gray-100)',padding:'1rem',marginBottom:'1.5rem',fontSize:'.85rem'}}>
          <div><strong>اسم المستخدم:</strong> {user.username}</div>
          <div><strong>البريد:</strong> {user.email}</div>
          <div><strong>الدور:</strong> {ROLE_AR[user.role]||user.role}</div>
        </div>
        {err && <div className="alert alert-error">{err}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}
        <div className="form-group"><label className="form-label">الاسم الظاهر</label><input className="form-control" value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} /></div>
        <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'1.25rem 0'}} />
        <div style={{fontSize:'.82rem',color:'var(--gray-500)',marginBottom:'.75rem'}}>تغيير كلمة المرور (اتركها فارغة إذا لا تريد التغيير)</div>
        <div className="form-group"><label className="form-label">كلمة المرور الحالية</label><input type="password" className="form-control" value={form.currentPassword} onChange={e=>setForm(p=>({...p,currentPassword:e.target.value}))} /></div>
        <div className="form-group"><label className="form-label">كلمة المرور الجديدة</label><input type="password" className="form-control" value={form.newPassword} onChange={e=>setForm(p=>({...p,newPassword:e.target.value}))} /></div>
        <button className="btn btn-primary" style={{width:'100%',padding:'.8rem'}} onClick={save}>حفظ التغييرات</button>
        <div style={{display:'flex',gap:'1rem',justifyContent:'center',marginTop:'1rem',fontSize:'.85rem'}}>
          <Link href="/">الرئيسية</Link>
          {user.role!=='VIEWER' && <Link href="/admin">لوحة التحكم</Link>}
          <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--gray-500)',fontSize:'.85rem'}} onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});router.push('/login');}}>تسجيل الخروج</button>
        </div>
      </div>
    </div>
  );
}
