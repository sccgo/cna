'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Step = 'form' | 'success';

function StrengthBar({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(4, score);
  const colors = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#16a34a'];
  const labels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية'];
  if (!password) return null;
  return (
    <div style={{ marginTop: '.4rem' }}>
      <div style={{ display: 'flex', gap: '.25rem', marginBottom: '.25rem' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex:1, height:4, background: i < score ? colors[score] : 'var(--gray-200)', transition:'.3s' }} />
        ))}
      </div>
      <span style={{ fontSize: '.72rem', color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ email: '', username: '', password: '', password2: '', fullName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.email || !form.username || !form.password || !form.fullName) { setError('يرجى تعبئة جميع الحقول المطلوبة'); return; }
    if (form.password !== form.password2) { setError('كلمتا المرور غير متطابقتين'); return; }
    if (form.password.length < 8) { setError('كلمة المرور 8 أحرف على الأقل'); return; }
    if (!/[A-Z]/.test(form.password)) { setError('يجب أن تحتوي كلمة المرور على حرف كبير'); return; }
    if (!/[0-9]/.test(form.password)) { setError('يجب أن تحتوي كلمة المرور على رقم'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, username: form.username, password: form.password, fullName: form.fullName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'خطأ في التسجيل'); return; }
      setStep('success');
    } catch(_e) { setError('حدث خطأ، حاول مرة أخرى');
    } finally { setLoading(false); }
  }

  if (step === 'success') {
    return (
      <div className="auth-page">
        <div className="auth-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '.75rem' }}>تحقق من بريدك الإلكتروني</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            أرسلنا رابط تأكيد إلى <strong style={{ color: 'var(--black)' }}>{form.email}</strong>.<br />
            بعد التأكيد، سيتم مراجعة طلبك من قِبل عمادة القبول.
          </p>
          <div className="alert alert-info" style={{ textAlign: 'right' }}>
            بعد الموافقة على طلبك ستصلك رسالة بريد إلكتروني بالقبول وبإمكانك تسجيل الدخول.
          </div>
          <Link href="/login" className="btn btn-primary" style={{ width:'100%', padding:'.8rem', textAlign:'center', marginTop:'1rem' }}>
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-box" style={{ maxWidth: 480 }}>
        <div className="auth-logo">
          <Image src="/img/logo.png" alt="CNA" width={160} height={56} style={{ height: 52, width: 'auto', margin: '0 auto .5rem' }} onError={(e: any) => e.currentTarget.style.display='none'} />
          <span className="auth-logo-divider" />
          <span className="auth-logo-ar">إنشاء حساب جديد</span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="off" noValidate>
          <div className="form-group">
            <label className="form-label">الاسم الكامل *</label>
            <input className="form-control" type="text" placeholder="اسمك الكامل" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">اسم المستخدم *</label>
              <input className="form-control" type="text" placeholder="username" value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_\u0600-\u06FF]/g,''))} autoComplete="off" />
              <small style={{ fontSize: '.72rem', color: 'var(--gray-400)' }}>أحرف إنجليزية/عربية وأرقام فقط</small>
            </div>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني *</label>
              <input className="form-control ltr" type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور *</label>
            <input className="form-control" type="password" placeholder="8 أحرف، حرف كبير، رقم" value={form.password} onChange={e => set('password', e.target.value)} />
            <StrengthBar password={form.password} />
          </div>
          <div className="form-group">
            <label className="form-label">تأكيد كلمة المرور *</label>
            <input className="form-control" type="password" placeholder="أعد إدخال كلمة المرور" value={form.password2} onChange={e => set('password2', e.target.value)} />
            {form.password2 && form.password !== form.password2 && (
              <small style={{ color: '#dc2626', fontSize: '.72rem' }}>كلمتا المرور غير متطابقتين</small>
            )}
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width:'100%', padding:'.82rem', fontSize:'1rem', marginTop:'.5rem' }}>
            {loading ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}} /> جاري التسجيل...</> : 'إنشاء الحساب'}
          </button>
        </form>

        <div style={{ marginTop:'1.25rem', textAlign:'center', display:'flex', flexDirection:'column', gap:'.5rem' }}>
          <Link href="/login" style={{ fontSize:'.88rem', color:'var(--black)', fontWeight:700 }}>لديك حساب؟ سجّل الدخول</Link>
          <Link href="/" style={{ fontSize:'.82rem', color:'var(--gray-500)' }}>العودة للموقع</Link>
        </div>
      </div>
    </div>
  );
}
