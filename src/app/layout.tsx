import type { Metadata } from 'next';
import type { Viewport } from 'next';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'CNA — وكالة الأنباء التنسيقية', template: '%s | CNA' },
  description: 'المصدر الرسمي للأنباء',
  keywords: ['أخبار', 'وكالة أنباء', 'CNA', 'أخبار عاجلة'],
  robots: { index: true, follow: true },
  icons: { icon: '/img/logo.png', shortcut: '/img/logo.png', apple: '/img/logo.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face { font-family:'Cairo'; src:url('/fonts/cairo-arabic-400-normal.woff2') format('woff2'); font-weight:400; font-display:swap; }
          @font-face { font-family:'Cairo'; src:url('/fonts/cairo-arabic-600-normal.woff2') format('woff2'); font-weight:600; font-display:swap; }
          @font-face { font-family:'Cairo'; src:url('/fonts/cairo-arabic-700-normal.woff2') format('woff2'); font-weight:700; font-display:swap; }
          @font-face { font-family:'Cairo'; src:url('/fonts/cairo-arabic-900-normal.woff2') format('woff2'); font-weight:900; font-display:swap; }
          @font-face { font-family:'Cairo'; src:url('/fonts/cairo-latin-400-normal.woff2') format('woff2'); font-weight:400; font-display:swap; unicode-range:U+0020-007E; }
          @font-face { font-family:'Cairo'; src:url('/fonts/cairo-latin-700-normal.woff2') format('woff2'); font-weight:700; font-display:swap; unicode-range:U+0020-007E; }
          @font-face { font-family:'Amiri'; src:url('/fonts/amiri-arabic-400-normal.woff2') format('woff2'); font-weight:400; font-display:swap; }
          @font-face { font-family:'Amiri'; src:url('/fonts/amiri-arabic-700-normal.woff2') format('woff2'); font-weight:700; font-display:swap; }
          @font-face { font-family:'Amiri'; src:url('/fonts/amiri-latin-400-normal.woff2') format('woff2'); font-weight:400; font-display:swap; unicode-range:U+0020-007E; }
          :root { --font-body:'Cairo',Arial,sans-serif; --font-heading:'Amiri',Georgia,serif; }
          body { font-family:var(--font-body); }
          h1,h2,h3,h4,h5 { font-family:var(--font-heading); }
        `}} />
        {/* Theme CSS — fetched client-side to avoid build-time DB dependency */}
        <link rel="stylesheet" href="/api/theme/css?v=1" />
      </head>
      <body>
        {children}
        {/* Sparkles effect */}
        <script src="/vendor/sparkles.js" defer></script>
        {/* Live theme refresh every 30s */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var v='1';
            setInterval(function(){
              fetch('/api/settings?keys=theme_version')
                .then(function(r){return r.json();})
                .then(function(d){
                  var nv=d.theme_version||'1';
                  if(nv!==v){
                    v=nv;
                    var old=document.querySelector('link[href*="/api/theme/css"]');
                    var l=document.createElement('link');
                    l.rel='stylesheet';
                    l.href='/api/theme/css?v='+nv+'&t='+Date.now();
                    l.onload=function(){if(old)old.remove();};
                    document.head.appendChild(l);
                  }
                }).catch(function(){});
            },30000);
          })();
        `}} />
      </body>
    </html>
  );
}
