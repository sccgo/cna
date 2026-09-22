'use client';
import { useEffect, useState } from 'react';

const ACTION_LABELS: Record<string,string> = {
  LOGIN:'دخول',REGISTER:'تسجيل',NEWS_CREATE:'إنشاء خبر',NEWS_DELETE:'حذف خبر',
  NEWS_APPROVE:'قبول خبر',NEWS_REJECT:'رفض خبر',NEWS_UPDATE:'تحديث خبر',
  SETTINGS_UPDATE:'تحديث إعدادات',USER_APPROVE:'قبول مستخدم',USER_REJECT:'رفض مستخدم',
  USER_SUSPEND:'إيقاف مستخدم',USER_CHANGE_ROLE:'تغيير دور',USER_DELETE:'حذف مستخدم',
  ELECTION_CREATE:'إنشاء انتخابات',NEWSPAPER_CREATE:'إنشاء جريدة',
};

export default function LogsPage() {
  const [logs, setLogs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  useEffect(()=>{
    fetch('/api/analytics').then(r=>r.json()).then(d=>{ setLogs(d.recentActivity||[]); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  const filtered = filter ? logs.filter(l=>l.action.includes(filter.toUpperCase())||l.user?.fullName?.includes(filter)) : logs;

  return (<>
    <div className="admin-topbar"><h1 className="admin-page-title">سجل النشاط</h1></div>
    <div className="admin-content">
      <div style={{marginBottom:'1rem'}}>
        <input className="form-control" style={{maxWidth:320}} placeholder="بحث في السجل..." value={filter} onChange={e=>setFilter(e.target.value)} />
      </div>
      {loading ? <div className="loading-state"><div className="spinner"/>جاري التحميل...</div> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>الإجراء</th><th>المستخدم</th><th>الوقت</th><th>التفاصيل</th></tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={4} style={{textAlign:'center',padding:'2rem',color:'var(--gray-400)'}}>لا توجد نتائج</td></tr>}
              {filtered.map((l:any)=>(
                <tr key={l.id}>
                  <td><span className="badge badge-imported">{ACTION_LABELS[l.action]||l.action}</span></td>
                  <td style={{fontSize:'.85rem'}}>{l.user?.fullName||'—'}<br/><span style={{fontSize:'.72rem',color:'var(--gray-400)'}}>{l.user?.username}</span></td>
                  <td style={{fontSize:'.75rem',color:'var(--gray-400)'}}>{new Date(l.createdAt).toLocaleString('ar-SA')}</td>
                  <td style={{fontSize:'.75rem',color:'var(--gray-500)'}}>{l.entityId?`#${l.entityId.substring(0,8)}`:''}{l.details?JSON.stringify(l.details).substring(0,60):''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </>);
}
