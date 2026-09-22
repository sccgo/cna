'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifyPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('رمز التحقق مفقود'); return; }
    fetch(`/api/auth/verify?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.message) { setStatus('success'); setMessage(d.message); } else { setStatus('error'); setMessage(d.error || 'خطأ'); } })
      .catch(() => { setStatus('error'); setMessage('حدث خطأ في التحقق'); });
  }, [params]);

  return (
    <div className="auth-page">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        {status === 'loading' && <><div className="spinner" style={{margin:'0 auto 1rem',width:40,height:40,borderWidth:3}} /><p>جاري التحقق...</p></>}
        {status === 'success' && (<>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
          <h2 style={{ fontFamily:'var(--font-heading)', marginBottom:'.75rem' }}>تم تأكيد البريد</h2>
          <p style={{ color:'var(--gray-500)', marginBottom:'1.5rem', lineHeight:1.7 }}>{message}</p>
          <div className="alert alert-info" style={{ textAlign:'right' }}>طلبك الآن قيد المراجعة من عمادة القبول. ستصلك رسالة بريد إلكتروني عند القبول.</div>
          <Link href="/login" className="btn btn-primary" style={{ marginTop:'1rem', display:'block', textAlign:'center', padding:'.8rem' }}>تسجيل الدخول</Link>
        </>)}
        {status === 'error' && (<>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>❌</div>
          <h2 style={{ fontFamily:'var(--font-heading)', marginBottom:'.75rem' }}>فشل التحقق</h2>
          <p style={{ color:'var(--gray-500)', marginBottom:'1.5rem' }}>{message}</p>
          <Link href="/register" className="btn btn-primary" style={{ display:'block', textAlign:'center', padding:'.8rem' }}>إعادة التسجيل</Link>
        </>)}
      </div>
    </div>
  );
}
