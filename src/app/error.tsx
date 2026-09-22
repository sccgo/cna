'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem',textAlign:'center',padding:'2rem'}}>
      <div style={{fontFamily:'Georgia,serif',fontSize:'3rem',fontWeight:900}}>⚠️</div>
      <h2 style={{fontFamily:'var(--font-heading)'}}>حدث خطأ غير متوقع</h2>
      <p style={{color:'#737373',fontSize:'.9rem'}}>{error.message}</p>
      <button onClick={reset} style={{padding:'.7rem 2rem',background:'#0a0a0a',color:'#fff',border:'none',cursor:'pointer',fontWeight:600}}>إعادة المحاولة</button>
    </div>
  );
}
