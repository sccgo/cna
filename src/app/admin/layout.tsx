'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { section: 'الرئيسية' },
  { href:'/admin',             label:'لوحة التحكم',        exact:true },
  { href:'/',                  label:'عرض الموقع',         ext:true },
  { section: 'المحتوى' },
  { href:'/admin/cms',         label:'إدارة الأخبار (CMS)' },
  { href:'/admin/review',      label:'مراجعة المحتوى',     roles:['REVIEWER','EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/import',      label:'استيراد خبر',        roles:['EDITOR','REVIEWER','EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/breaking',    label:'الأخبار العاجلة',    roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { section: 'المنصة' },
  { href:'/admin/elections',   label:'الانتخابات',         roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/newspaper',   label:'الجريدة',            roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { section: 'الإدارة' },
  { href:'/admin/users',       label:'المستخدمون',         roles:['ADMISSIONS','EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/departments', label:'الشعب',              roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/settings',    label:'الإعدادات والتصميم', roles:['DEVELOPER','DIRECTOR'] },
  { href:'/admin/logs',        label:'سجل النشاط',         roles:['DIRECTOR'] },
];

const ROLE_AR: Record<string,string> = {
  VIEWER:'زائر', EDITOR:'محرر', REVIEWER:'مراجع', DEVELOPER:'مبرمج',
  EDITOR_IN_CHIEF:'رئيس التحرير', ADMISSIONS:'عمادة القبول', DIRECTOR:'رئيس الوكالة',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser]   = useState<any>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (!d.user || d.user.status !== 'APPROVED') { router.replace('/login?redirect=' + encodeURIComponent(pathname)); return; }
      if (d.user.role === 'VIEWER') { router.replace('/'); return; }
      setUser(d.user); setReady(true);
    }).catch(() => router.replace('/login'));
  }, []);

  const canSee = (item: any) => !item.roles || item.roles.includes(user?.role);
  const logout = async () => { await fetch('/api/auth/logout', { method:'POST' }); router.push('/login'); };

  if (!ready) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" style={{ width:40, height:40, borderWidth:3 }} />
    </div>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', direction:'rtl' }}>
      {/* Sidebar — fixed to RIGHT */}
      <div style={{
        width:240, background:'#0a0a0a', color:'#fff', flexShrink:0,
        position:'fixed', top:0, bottom:0, right:0, overflowY:'auto',
        display:'flex', flexDirection:'column', zIndex:200,
      }}>
        {/* Logo */}
        <div
          style={{ padding:'1.25rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.1)', cursor:'pointer' }}
          onClick={e => {
            if ((window as any).CNA?.sparkles) {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              (window as any).CNA.sparkles.burst(r.left + r.width/2, r.top + r.height/2, 30);
            }
          }}
        >
          <div style={{ fontFamily:'Georgia,serif', fontSize:'1.5rem', letterSpacing:'.3em', fontWeight:700 }}>CNA</div>
          <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.4)', marginTop:'.15rem', letterSpacing:'.05em' }}>لوحة التحكم</div>
        </div>

        {/* User */}
        <div style={{ padding:'.85rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontWeight:600, fontSize:'.88rem' }}>{user.fullName}</div>
          <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.4)', marginTop:'.1rem' }}>{ROLE_AR[user.role]}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'.5rem 0' }}>
          {NAV.map((item, i) => {
            if ('section' in item && !('href' in item)) return (
              <div key={i} style={{ padding:'.35rem 1.5rem', fontSize:'.62rem', fontWeight:700, letterSpacing:'.15em', color:'rgba(255,255,255,.25)', textTransform:'uppercase', marginTop:'.5rem' }}>
                {item.section}
              </div>
            );
            const itm = item as any;
            if (!canSee(itm)) return null;
            const active = itm.exact ? pathname === itm.href : pathname.startsWith(itm.href);
            return (
              <Link key={itm.href} href={itm.href} target={itm.ext?'_blank':undefined}
                style={{
                  display:'block', padding:'.62rem 1.5rem', fontSize:'.855rem',
                  color: active ? '#fff' : 'rgba(255,255,255,.6)',
                  background: active ? 'rgba(255,255,255,.1)' : 'transparent',
                  borderLeft: active ? '3px solid #fff' : '3px solid transparent',
                  textDecoration:'none', transition:'all .15s', textAlign:'right',
                }}
                onMouseOver={e => { if(!active)(e.currentTarget as any).style.background='rgba(255,255,255,.06)'; }}
                onMouseOut={e  => { if(!active)(e.currentTarget as any).style.background='transparent'; }}
              >
                {itm.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding:'1.1rem 1.5rem', borderTop:'1px solid rgba(255,255,255,.08)' }}>
          <button onClick={logout}
            style={{ width:'100%', padding:'.5rem', background:'transparent', border:'1px solid rgba(255,255,255,.15)', color:'rgba(255,255,255,.45)', cursor:'pointer', fontSize:'.8rem', fontFamily:'var(--font-body)' }}>
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Main content — offset from right sidebar */}
      <div style={{ flex:1, marginRight:240, background:'var(--gray-100)', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
        {children}
      </div>
    </div>
  );
}
