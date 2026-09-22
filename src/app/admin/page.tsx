'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function StatCard({ num, label, accent }: { num: number|string; label: string; accent?: boolean }) {
  return (
    <div className={`stat-card ${accent?'accent':''}`}>
      <div className="stat-num">{typeof num==='number'?num.toLocaleString('ar'):num}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function ActionBtn({ href, icon, label, color }: { href: string; icon: string; label: string; color?: string }) {
  return (
    <Link href={href} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'.5rem', padding:'1.25rem', border:'1.5px solid var(--border)', background:'#fff', cursor:'pointer', transition:'var(--transition)', textDecoration:'none', color:'var(--black)' }}
      onMouseOver={e=>{(e.currentTarget as any).style.background='var(--black)';(e.currentTarget as any).style.color='#fff';}}
      onMouseOut={e=>{(e.currentTarget as any).style.background='#fff';(e.currentTarget as any).style.color='var(--black)';}}>
      <span style={{ fontSize:'1.5rem' }}>{icon}</span>
      <span style={{ fontSize:'.82rem', fontWeight:600 }}>{label}</span>
    </Link>
  );
}

const ACTION_LABELS: Record<string,string> = {
  LOGIN:'تسجيل دخول', REGISTER:'تسجيل', NEWS_CREATE:'إنشاء خبر', NEWS_DELETE:'حذف خبر',
  NEWS_APPROVE:'قبول خبر', NEWS_REJECT:'رفض خبر', SETTINGS_UPDATE:'تحديث إعدادات',
  USER_APPROVE:'قبول مستخدم', USER_REJECT:'رفض مستخدم', USER_CHANGE_ROLE:'تغيير دور',
  ELECTION_CREATE:'إنشاء انتخابات', NEWSPAPER_CREATE:'إنشاء جريدة',
};

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser]   = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r=>r.json()),
      fetch('/api/analytics').then(r=>r.json()).catch(()=>null),
    ]).then(([me, analytics]) => {
      setUser(me.user);
      setData(analytics);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <>
      <div className="admin-topbar"><h1 className="admin-page-title">لوحة التحكم</h1></div>
      <div className="admin-content"><div className="loading-state"><div className="spinner" />جاري التحميل...</div></div>
    </>
  );

  const isDirector = user?.role === 'DIRECTOR';
  const isEditorInChief = user?.role === 'EDITOR_IN_CHIEF' || isDirector;

  return (
    <>
      <div className="admin-topbar">
        <h1 className="admin-page-title">لوحة التحكم</h1>
        <div style={{ display:'flex', gap:'.5rem' }}>
          <Link href="/admin/cms?create=1" className="btn btn-primary btn-sm">+ خبر جديد</Link>
          {isDirector && <Link href="/admin/settings" className="btn btn-sm">⚙️ الإعدادات</Link>}
        </div>
      </div>
      <div className="admin-content">

        {/* Welcome */}
        <div className="admin-card" style={{ marginBottom:'1.25rem', padding:'1.25rem', background:'var(--black)', color:'#fff', border:'none' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'.5rem' }}>
            <div>
              <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.1rem', color:'#fff', marginBottom:'.25rem' }}>
                مرحباً، {user?.fullName}
              </h2>
              <p style={{ color:'rgba(255,255,255,.55)', fontSize:'.82rem', margin:0 }}>
                {new Date().toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
              </p>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Georgia,serif', fontSize:'2rem', fontWeight:700 }}>{data?.news?.pending || 0}</div>
              <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.5)' }}>تنتظر المراجعة</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {isEditorInChief && data && (
          <div className="stats-grid">
            <StatCard num={data.news?.published||0} label="أخبار منشورة" accent />
            <StatCard num={data.news?.pending||0} label="بانتظار المراجعة" />
            <StatCard num={data.news?.breaking||0} label="أخبار عاجلة" />
            <StatCard num={data.views?.total||0} label="إجمالي المشاهدات" />
            <StatCard num={data.users?.active||0} label="مستخدمون نشطون" />
            <StatCard num={data.users?.pending||0} label="طلبات معلقة" />
            <StatCard num={data.news?.thisMonth||0} label="أخبار هذا الشهر" />
            <StatCard num={data.elections?.totalVotes||0} label="أصوات الانتخابات" />
          </div>
        )}

        {/* Quick actions */}
        <div className="admin-card">
          <div className="admin-card-title">إجراءات سريعة</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:'1rem' }}>
            <ActionBtn href="/admin/cms?create=1" icon="✏️" label="خبر جديد" />
            <ActionBtn href="/admin/import" icon="⬇️" label="استيراد خبر" />
            {isEditorInChief && <ActionBtn href="/admin/review" icon="🔍" label="مراجعة المحتوى" />}
            {isEditorInChief && <ActionBtn href="/admin/breaking" icon="🔴" label="خبر عاجل" />}
            {isDirector      && <ActionBtn href="/admin/elections" icon="🗳️" label="الانتخابات" />}
            {isEditorInChief && <ActionBtn href="/admin/newspaper" icon="📰" label="الجريدة" />}
            {(user?.role==='ADMISSIONS'||isEditorInChief) && <ActionBtn href="/admin/users" icon="👥" label="المستخدمون" />}
            {isDirector && <ActionBtn href="/admin/settings" icon="⚙️" label="التصميم" />}
          </div>
        </div>

        {/* Top news */}
        {isEditorInChief && data?.topNews?.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-title">الأخبار الأكثر مشاهدة</div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>العنوان</th><th>المشاهدات</th><th>تاريخ النشر</th><th>الشعبة</th><th>إجراء</th></tr></thead>
                <tbody>
                  {data.topNews.map((n: any) => (
                    <tr key={n.id}>
                      <td style={{ maxWidth:280 }}><a href={`/news/${n.id}`} target="_blank" style={{ fontFamily:'var(--font-heading)', fontSize:'.92rem' }}>{n.title}</a></td>
                      <td>{(n.views||0).toLocaleString('ar')}</td>
                      <td style={{ fontSize:'.8rem', color:'var(--gray-400)' }}>{n.publishedAt ? new Date(n.publishedAt).toLocaleDateString('ar-SA') : '—'}</td>
                      <td>{n.department?.name || '—'}</td>
                      <td><Link href={`/admin/cms?edit=${n.id}`} className="btn btn-xs">تعديل</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent activity */}
        {isDirector && data?.recentActivity?.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-title">آخر النشاطات</div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>الإجراء</th><th>المستخدم</th><th>الوقت</th></tr></thead>
                <tbody>
                  {data.recentActivity.slice(0,15).map((a: any) => (
                    <tr key={a.id}>
                      <td>{ACTION_LABELS[a.action] || a.action}</td>
                      <td style={{ fontSize:'.82rem' }}>{a.user?.fullName || '—'}</td>
                      <td style={{ fontSize:'.78rem', color:'var(--gray-400)' }}>{new Date(a.createdAt).toLocaleString('ar-SA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dept stats */}
        {isEditorInChief && data?.departments?.length > 0 && (
          <div className="admin-card">
            <div className="admin-card-title">إحصائيات الشعب</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:'1rem' }}>
              {data.departments.map((d: any) => (
                <div key={d.id} style={{ padding:'1rem', border:'1px solid var(--border)', background:'#fff' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.4rem' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:d.color, flexShrink:0 }} />
                    <span style={{ fontSize:'.82rem', fontWeight:600 }}>{d.name}</span>
                  </div>
                  <div style={{ fontFamily:'Georgia,serif', fontSize:'1.5rem', fontWeight:700 }}>{d.newsCount}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--gray-400)' }}>خبر منشور</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
