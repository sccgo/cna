'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const reason = params.get('reason');
  const redirect = params.get('redirect') || '/';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.identifier || !form.password) { setError('يرجى تعبئة جميع الحقول'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'خطأ في تسجيل الدخول'); return; }
      const dest = data.user?.role === 'VIEWER' ? '/' : redirect.startsWith('/admin') ? redirect : '/admin';
      router.push(dest);
      router.refresh();
    } catch(_e) { setError('حدث خطأ، حاول مرة أخرى');
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <Image src="/img/logo.png" alt="CNA" width={160} height={56} style={{ height: 56, width: 'auto', margin: '0 auto .5rem' }} onError={(e: any) => e.currentTarget.style.display='none'} />
          <span className="auth-logo-divider" />
          <span className="auth-logo-ar">بوابة الدخول الموحد</span>
        </div>

        {reason === 'pending' && <div className="alert alert-info">طلبك قيد المراجعة من عمادة القبول</div>}
        {reason === 'rate_limit' && <div className="alert alert-warn">محاولات كثيرة، انتظر قليلاً</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label className="form-label">اسم المستخدم أو البريد الإلكتروني</label>
            <input
              className="form-control" type="text" autoComplete="username"
              placeholder="أدخل اسم المستخدم أو البريد"
              value={form.identifier}
              onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-control" type={showPass ? 'text' : 'password'}
                autoComplete="current-password" placeholder="أدخل كلمة المرور"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                style={{ paddingLeft: '2.8rem' }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position:'absolute', left:'.7rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--gray-400)', fontSize:'.85rem' }}>
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width:'100%', padding:'.82rem', fontSize:'1rem', marginTop:'.5rem' }}
            type="submit" disabled={loading}>
            {loading ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}} /> جاري الدخول...</> : 'دخول'}
          </button>
        </form>

        <div style={{ marginTop:'1.5rem', textAlign:'center', display:'flex', flexDirection:'column', gap:'.5rem' }}>
          <Link href="/register" style={{ fontSize:'.88rem', color:'var(--black)', fontWeight:700 }}>
            ليس لديك حساب؟ إنشاء حساب جديد
          </Link>
          <Link href="/forgot-password" style={{ fontSize:'.82rem', color:'var(--gray-500)' }}>
            نسيت كلمة المرور؟
          </Link>
          <Link href="/" style={{ fontSize:'.82rem', color:'var(--gray-500)' }}>
            العودة للموقع
          </Link>
        </div>
      </div>
    </div>
  );
}
