'use client';
import { useEffect, useState } from 'react';

type Settings = Record<string,string>;

function ColorRow({ label, settingKey, settings, onChange }: {
  label: string; settingKey: string; settings: Settings; onChange: (k:string,v:string)=>void;
}) {
  const v = settings[settingKey] || '#0a0a0a';
  return (
    <div className="theme-row">
      <div className="theme-label">{label}</div>
      <div style={{display:'flex',gap:'.5rem',alignItems:'center'}}>
        <input type="color" value={v} onChange={e=>onChange(settingKey,e.target.value)}
          style={{width:50,height:36,border:'1px solid var(--border)',cursor:'pointer'}} />
        <input className="form-control ltr" value={v} onChange={e=>onChange(settingKey,e.target.value)} dir="ltr"
          style={{flex:1,maxWidth:200,fontSize:'.82rem'}} />
      </div>
      <div style={{height:36,background:v,border:'1px solid var(--border)',width:'100%'}} />
    </div>
  );
}

function BgRow({ label, typeKey, valueKey, settings, onChange, imageTarget }: {
  label: string; typeKey: string; valueKey: string; settings: Settings;
  onChange: (k:string,v:string)=>void; imageTarget?: string;
}) {
  const type = settings[typeKey] || 'default';
  const value = settings[valueKey] || '';
  const PRESETS_GRAD = [
    { label:'ليلي',    val:'linear-gradient(135deg,#1a1a2e,#16213e)' },
    { label:'بحري',    val:'linear-gradient(135deg,#2c3e50,#4ca1af)' },
    { label:'كون',     val:'linear-gradient(135deg,#0a0a0a,#1a1a2e,#0f3460)' },
    { label:'رمادي',   val:'linear-gradient(180deg,#f5f5f5,#e0e0e0)' },
    { label:'ذهبي',    val:'linear-gradient(135deg,#b8860b,#0a0a0a)' },
    { label:'أزرق',    val:'linear-gradient(135deg,#1e3a5f,#2563eb)' },
  ];
  return (
    <div style={{borderBottom:'1px solid var(--gray-100)',paddingBottom:'1rem',marginBottom:'1rem'}}>
      <div style={{display:'grid',gridTemplateColumns:'160px 1fr 80px',gap:'1rem',alignItems:'start'}}>
        <div className="theme-label">{label}</div>
        <div>
          <select className="type-select" value={type} onChange={e=>{onChange(typeKey,e.target.value);if(e.target.value==='default')onChange(valueKey,'');}}>
            <option value="default">افتراضي</option>
            <option value="color">لون محدد</option>
            <option value="gradient">تدرج لوني</option>
            <option value="image">صورة من الجهاز</option>
          </select>
          {type==='color' && (
            <div style={{display:'flex',gap:'.5rem',marginTop:'.5rem'}}>
              <input type="color" value={value||'#ffffff'} onChange={e=>onChange(valueKey,e.target.value)} style={{width:45,height:34,border:'1px solid var(--border)',cursor:'pointer'}} />
              <input className="form-control ltr" value={value} onChange={e=>onChange(valueKey,e.target.value)} placeholder="#000000" dir="ltr" style={{fontSize:'.82rem'}} />
            </div>
          )}
          {type==='gradient' && (<>
            <input className="form-control ltr" value={value} onChange={e=>onChange(valueKey,e.target.value)} placeholder="linear-gradient(...)" dir="ltr" style={{marginTop:'.5rem',fontSize:'.82rem'}} />
            <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginTop:'.4rem'}}>
              {PRESETS_GRAD.map(p=>( <button key={p.label} type="button" className="preset-chip" onClick={()=>onChange(valueKey,p.val)}>{p.label}</button> ))}
            </div>
          </>)}
          {type==='image' && (
            <input type="file" className="form-control" accept="image/*" style={{marginTop:'.5rem'}} onChange={async e=>{
              const f=e.target.files?.[0]; if(!f) return;
              const fd=new FormData(); fd.append('file',f); fd.append('type','bg');
              const res=await fetch('/api/upload',{method:'POST',body:fd}); const d=await res.json();
              if(d.url) onChange(valueKey,d.url);
            }} />
          )}
        </div>
        <div style={{height:50,background:type!=='default'?value:'var(--white)',border:'1px solid var(--border)',backgroundSize:'cover',backgroundPosition:'center',backgroundImage:type==='image'?`url('${value}')`:'none'}} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [s, setS] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [msg,     setMsg]       = useState('');
  const [isDirector, setIsDir]  = useState(false);
  const [designTitle, setDesignTitle] = useState('تعديل تصميم');
  const [designDesc,  setDesignDesc]  = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r=>r.json()),
      fetch('/api/auth/me').then(r=>r.json()),
    ]).then(([settings, me]) => {
      setS(settings);
      setIsDir(me.user?.role==='DIRECTOR');
      setLoading(false);
    });
  }, []);

  const set = (k: string, v: string) => setS(p=>({...p,[k]:v}));

  async function save() {
    setSaving(true); setMsg('');
    const payload: Settings = { ...s };
    if (!isDirector) {
      payload._design_title       = designTitle;
      payload._design_description = designDesc;
    }
    const res = await fetch('/api/settings',{ method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const d = await res.json();
    setSaving(false);
    if(res.ok) setMsg(isDirector ? 'تم حفظ الإعدادات وتطبيق التصميم فوراً' : (d.submitted?'تم تقديم التعديل للمراجعة':'تم الحفظ'));
    else setMsg(d.error||'حدث خطأ');
  }

  async function resetTheme() {
    if(!confirm('إعادة ضبط التصميم للافتراضي؟ سيتم حذف جميع تخصيصات التصميم.')) return;
    // Delete all theme keys by setting them to 'default' or empty
    const themeKeys = [
      'theme_font_body','theme_font_heading',
      'theme_site_bg_type','theme_site_bg_value',
      'theme_header_bg_type','theme_header_bg_value',
      'theme_nav_bg_type','theme_nav_bg_value',
      'theme_footer_bg_type','theme_footer_bg_value',
      'theme_card_bg','theme_card_border','theme_card_title_color',
      'theme_accent_color','theme_text_primary','theme_text_secondary',
      'theme_nav_link_color','theme_btn_bg','theme_btn_text',
      'theme_btn_hover_bg','theme_readmore_bg','theme_readmore_text',
      'theme_hero_panel_bg','theme_hero_panel_gradient',
      'theme_hero_title_color','theme_hero_desc_color',
      'theme_hero_badge_bg','theme_hero_badge_text',
      'theme_hero_border','ticker_bg','ticker_text_color','ticker_speed',
    ];
    const payload: Settings = {};
    themeKeys.forEach(k => { payload[k] = 'default'; });
    payload['theme_version'] = String(Date.now()); // force CSS refresh
    const res = await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(res.ok) {
      const fresh = await fetch('/api/settings').then(r=>r.json());
      setS(fresh);
      setMsg('تم إعادة الضبط للافتراضي ✓');
    } else setMsg('حدث خطأ في إعادة الضبط');
  }

  async function uploadLogo(file: File) {
    const fd=new FormData(); fd.append('file',file); fd.append('type','logo');
    const res=await fetch('/api/upload',{method:'POST',body:fd}); const d=await res.json();
    if(d.url) { set('logo_path',d.url); setMsg('تم رفع الشعار'); }
  }

  if(loading) return (<><div className="admin-topbar"><h1 className="admin-page-title">الإعدادات والتصميم</h1></div><div className="admin-content"><div className="loading-state"><div className="spinner"/>جاري التحميل...</div></div></>);

  return (<>
    <div className="admin-topbar">
      <h1 className="admin-page-title">الإعدادات والتصميم</h1>
      <div style={{display:'flex',gap:'.5rem'}}>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'جاري الحفظ...' : (isDirector?'حفظ وتطبيق فوراً':'تقديم للمراجعة')}
        </button>
        {isDirector && <button className="btn btn-ghost btn-sm" onClick={resetTheme}>إعادة الضبط</button>}
      </div>
    </div>
    <div className="admin-content">
      {msg && <div className={`alert ${msg.includes('خطأ')?'alert-error':'alert-success'}`}>{msg}</div>}

      {!isDirector && (
        <div className="admin-card">
          <div className="admin-card-title">معلومات الطلب (سيتم مراجعته من المدير)</div>
          <div className="form-group"><label className="form-label">عنوان التعديل</label><input className="form-control" value={designTitle} onChange={e=>setDesignTitle(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">وصف التعديل (اختياري)</label><textarea className="form-control" value={designDesc} onChange={e=>setDesignDesc(e.target.value)} rows={2} /></div>
        </div>
      )}

      {/* General */}
      <div className="admin-card">
        <div className="admin-card-title">معلومات الموقع العامة</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">اسم الموقع (عربي)</label><input className="form-control" value={s.site_name||''} onChange={e=>set('site_name',e.target.value)} /></div>
          <div className="form-group"><label className="form-label">الاسم الإنجليزي / الرمز</label><input className="form-control ltr" value={s.site_name_en||''} onChange={e=>set('site_name_en',e.target.value)} dir="ltr" /></div>
        </div>
        <div className="form-group"><label className="form-label">الشعار الترويجي</label><input className="form-control" value={s.site_tagline||''} onChange={e=>set('site_tagline',e.target.value)} /></div>
        <div className="form-group">
          <label className="form-label">الشعار الرسمي (PNG/SVG)</label>
          <div style={{display:'flex',gap:'1rem',alignItems:'center',flexWrap:'wrap'}}>
            {s.logo_path && <img src={s.logo_path} alt="الشعار" style={{height:50,border:'1px solid var(--border)',padding:4}} onError={(e:any)=>e.currentTarget.style.display='none'} />}
            <input type="file" accept="image/*,.svg" className="form-control" style={{flex:1,minWidth:200}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadLogo(f);}} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">شعار ثانوي (جهة حكومية أو راعي)</label>
          <div style={{display:'flex',gap:'1rem',alignItems:'center',flexWrap:'wrap'}}>
            {s.secondary_logo_path && <img src={s.secondary_logo_path} alt="الشعار الثانوي" style={{height:46,border:'1px solid var(--border)',padding:4}} onError={(e:any)=>e.currentTarget.style.display='none'} />}
            <input type="file" accept="image/*,.svg" className="form-control" style={{flex:1,minWidth:200}} onChange={async e=>{
              const f=e.target.files?.[0]; if(!f) return;
              const fd=new FormData(); fd.append('file',f); fd.append('type','logo');
              const res=await fetch('/api/upload',{method:'POST',body:fd}); const d=await res.json();
              if(d.url) { set('secondary_logo_path',d.url); setMsg('تم رفع الشعار الثانوي'); }
            }} />
            {s.secondary_logo_path && <button type="button" className="btn btn-xs btn-danger" onClick={()=>set('secondary_logo_path','')}>حذف</button>}
          </div>
          <small style={{fontSize:'.75rem',color:'var(--gray-400)'}}>يظهر بجانب شعار الوكالة في الهيدر</small>
        </div>
        <label className="form-check"><input type="checkbox" checked={s.registration_enabled==='1'} onChange={e=>set('registration_enabled',e.target.checked?'1':'0')} /><span>السماح بإنشاء حسابات جديدة</span></label>
      </div>

      {/* Font */}
      <div className="admin-card">
        <div className="admin-card-title">خطوط الموقع</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">خط نص المقالات</label>
            <select className="form-control" value={s.theme_font_body||'Cairo'} onChange={e=>set('theme_font_body',e.target.value)}>
              <option value="Cairo">Cairo (عربي حديث)</option>
              <option value="Amiri">Amiri (عربي كلاسيكي)</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">خط العناوين</label>
            <select className="form-control" value={s.theme_font_heading||'Amiri'} onChange={e=>set('theme_font_heading',e.target.value)}>
              <option value="Amiri">Amiri (عربي كلاسيكي)</option>
              <option value="Cairo">Cairo (عربي حديث)</option>
              <option value="Georgia">Georgia</option>
              <option value="Arial">Arial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backgrounds */}
      <div className="admin-card">
        <div className="admin-card-title">خلفيات الصفحات</div>
        <BgRow label="خلفية الموقع"     typeKey="theme_site_bg_type"   valueKey="theme_site_bg_value"   settings={s} onChange={set} />
        <BgRow label="خلفية الهيدر"     typeKey="theme_header_bg_type" valueKey="theme_header_bg_value" settings={s} onChange={set} />
        <BgRow label="شريط التصفح"      typeKey="theme_nav_bg_type"    valueKey="theme_nav_bg_value"    settings={s} onChange={set} />
        <BgRow label="خلفية الفوتر"     typeKey="theme_footer_bg_type" valueKey="theme_footer_bg_value" settings={s} onChange={set} />
      </div>

      {/* Cards */}
      <div className="admin-card">
        <div className="admin-card-title">بطاقات الأخبار</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:0}}>
          <ColorRow label="خلفية البطاقات"     settingKey="theme_card_bg"           settings={s} onChange={set} />
          <ColorRow label="حدود البطاقات"       settingKey="theme_card_border"        settings={s} onChange={set} />
          <ColorRow label="لون عنوان البطاقة"   settingKey="theme_card_title_color"   settings={s} onChange={set} />
        </div>
      </div>

      {/* Colors */}
      <div className="admin-card">
        <div className="admin-card-title">ألوان النصوص والأزرار</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:0}}>
          <ColorRow label="لون التمييز (Accent)"    settingKey="theme_accent_color"     settings={s} onChange={set} />
          <ColorRow label="النص الرئيسي"             settingKey="theme_text_primary"     settings={s} onChange={set} />
          <ColorRow label="النص الثانوي"             settingKey="theme_text_secondary"   settings={s} onChange={set} />
          <ColorRow label="روابط التصفح"             settingKey="theme_nav_link_color"   settings={s} onChange={set} />
          <ColorRow label="خلفية الزر الرئيسي"       settingKey="theme_btn_bg"           settings={s} onChange={set} />
          <ColorRow label="نص الزر الرئيسي"          settingKey="theme_btn_text"         settings={s} onChange={set} />
          <ColorRow label="الزر عند التحويم"          settingKey="theme_btn_hover_bg"     settings={s} onChange={set} />
          <ColorRow label="زر 'قراءة الخبر' — خلفية" settingKey="theme_readmore_bg"      settings={s} onChange={set} />
          <ColorRow label="زر 'قراءة الخبر' — نص"    settingKey="theme_readmore_text"    settings={s} onChange={set} />
        </div>
      </div>

      {/* Hero card */}
      <div className="admin-card">
        <div className="admin-card-title">الخبر المميز (Hero Card)</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:0}}>
          <div style={{marginBottom:'1rem'}}>
            <label className="form-label">خلفية اللوحة</label>
            <div className="form-row">
              <input type="color" value={s.theme_hero_panel_bg||'#ffffff'} onChange={e=>set('theme_hero_panel_bg',e.target.value)} style={{height:45,width:'100%'}} />
              <input className="form-control ltr" value={s.theme_hero_panel_gradient||''} onChange={e=>set('theme_hero_panel_gradient',e.target.value)} placeholder="أو: linear-gradient(...)" dir="ltr" />
            </div>
          </div>
          <ColorRow label="لون العنوان"      settingKey="theme_hero_title_color"  settings={s} onChange={set} />
          <ColorRow label="لون الوصف"        settingKey="theme_hero_desc_color"   settings={s} onChange={set} />
          <ColorRow label="شارة (خلفية)"     settingKey="theme_hero_badge_bg"     settings={s} onChange={set} />
          <ColorRow label="شارة (نص)"        settingKey="theme_hero_badge_text"   settings={s} onChange={set} />
          <ColorRow label="حدود البطاقة"     settingKey="theme_hero_border"       settings={s} onChange={set} />
        </div>
      </div>

      {/* Ticker */}
      <div className="admin-card">
        <div className="admin-card-title">شريط الأخبار العاجلة</div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">لون الخلفية</label><input type="color" className="form-control" value={s.ticker_bg||'#000000'} onChange={e=>set('ticker_bg',e.target.value)} style={{height:45}} /></div>
          <div className="form-group"><label className="form-label">لون النص</label><input type="color" className="form-control" value={s.ticker_text_color||'#ffffff'} onChange={e=>set('ticker_text_color',e.target.value)} style={{height:45}} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">السرعة: {s.ticker_speed||40} (كلما زادت كان أبطأ)</label>
          <input type="range" min={5} max={100} value={s.ticker_speed||40} onChange={e=>set('ticker_speed',e.target.value)} style={{width:'100%'}} />
        </div>
      </div>

      {/* Email */}
      {isDirector && (
        <div className="admin-card">
          <div className="admin-card-title">إعدادات البريد الإلكتروني (SMTP)</div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">SMTP Host</label><input className="form-control ltr" value={s.email_host||''} onChange={e=>set('email_host',e.target.value)} dir="ltr" /></div>
            <div className="form-group"><label className="form-label">SMTP Port</label><input className="form-control ltr" value={s.email_port||'587'} onChange={e=>set('email_port',e.target.value)} dir="ltr" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">المستخدم</label><input className="form-control ltr" value={s.email_user||''} onChange={e=>set('email_user',e.target.value)} dir="ltr" /></div>
            <div className="form-group"><label className="form-label">كلمة المرور</label><input type="password" className="form-control ltr" value={s.email_pass||''} onChange={e=>set('email_pass',e.target.value)} dir="ltr" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">بريد المرسل</label><input className="form-control ltr" value={s.email_from||''} onChange={e=>set('email_from',e.target.value)} dir="ltr" /></div>
            <div className="form-group"><label className="form-label">NewsAPI Key</label><input className="form-control ltr" value={s.newsapi_key||''} onChange={e=>set('newsapi_key',e.target.value)} dir="ltr" placeholder="مجاني من newsapi.org" /></div>
          </div>
          <label className="form-check"><input type="checkbox" checked={s.show_world_news==='1'} onChange={e=>set('show_world_news',e.target.checked?'1':'0')} /><span>إظهار الأخبار العالمية في الصفحة الرئيسية</span></label>
        </div>
      )}
    </div>
  </>);
}
