'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

declare global { interface Window { Quill: any; } }

function HeroBgPicker({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const v = value || { bgType: 'white', bgValue: '', bgImage: '' };
  const PRESETS = [
    { label:'أبيض', type:'color',    val:'#ffffff' },
    { label:'أسود', type:'color',    val:'#0a0a0a' },
    { label:'ليلي', type:'gradient', val:'linear-gradient(135deg,#1a1a2e,#16213e)' },
    { label:'بحري', type:'gradient', val:'linear-gradient(135deg,#2c3e50,#4ca1af)' },
    { label:'كون',  type:'gradient', val:'linear-gradient(135deg,#0a0a0a,#1a1a2e,#0f3460)' },
    { label:'ذهبي', type:'gradient', val:'linear-gradient(135deg,#b8860b,#8b6914)' },
  ];
  return (
    <div>
      <div className="form-row" style={{ marginBottom:'.75rem' }}>
        <div className="form-group" style={{ margin:0 }}>
          <label className="form-label">نوع الخلفية</label>
          <select className="form-control" value={v.bgType} onChange={e=>onChange({...v,bgType:e.target.value})}>
            <option value="white">أبيض (افتراضي)</option>
            <option value="color">لون محدد</option>
            <option value="gradient">تدرج لوني</option>
            <option value="image">صورة من الجهاز</option>
          </select>
        </div>
        <div className="form-group" style={{ margin:0 }}>
          <label className="form-label">معاينة</label>
          <div style={{ height:45, background: v.bgType==='gradient'?v.bgValue : v.bgType==='color'?v.bgValue : '#fff', border:'1px solid var(--border)' }} />
        </div>
      </div>
      {v.bgType === 'color' && (
        <input type="color" className="form-control" value={v.bgValue||'#0a0a0a'} onChange={e=>onChange({...v,bgValue:e.target.value})} style={{ height:45 }} />
      )}
      {v.bgType === 'gradient' && (<>
        <input type="text" className="form-control ltr" placeholder="linear-gradient(135deg, #000, #333)" value={v.bgValue||''} onChange={e=>onChange({...v,bgValue:e.target.value})} style={{ marginBottom:'.5rem' }} />
        <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap' }}>
          {PRESETS.filter(p=>p.type==='gradient').map(p=>(
            <button key={p.label} type="button" className="preset-chip" onClick={()=>onChange({...v,bgType:p.type,bgValue:p.val})}>{p.label}</button>
          ))}
        </div>
      </>)}
      {v.bgType === 'image' && (
        <input type="file" className="form-control" accept="image/*" onChange={async e=>{
          const f=e.target.files?.[0]; if(!f) return;
          const fd=new FormData(); fd.append('file',f); fd.append('type','bg');
          const res=await fetch('/api/upload',{method:'POST',body:fd}); const d=await res.json();
          if(d.url) onChange({...v,bgImage:d.url});
        }} />
      )}
      <div style={{ display:'flex', gap:'.35rem', flexWrap:'wrap', marginTop:'.5rem' }}>
        {PRESETS.filter(p=>p.type==='color').map(p=>(
          <button key={p.label} type="button" className="preset-chip" onClick={()=>onChange({...v,bgType:p.type,bgValue:p.val})}>{p.label}</button>
        ))}
      </div>
    </div>
  );
}

export default function CMSPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get('edit');
  const isCreate = sp.get('create') === '1' || !editId;

  const [form, setForm] = useState({
    title:'', titleEn:'', shortDesc:'', shortDescEn:'', lang:'ar',
    isBreaking:false, breakingStyle:'ticker', isFeatured:false, isLive:false, liveUrl:'',
    category:'general', departmentId:'', tags:'',
    source:'', sourceUrl:'', heroStyle:{ bgType:'white', bgValue:'', bgImage:'' },
    hasPoll:false, pollQuestion:'', pollOptions:['',''], pollExpires:'',
    hasCounter:false, counterDirection:'up', counterStartDate:'', counterLabel:'منذ',
    counterBgColor:'#000000', counterTextColor:'#ffffff', counterBgGradient:'',
    counterTextFont:'Cairo', counterNumFont:'Georgia',
  });
  const [departments, setDepts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');
  const [success, setSuccess]   = useState('');
  const [mainImg, setMainImg]   = useState<File|null>(null);
  const [mainImgUrl, setMainImgUrl] = useState('');
  const [galleryFiles, setGallery]  = useState<File[]>([]);
  const [user, setUser] = useState<any>(null);
  const quillArRef = useRef<any>(null);
  const quillEnRef = useRef<any>(null);
  const editorArEl = useRef<HTMLDivElement>(null);
  const editorEnEl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r=>r.json()).then(d=>setUser(d.user));
    fetch('/api/departments').then(r=>r.json()).then(d=>setDepts(d));
    const now = new Date(); now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
    setForm(p=>({...p, counterStartDate: now.toISOString().slice(0,16)}));

    // Load Quill from /vendor/
    if (!window.Quill) {
      const link = document.createElement('link'); link.rel='stylesheet'; link.href='/vendor/quill.snow.css'; document.head.appendChild(link);
      const script = document.createElement('script'); script.src='/vendor/quill.min.js';
      script.onload = () => { initEditors(); };
      document.head.appendChild(script);
    } else { initEditors(); }

    if (editId) loadEdit(editId);
  }, [editId]);

  function initEditors() {
    setTimeout(() => {
      if (editorArEl.current && !quillArRef.current) {
        quillArRef.current = new window.Quill(editorArEl.current, {
          theme:'snow', placeholder:'اكتب محتوى الخبر بالعربية...',
          modules:{ toolbar:[[{header:[1,2,3,false]}],['bold','italic','underline','strike'],[{color:[]},{background:[]}],[{size:['small',false,'large','huge']}],[{font:[]}],[{align:[]}],[{direction:'rtl'}],[{list:'ordered'},{list:'bullet'}],['blockquote','code-block'],['link','image','video'],['clean']] }
        });
        quillArRef.current.root.setAttribute('dir','rtl');
        quillArRef.current.root.style.fontFamily = 'var(--font-body)';
        quillArRef.current.root.style.minHeight = '350px';
        // Upload handler
        setupImageUpload(quillArRef.current);
      }
    }, 100);
  }

  function setupImageUpload(quill: any) {
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', () => {
      const input = document.createElement('input'); input.type='file'; input.accept='image/*,audio/*,video/*';
      input.onchange = async () => {
        const f = input.files?.[0]; if(!f) return;
        const fd=new FormData(); fd.append('file',f); fd.append('type',f.type.startsWith('image/')?'image':f.type.startsWith('audio/')?'media':'media');
        const range = quill.getSelection(true);
        quill.insertText(range.index, '⌛ جاري الرفع...', {color:'#a3a3a3'});
        const res=await fetch('/api/upload',{method:'POST',body:fd}); const d=await res.json();
        quill.deleteText(range.index, '⌛ جاري الرفع...'.length);
        if(d.url) {
          if(d.kind==='audio') quill.insertEmbed(range.index,'audio',d.url);
          else if(d.kind==='video') quill.insertEmbed(range.index,'video',d.url);
          else quill.insertEmbed(range.index,'image',d.url);
        }
      };
      input.click();
    });
  }

  async function loadEdit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/news/${id}`);
    const n = await res.json();
    setForm({
      title: n.title||'', titleEn: n.titleEn||'', shortDesc: n.shortDesc||'', shortDescEn: n.shortDescEn||'',
      lang: n.lang||'ar', isBreaking:!!n.isBreaking, breakingStyle:n.breakingStyle||'ticker',
      isFeatured:!!n.isFeatured, isLive:!!n.isLive, liveUrl:n.liveUrl||'',
      category:n.category||'general', departmentId:n.departmentId||'', tags:(n.tags||[]).join(', '),
      source:n.source||'', sourceUrl:n.sourceUrl||'', heroStyle:n.heroStyle||{bgType:'white',bgValue:''},
      hasPoll:!!n.poll, pollQuestion:n.poll?.question||'',
      pollOptions:n.poll?.options?.length>=2?n.poll.options:['',''],
      pollExpires:n.poll?.expiresAt||'',
      hasCounter:!!n.counter, counterDirection:n.counter?.direction||'up',
      counterStartDate:n.counter?.startDate?new Date(n.counter.startDate).toISOString().slice(0,16):'',
      counterLabel:n.counter?.label||'منذ', counterBgColor:n.counter?.bgColor||'#000000',
      counterTextColor:n.counter?.textColor||'#ffffff', counterBgGradient:n.counter?.bgGradient||'',
      counterTextFont:n.counter?.textFont||'Cairo', counterNumFont:n.counter?.numFont||'Georgia',
    });
    if(n.mainImage) setMainImgUrl(n.mainImage);
    setTimeout(() => {
      if(quillArRef.current) quillArRef.current.root.innerHTML = n.content||'';
      if(quillEnRef.current) quillEnRef.current.root.innerHTML = n.contentEn||'';
    }, 300);
    setLoading(false);
  }

  async function handleSave() {
    if(!form.title.trim()) { setError('العنوان مطلوب'); return; }
    setSaving(true); setError(''); setSuccess('');
    const fd = new FormData();
    fd.append('title', form.title.trim());
    fd.append('title_en', form.titleEn);
    fd.append('short_description', form.shortDesc);
    fd.append('short_description_en', form.shortDescEn);
    fd.append('content', quillArRef.current?.root.innerHTML || '');
    fd.append('content_en', quillEnRef.current?.root.innerHTML || '');
    fd.append('lang', form.lang);
    fd.append('is_breaking', form.isBreaking?'1':'0');
    fd.append('breaking_style', form.breakingStyle);
    fd.append('is_featured', form.isFeatured?'1':'0');
    fd.append('is_live', form.isLive?'1':'0');
    fd.append('live_url', form.liveUrl);
    fd.append('category', form.category);
    fd.append('department_id', form.departmentId);
    fd.append('tags', form.tags);
    fd.append('source', form.source);
    fd.append('source_url', form.sourceUrl);
    fd.append('hero_bg_type', form.heroStyle.bgType);
    fd.append('hero_bg_value', form.heroStyle.bgValue||'');
    if(mainImg) fd.append('main_image', mainImg);
    galleryFiles.forEach(f => fd.append('images', f));
    if(form.hasPoll) {
      fd.append('poll_question', form.pollQuestion);
      form.pollOptions.forEach(o => o.trim() && fd.append('poll_options', o.trim()));
      if(form.pollExpires) fd.append('poll_expires', form.pollExpires);
    }
    if(form.hasCounter) {
      fd.append('counter_enabled', '1');
      fd.append('counter_direction', form.counterDirection);
      fd.append('counter_start_date', form.counterStartDate);
      fd.append('counter_label', form.counterLabel);
      fd.append('counter_bg_color', form.counterBgColor);
      fd.append('counter_text_color', form.counterTextColor);
      fd.append('counter_bg_gradient', form.counterBgGradient);
      fd.append('counter_text_font', form.counterTextFont);
      fd.append('counter_num_font', form.counterNumFont);
    }
    const url = editId ? `/api/news/${editId}` : '/api/news';
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, { method, body: fd });
    const d = await res.json();
    if(!res.ok) { setError(d.error||'حدث خطأ'); setSaving(false); return; }
    setSuccess(editId ? 'تم حفظ التغييرات' : `تم إنشاء الخبر (${d.status==='APPROVED'?'منشور':'بانتظار المراجعة'})`);
    setSaving(false);
    if(!editId && d.id) setTimeout(()=>router.push(`/news/${d.id}`), 1500);
  }

  function initEnEditor() {
    if (editorEnEl.current && !quillEnRef.current && window.Quill) {
      quillEnRef.current = new window.Quill(editorEnEl.current, {
        theme:'snow', placeholder:'Write full content in English...',
        modules:{ toolbar:[[{header:[1,2,3,false]}],['bold','italic','underline'],[{color:[]},{background:[]}],[{size:['small',false,'large','huge']}],[{align:[]}],['link','image'],['clean']] }
      });
      quillEnRef.current.root.setAttribute('dir','ltr');
      quillEnRef.current.root.style.minHeight = '250px';
      setupImageUpload(quillEnRef.current);
    }
  }

  const setF = (k: string, v: any) => setForm(p=>({...p,[k]:v}));

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-page-title">{editId ? 'تعديل الخبر' : 'إنشاء خبر جديد'}</h1>
        <div style={{ display:'flex', gap:'.5rem' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" style={{width:16,height:16,borderWidth:2}}/>جاري الحفظ...</> : (editId ? 'حفظ التغييرات' : 'نشر الخبر')}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>router.back()}>إلغاء</button>
        </div>
      </div>
      <div className="admin-content">
        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {loading && <div className="loading-state"><div className="spinner"/>جاري التحميل...</div>}

        {!loading && (<>
          {/* Basic info */}
          <div className="admin-card">
            <div className="admin-card-title">معلومات الخبر الأساسية</div>
            <div className="form-group">
              <label className="form-label">العنوان بالعربية *</label>
              <input className="form-control" value={form.title} onChange={e=>setF('title',e.target.value)} placeholder="أدخل عنوان الخبر" />
            </div>
            <div className="form-group">
              <label className="form-label">العنوان بالإنجليزية (اختياري)</label>
              <input className="form-control ltr" value={form.titleEn} onChange={e=>setF('titleEn',e.target.value)} placeholder="English title" dir="ltr" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الوصف المختصر (عربي)</label>
                <textarea className="form-control" value={form.shortDesc} onChange={e=>setF('shortDesc',e.target.value)} rows={3} placeholder="وصف مختصر" />
              </div>
              <div className="form-group">
                <label className="form-label">الوصف المختصر (إنجليزي)</label>
                <textarea className="form-control ltr" value={form.shortDescEn} onChange={e=>setF('shortDescEn',e.target.value)} rows={3} placeholder="Short description" dir="ltr" />
              </div>
            </div>

            {/* Arabic editor */}
            <div className="form-group">
              <label className="form-label">المحتوى الكامل (عربي) — لا يوجد حد للأحرف</label>
              <div ref={editorArEl} />
            </div>

            {/* Language */}
            <div className="form-group">
              <label className="form-label">لغة الخبر</label>
              <select className="form-control" value={form.lang} onChange={e=>{setF('lang',e.target.value); if(e.target.value!=='ar') setTimeout(initEnEditor,200);}}>
                <option value="ar">عربي فقط</option>
                <option value="en">إنجليزي فقط</option>
                <option value="both">ثنائي اللغة</option>
              </select>
            </div>

            {/* English editor */}
            {(form.lang==='en'||form.lang==='both') && (
              <div className="form-group">
                <label className="form-label">المحتوى الكامل (إنجليزي)</label>
                <div ref={editorEnEl} style={{ direction:'ltr' }} />
              </div>
            )}
          </div>

          {/* Classification */}
          <div className="admin-card">
            <div className="admin-card-title">التصنيف والحالة</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الشعبة</label>
                <select className="form-control" value={form.departmentId} onChange={e=>setF('departmentId',e.target.value)}>
                  <option value="">-- اختر الشعبة --</option>
                  {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">التصنيف</label>
                <select className="form-control" value={form.category} onChange={e=>setF('category',e.target.value)}>
                  {['general','local','international','economy','security','politics','culture','sports','opinion'].map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">الوسوم (مفصولة بفاصلة)</label>
              <input className="form-control" value={form.tags} onChange={e=>setF('tags',e.target.value)} placeholder="خبر، سياسة، اقتصاد" />
            </div>
            <div style={{ display:'flex', gap:'2rem', flexWrap:'wrap' }}>
              <label className="form-check"><input type="checkbox" checked={form.isBreaking} onChange={e=>setF('isBreaking',e.target.checked)} /><span>خبر عاجل</span></label>
              <label className="form-check"><input type="checkbox" checked={form.isFeatured} onChange={e=>setF('isFeatured',e.target.checked)} /><span>خبر مميز</span></label>
              <label className="form-check"><input type="checkbox" checked={form.isLive} onChange={e=>setF('isLive',e.target.checked)} /><span>بث مباشر</span></label>
            </div>
            {form.isBreaking && (
              <div className="form-group" style={{ marginTop:'.75rem' }}>
                <label className="form-label">طريقة عرض الخبر العاجل</label>
                <select className="form-control" value={form.breakingStyle} onChange={e=>setF('breakingStyle',e.target.value)}>
                  <option value="ticker">شريط متحرك</option>
                  <option value="popup">نافذة منبثقة</option>
                  <option value="bar">شريط ثابت</option>
                </select>
              </div>
            )}
            {form.isLive && (
              <div className="form-group" style={{ marginTop:'.75rem' }}>
                <label className="form-label">رابط البث المباشر (YouTube أو أي iframe)</label>
                <input className="form-control ltr" value={form.liveUrl} onChange={e=>setF('liveUrl',e.target.value)} placeholder="https://youtube.com/watch?v=..." dir="ltr" />
              </div>
            )}
          </div>

          {/* Images */}
          <div className="admin-card">
            <div className="admin-card-title">الصور</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الصورة الرئيسية</label>
                {mainImgUrl && <img src={mainImgUrl} alt="" style={{ width:'100%', maxHeight:140, objectFit:'cover', marginBottom:'.5rem', border:'1px solid var(--border)' }} />}
                <input type="file" className="form-control" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setMainImg(f);setMainImgUrl(URL.createObjectURL(f));}}} />
              </div>
              <div className="form-group">
                <label className="form-label">صور إضافية (متعددة)</label>
                <input type="file" className="form-control" accept="image/*" multiple onChange={e=>setGallery(Array.from(e.target.files||[]))} />
                {galleryFiles.length > 0 && <div style={{fontSize:'.78rem',color:'var(--gray-500)',marginTop:'.3rem'}}>{galleryFiles.length} صورة محددة</div>}
              </div>
            </div>
          </div>

          {/* Hero style */}
          <div className="admin-card">
            <div className="admin-card-title">تصميم بطاقة الخبر المميز</div>
            <p style={{ fontSize:'.82rem', color:'var(--gray-500)', marginBottom:'1rem' }}>يطبق فقط عند تفعيل "خبر مميز"</p>
            <HeroBgPicker value={form.heroStyle} onChange={v=>setF('heroStyle',v)} />
          </div>

          {/* Source */}
          <div className="admin-card">
            <div className="admin-card-title">مصدر الخبر</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">اسم المصدر</label>
                <input className="form-control" value={form.source} onChange={e=>setF('source',e.target.value)} placeholder="وكالة رويترز" />
              </div>
              <div className="form-group">
                <label className="form-label">رابط المصدر</label>
                <input className="form-control ltr" value={form.sourceUrl} onChange={e=>setF('sourceUrl',e.target.value)} placeholder="https://..." dir="ltr" />
              </div>
            </div>
          </div>

          {/* Poll */}
          <div className="admin-card">
            <div className="admin-card-title">استطلاع الرأي (اختياري)</div>
            <label className="form-check" style={{ marginBottom:'1rem' }}>
              <input type="checkbox" checked={form.hasPoll} onChange={e=>setF('hasPoll',e.target.checked)} />
              <span>إضافة استطلاع رأي</span>
            </label>
            {form.hasPoll && (<>
              <div className="form-group">
                <label className="form-label">سؤال الاستطلاع</label>
                <input className="form-control" value={form.pollQuestion} onChange={e=>setF('pollQuestion',e.target.value)} placeholder="سؤال الاستطلاع..." />
              </div>
              <div className="form-group">
                <label className="form-label">الخيارات</label>
                {form.pollOptions.map((opt,i)=>(
                  <div key={i} style={{ display:'flex', gap:'.5rem', marginBottom:'.5rem' }}>
                    <input className="form-control" value={opt} onChange={e=>{const o=[...form.pollOptions];o[i]=e.target.value;setF('pollOptions',o);}} placeholder={`الخيار ${i+1}`} />
                    {i>=2 && <button type="button" className="btn btn-xs btn-danger" onClick={()=>setF('pollOptions',form.pollOptions.filter((_,j)=>j!==i))}>-</button>}
                  </div>
                ))}
                <button type="button" className="btn btn-xs" onClick={()=>setF('pollOptions',[...form.pollOptions,''])}>+ خيار</button>
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ انتهاء التصويت</label>
                <input type="datetime-local" className="form-control" value={form.pollExpires} onChange={e=>setF('pollExpires',e.target.value)} />
              </div>
            </>)}
          </div>

          {/* Counter */}
          <div className="admin-card">
            <div className="admin-card-title">عداد الوقت</div>
            <label className="form-check" style={{ marginBottom:'1rem' }}>
              <input type="checkbox" checked={form.hasCounter} onChange={e=>setF('hasCounter',e.target.checked)} />
              <span>إضافة عداد وقت (يظهر مع الخبر المميز)</span>
            </label>
            {form.hasCounter && (<>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">النوع</label>
                  <select className="form-control" value={form.counterDirection} onChange={e=>setF('counterDirection',e.target.value)}>
                    <option value="up">تصاعدي (منذ)</option>
                    <option value="down">تنازلي (حتى)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ البداية/الانتهاء</label>
                  <input type="datetime-local" className="form-control" value={form.counterStartDate} onChange={e=>setF('counterStartDate',e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">نص التسمية</label>
                  <input className="form-control" value={form.counterLabel} onChange={e=>setF('counterLabel',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">خط النص</label>
                  <select className="form-control" value={form.counterTextFont} onChange={e=>setF('counterTextFont',e.target.value)}>
                    <option value="Cairo">Cairo (عربي حديث)</option>
                    <option value="Amiri">Amiri (عربي كلاسيكي)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">خط الأرقام</label>
                  <select className="form-control" value={form.counterNumFont} onChange={e=>setF('counterNumFont',e.target.value)}>
                    <option value="Georgia">Georgia</option>
                    <option value="Arial">Arial</option>
                    <option value="Cairo">Cairo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">تدرج لوني للخلفية (اختياري)</label>
                  <input className="form-control ltr" value={form.counterBgGradient} onChange={e=>setF('counterBgGradient',e.target.value)} placeholder="linear-gradient(...)" dir="ltr" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">لون الخلفية</label><input type="color" className="form-control" value={form.counterBgColor} onChange={e=>setF('counterBgColor',e.target.value)} style={{height:45}} /></div>
                <div className="form-group"><label className="form-label">لون النص</label><input type="color" className="form-control" value={form.counterTextColor} onChange={e=>setF('counterTextColor',e.target.value)} style={{height:45}} /></div>
              </div>
            </>)}
          </div>

          <div style={{ display:'flex', gap:'.75rem', justifyContent:'flex-end', marginTop:'1rem' }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding:'.8rem 2.5rem' }}>
              {saving ? 'جاري الحفظ...' : (editId ? 'حفظ التغييرات' : 'نشر الخبر')}
            </button>
            <button className="btn btn-ghost" onClick={()=>router.back()}>إلغاء</button>
          </div>
        </>)}
      </div>
    </>
  );
}
