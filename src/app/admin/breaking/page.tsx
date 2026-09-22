'use client';
import { useEffect, useState } from 'react';

export default function BreakingAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ text:'', textEn:'', style:'ticker', bgColor:'#cc0000', textColor:'#ffffff', linkUrl:'', expiresAt:'' });
  const [msg, setMsg] = useState('');

  useEffect(()=>{ load(); },[]);
  async function load(){ const d=await fetch('/api/breaking').then(r=>r.json()).catch(()=>[]); setItems(Array.isArray(d)?d:[]); }

  async function add(){
    if(!form.text.trim()){setMsg('النص مطلوب');return;}
    const res=await fetch('/api/breaking',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    if(res.ok){setMsg('تم الإضافة');setForm({text:'',textEn:'',style:'ticker',bgColor:'#cc0000',textColor:'#ffffff',linkUrl:'',expiresAt:''});load();}
    else{const d=await res.json();setMsg(d.error||'خطأ');}
  }

  async function toggle(id:string, isActive:boolean){ await fetch('/api/breaking',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,isActive:!isActive})}); load(); }
  async function remove(id:string){ if(!confirm('حذف؟'))return; await fetch('/api/breaking?id='+id,{method:'DELETE'}); load(); }

  return (<>
    <div className="admin-topbar"><h1 className="admin-page-title">الأخبار العاجلة</h1></div>
    <div className="admin-content">
      {msg&&<div className="alert alert-success">{msg}</div>}
      <div className="admin-card">
        <div className="admin-card-title">إضافة خبر عاجل جديد</div>
        <div className="form-group"><label className="form-label">نص الخبر العاجل *</label><input className="form-control" value={form.text} onChange={e=>setForm(p=>({...p,text:e.target.value}))} placeholder="نص الخبر العاجل..." /></div>
        <div className="form-group"><label className="form-label">النص الإنجليزي (اختياري)</label><input className="form-control ltr" value={form.textEn} onChange={e=>setForm(p=>({...p,textEn:e.target.value}))} dir="ltr" /></div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">طريقة العرض</label>
            <select className="form-control" value={form.style} onChange={e=>setForm(p=>({...p,style:e.target.value}))}>
              <option value="ticker">شريط متحرك في الأعلى</option>
              <option value="popup">نافذة منبثقة</option>
              <option value="bar">شريط ثابت</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">رابط (اختياري)</label><input className="form-control ltr" value={form.linkUrl} onChange={e=>setForm(p=>({...p,linkUrl:e.target.value}))} placeholder="https://..." dir="ltr" /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">لون الخلفية</label><input type="color" className="form-control" value={form.bgColor} onChange={e=>setForm(p=>({...p,bgColor:e.target.value}))} style={{height:45}} /></div>
          <div className="form-group"><label className="form-label">لون النص</label><input type="color" className="form-control" value={form.textColor} onChange={e=>setForm(p=>({...p,textColor:e.target.value}))} style={{height:45}} /></div>
          <div className="form-group"><label className="form-label">ينتهي في (اختياري)</label><input type="datetime-local" className="form-control" value={form.expiresAt} onChange={e=>setForm(p=>({...p,expiresAt:e.target.value}))} /></div>
        </div>
        {/* Preview */}
        <div style={{marginBottom:'1rem',padding:'.6rem 1rem',background:form.bgColor,color:form.textColor,fontWeight:700,fontSize:'.9rem'}}>
          معاينة: {form.text||'نص الخبر العاجل'}
        </div>
        <button className="btn btn-primary" onClick={add}>إضافة</button>
      </div>

      <div className="admin-card">
        <div className="admin-card-title">الأخبار العاجلة النشطة</div>
        {items.length===0 ? <p style={{color:'var(--gray-400)',fontSize:'.9rem'}}>لا توجد أخبار عاجلة حالياً</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>النص</th><th>النوع</th><th>الحالة</th><th>ينتهي</th><th>إجراءات</th></tr></thead>
              <tbody>
                {items.map(item=>(
                  <tr key={item.id}>
                    <td>
                      <div style={{padding:'.2rem .5rem',background:item.bgColor,color:item.textColor,fontSize:'.8rem',display:'inline-block',maxWidth:300,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                        {item.text}
                      </div>
                    </td>
                    <td style={{fontSize:'.82rem'}}>{item.style==='ticker'?'شريط':item.style==='popup'?'منبثقة':'ثابت'}</td>
                    <td><span className={`status-badge ${item.isActive?'status-approved':'status-rejected'}`}>{item.isActive?'نشط':'معطل'}</span></td>
                    <td style={{fontSize:'.75rem'}}>{item.expiresAt?new Date(item.expiresAt).toLocaleDateString('ar-SA'):'—'}</td>
                    <td><div style={{display:'flex',gap:'.3rem'}}>
                      <button className={`btn btn-xs ${item.isActive?'btn-danger':'btn-success'}`} onClick={()=>toggle(item.id,item.isActive)}>{item.isActive?'تعطيل':'تفعيل'}</button>
                      <button className="btn btn-xs btn-danger" onClick={()=>remove(item.id)}>حذف</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </>);
}
