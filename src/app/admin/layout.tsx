'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { section: 'الرئيسية' },
  { href:'/admin',             icon:'⬛', label:'لوحة التحكم',       exact:true },
  { href:'/',                  icon:'🌐', label:'عرض الموقع',        ext:true },
  { section: 'المحتوى' },
  { href:'/admin/cms',         icon:'✏️', label:'إدارة الأخبار (CMS)' },
  { href:'/admin/review',      icon:'🔍', label:'مراجعة المحتوى',    roles:['REVIEWER','EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/import',      icon:'⬇️', label:'استيراد خبر',       roles:['EDITOR','EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/breaking',    icon:'🔴', label:'الأخبار العاجلة',   roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { section: 'المنصة' },
  { href:'/admin/elections',   icon:'🗳️', label:'الانتخابات',        roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/newspaper',   icon:'📰', label:'الجريدة',           roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { section: 'الإدارة' },
  { href:'/admin/users',       icon:'👥', label:'المستخدمون',        roles:['ADMISSIONS','EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/departments', icon:'🏢', label:'الشعب',             roles:['EDITOR_IN_CHIEF','DIRECTOR'] },
  { href:'/admin/settings',    icon:'⚙️', label:'الإعدادات والتصميم', roles:['DEVELOPER','DIRECTOR'] },
  { href:'/admin/logs',        icon:'📋', label:'سجل النشاط',        roles:['DIRECTOR'] },
];

const ROLE_LABELS: Record<string,string> = {
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
      if (!d.user || d.user.status !== 'APPROVED') {
        router.replace('/login?redirect=' + encodeURIComponent(pathname)); return;
      }
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
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <div className="admin-logo-cna">CNA</div>
          <div className="admin-logo-ar">لوحة التحكم</div>
        </div>
        <div className="admin-user-bar">
          <div className="admin-user-name">{user.fullName}</div>
          <div className="admin-user-role">{ROLE_LABELS[user.role] || user.role}</div>
        </div>
        <nav className="admin-nav">
          {NAV.map((item, i) => {
            if ('section' in item && !('href' in item)) return <div key={i} className="admin-nav-section">{item.section}</div>;
            if (!canSee(item)) return null;
            const itm = item as any;
            const active = itm.exact ? pathname === itm.href : pathname.startsWith(itm.href);
            return (
              <Link key={itm.href} href={itm.href}
                className={`admin-nav-link ${active?'active':''}`}
                target={itm.ext ? '_blank' : undefined}>
                <span className="admin-nav-icon">{itm.icon}</span>
                {itm.label}
              </Link>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={logout} className="btn btn-ghost"
            style={{ width:'100%', fontSize:'.8rem', color:'rgba(255,255,255,.5)', borderColor:'rgba(255,255,255,.15)' }}>
            تسجيل الخروج
          </button>
        </div>
      </div>
      <div className="admin-main">{children}</div>
    </div>
  );
}
