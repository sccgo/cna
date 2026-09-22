'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

declare global { interface Window { Quill: any; } }

export default function ImportPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [depts, setDepts] = useState<any[]>([]);
  const [selImg, setSelImg] = useState<string|null>(null);
  const [form, setForm]   = useState({ title:'', titleEn:'', shortDesc:'', author:'', category:'international', departmentId:'', isBreaking:false, isFeatured:false });
  const quillRef = useRef<any>(null);
  const editorEl = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    fetch('/api/departments').then(r=>r.json()).then(setDepts);
    const stored = sessionStorage.getItem('cna_import');
    if(stored){ sessionStorage.removeItem('cna_import'); try{ fillFromData(JSON.parse(stored)); }catch(_e) {} }
    loadQuill();
  },[]);

  function loadQuill(){
    if(!window.Quill){
      const link=document.createElement('link');link.rel='stylesheet';link.href='/vendor/quill.snow.css';document.head.appendChild(link);
      const s=document.createElement('script');s.src='/vendor/quill.min.js';s.onload=()=>initQ();document.head.appendChild(s);
    } else { initQ(); }
  }

  function initQ(){
    setTimeout(()=>{
      if(editorEl.current&&!quillRef.current){
        quillRef.current=new window.Quill(editorEl.current,{theme:'snow',modules:{toolbar:[[{header:[1,2,3,false]}],['bold','italic','underline'],[{color:[]},{background:[]}],['link','image'],['clean']]},placeholder:'محتوى الخبر...'});
      }
    },200);
  }

  async function doImport(){
    if(!url.trim()){setError('الرابط مطلوب');return;}
    setLoading(true);setError('');
    try{
      const res=await fetch('/api/scrape?url='+encodeURIComponent(url));
      const d=await res.json();
      if(!res.ok){setError(d.error||'فشل الاستيراد');setLoading(false);return;}
      fillFromData(d);
    }catch(e:any){setError('حدث خطأ: '+e.message);}
    setLoading(false);
  }

  function fillFromData(d: any){
    setData(d);
    setForm(p=>({...p,title:d.title||'',titleEn:d.title||'',shortDesc:d.description||'',author:[d.author,d.siteName].filter(Boolean).join(' — ')}));
    setSelImg(d.image||null);
    setTimeout(()=>{
      if(quillRef.current){
        let content=d.content||`<p>${d.description||''}</p>`;
        content+=`\n<p style="font-size:.85rem;color:#a3a3a3;border-top:1px solid #e5e5e5;padding-top:.75rem;margin-top:2rem">المصدر: <a href="${d.sourceUrl}" target="_blank">${d.siteName||d.sourceUrl}</a>${d.author?' · '+d.author:''}${d.publishDate?' · '+new Date(d.publishDate).toLocaleDateString('ar-SA'):''}</p>`;
        quillRef.current.root.innerHTML=content;
      }
    },400);
  }

  async function publish(){
    if(!form.title.trim()){setError('العنوان مطلوب');return;}
    setSaving(true);setError('');
    const fd=new FormData();
    fd.append('title',form.title);
    fd.append('title_en',form.titleEn);
    fd.append('short_description',form.shortDesc);
    fd.append('content',quillRef.current?.root.innerHTML||'');
    fd.append('lang','both');
    fd.append('category',form.category);
    fd.append('department_id',form.departmentId);
    fd.append('is_breaking',form.isBreaking?'1':'0');
    fd.append('is_featured',form.isFeatured?'1':'0');
    fd.append('source',data?.siteName||'');
    fd.append('source_url',data?.sourceUrl||'');
    if(selImg) fd.append('main_image_url',selImg);
    const res=await fetch('/api/news',{method:'POST',body:fd});
    const d=await res.json();
    if(res.ok){setMsg('تم نشر الخبر!');setTimeout(()=>router.push('/news/'+d.id),1500);}
    else setError(d.error||'خطأ في النشر');
    setSaving(false);
  }

  return (<>
    <div className="admin-topbar">
      <h1 className="admin-page-title">استيراد خبر خارجي</h1>
      {data && <button className="btn btn-primary btn-sm" onClick={publish} disabled={saving}>{saving?'جاري النشر...':'نشر الخبر'}</button>}
    </div>
    <div className="admin-content">
      {error && <div className="alert alert-error">{error}</div>}
      {msg   && <div className="alert alert-success">{msg}</div>}

      <div className="admin-card">
        <div className="admin-card-title">رابط الخبر المراد استيراده</div>
        <div style={{display:'flex',gap:'.75rem'}}>
          <input className="form-control ltr" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." dir="ltr" onKeyDown={e=>e.key==='Enter'&&doImport()} />
          <button className="btn btn-primary" onClick={doImport} disabled={loading} style={{flexShrink:0}}>
            {loading?<><span className="spinner" style={{width:16,height:16,borderWidth:2}}/>استيراد...</>:'استيراد'}
          </button>
        </div>
        {data && (
          <div style={{marginTop:'1rem',padding:'1rem',background:'var(--gray-100)',border:'1px solid var(--border)',fontSize:'.82rem',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem'}}>
            <span>المصدر: <strong>{data.siteName}</strong>{data.author?` · الكاتب: ${data.author}`:''}{data.publishDate?` · ${new Date(data.publishDate).toLocaleDateString('ar-SA')}`:''}</span>
            <a href={data.sourceUrl} target="_blank" className="btn btn-xs btn-ghost">عرض الأصلي ↗</a>
          </div>
        )}
      </div>

      {data && (<>
        <div className="admin-card">
          <div className="admin-card-title">تفاصيل الخبر</div>
          <div className="form-group"><label className="form-label">العنوان *</label><input className="form-control" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">العنوان الإنجليزي</label><input className="form-control ltr" value={form.titleEn} onChange={e=>setForm(p=>({...p,titleEn:e.target.value}))} dir="ltr" /></div>
          <div className="form-group"><label className="form-label">الوصف المختصر</label><textarea className="form-control" value={form.shortDesc} onChange={e=>setForm(p=>({...p,shortDesc:e.target.value}))} rows={3} /></div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">الشعبة</label>
              <select className="form-control" value={form.departmentId} onChange={e=>setForm(p=>({...p,departmentId:e.target.value}))}>
                <option value="">-- اختر --</option>
                {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">التصنيف</label>
              <select className="form-control" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                <option value="general">عام</option><option value="international">دولي</option>
                <option value="politics">سياسة</option><option value="economy">اقتصاد</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:'2rem'}}>
            <label className="form-check"><input type="checkbox" checked={form.isBreaking} onChange={e=>setForm(p=>({...p,isBreaking:e.target.checked}))} /><span>عاجل</span></label>
            <label className="form-check"><input type="checkbox" checked={form.isFeatured} onChange={e=>setForm(p=>({...p,isFeatured:e.target.checked}))} /><span>مميز</span></label>
          </div>
        </div>

        {(data.images||[]).length>0 && (
          <div className="admin-card">
            <div className="admin-card-title">اختيار الصورة الرئيسية</div>
            <div className="img-picker-grid">
              {(data.images as string[]).filter(Boolean).slice(0,12).map((img,i)=>(
                <div key={i} className={`img-picker-item ${selImg===img?'selected':''}`} onClick={()=>setSelImg(img)}>
                  <img src={img} alt="" loading="lazy" onError={(e:any)=>e.currentTarget.parentElement.style.display='none'} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="admin-card">
          <div className="admin-card-title">المحتوى الكامل (قابل للتعديل)</div>
          <div ref={editorEl} />
        </div>

        <div style={{display:'flex',gap:'.75rem',justifyContent:'flex-end'}}>
          <button className="btn btn-primary" onClick={publish} disabled={saving} style={{padding:'.8rem 2.5rem'}}>{saving?'جاري النشر...':'نشر الخبر على الموقع'}</button>
          <button className="btn btn-ghost" onClick={()=>router.back()}>إلغاء</button>
        </div>
      </>)}
    </div>
  </>);
}
