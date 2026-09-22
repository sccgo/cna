import Link from 'next/link';
export default function NotFound() {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'var(--font-body)',gap:'1rem',padding:'2rem',textAlign:'center'}}>
      <div style={{fontFamily:'Georgia,serif',fontSize:'5rem',fontWeight:900,letterSpacing:'.1em',color:'#0a0a0a'}}>404</div>
      <h1 style={{fontFamily:'var(--font-heading)',fontSize:'1.5rem'}}>الصفحة غير موجودة</h1>
      <p style={{color:'#737373'}}>الصفحة التي تبحث عنها غير موجودة أو تم نقلها</p>
      <Link href="/" style={{display:'inline-block',padding:'.75rem 2rem',background:'#0a0a0a',color:'#fff',fontWeight:600,textDecoration:'none'}}>العودة للرئيسية</Link>
    </div>
  );
}
