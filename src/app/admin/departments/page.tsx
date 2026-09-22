'use client';
import { useEffect, useState } from 'react';

export default function DepartmentsAdmin() {
  const [depts, setDepts] = useState<any[]>([]);
  const [form, setForm] = useState({ name:'', nameEn:'', slug:'', color:'#0a0a0a', icon:'' });
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);
  async function load() { const d=await fetch('/api/departments').then(r=>r.json()).catch(()=>[]); setDepts(Array.isArray(d)?d:[]); }

  async function add() {
    if(!form.name||!form.slug){setMsg('الاسم والمعرف مطلوبان');return;}
    const res=await fetch('/api/departments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    const d=await res.json();
    if(res.ok){setMsg('تم الإضافة');setForm({name:'',nameEn:'',slug:'',color:'#0a0a0a',icon:''});load();}
    else setMsg(d.error||'خطأ');
  }

  async function del(id:string,name:string){ if(!confirm(`حذف "${name}"؟`))return; const res=await fetch('/api/departments?id='+id,{method:'DELETE'}); const d=await res.json(); if(res.ok)load(); else setMsg(d.error||'خطأ'); }
  async function toggle(id:string,isActive:boolean){ await fetch('/api/departments',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,isActive:!isActive})}); load(); }

  return (<>
    <div className="admin-topbar"><h1 className="admin-page-title">الشعب</h1></div>
    <div className="admin-content">
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="admin-card">
        <div className="admin-card-title">إضافة شعبة جديدة</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">الاسم العربي *</label><input className="form-control" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">الاسم الإنجليزي</label><input className="form-control ltr" value={form.nameEn} onChange={e=>setForm(p=>({...p,nameEn:e.target.value}))} dir="ltr" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">المعرف (slug) *</label><input className="form-control ltr" value={form.slug} onChange={e=>setForm(p=>({...p,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-')}))} placeholder="local-affairs" dir="ltr" /></div>
          <div className="form-group"><label className="form-label">اللون</label><input type="color" className="form-control" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))} style={{height:45}} /></div>
        </div>
        <button className="btn btn-primary" onClick={add}>إضافة</button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>الاسم</th><th>المعرف</th><th>الأخبار</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>
            {depts.map(d=>(
              <tr key={d.id}>
                <td><span style={{display:'flex',alignItems:'center',gap:'.5rem'}}><span style={{width:12,height:12,borderRadius:'50%',background:d.color,flexShrink:0}} />{d.name}</span></td>
                <td style={{fontFamily:'monospace',fontSize:'.82rem',direction:'ltr',textAlign:'left'}}>{d.slug}</td>
                <td>{d._count?.news||0}</td>
                <td><span className={`status-badge ${d.isActive?'status-approved':'status-rejected'}`}>{d.isActive?'نشطة':'مخفية'}</span></td>
                <td><div style={{display:'flex',gap:'.3rem'}}>
                  <button className={`btn btn-xs ${d.isActive?'btn-danger':'btn-success'}`} onClick={()=>toggle(d.id,d.isActive)}>{d.isActive?'إخفاء':'تفعيل'}</button>
                  <button className="btn btn-xs btn-danger" onClick={()=>del(d.id,d.name)}>حذف</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>);
}
