import { NextRequest } from 'next/server';
import { getThemeSettings, generateThemeCSS } from '@/lib/theme';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serve dynamic theme CSS — included in every page via <link>
// Version param for cache busting: /api/theme/css?v=123
export async function GET(req: NextRequest) {
  try {
    const settings = await getThemeSettings().catch(() => ({} as Record<string,string>));
    const css = generateThemeCSS(settings);

    // Logo override
    const logoPath = settings.logo_path || '/img/logo.png';

    // Font imports based on theme settings
    const fontBody = settings.theme_font_body || 'Cairo';
    const fontHeading = settings.theme_font_heading || 'Amiri';
    const fontImports = buildFontImports(fontBody, fontHeading);

    const fullCSS = `/* CNA Theme — auto-generated — ${new Date().toISOString()} */\n${fontImports}\n${css}`;

    return new Response(fullCSS, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        // No CDN caching — always fresh for theme changes
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=10',
        'Vary': 'Accept-Encoding',
      },
    });
  } catch (e) {
    console.error('[THEME CSS]', e);
    return new Response('/* theme error */', {
      headers: { 'Content-Type': 'text/css' },
    });
  }
}

function buildFontImports(body: string, heading: string): string {
  // Only load from local fonts/ dir (no external CDN — offline capable)
  // We'll use system font fallbacks and locally loaded fonts
  const fontFamilies = new Set([body, heading]);
  const imports: string[] = [];

  for (const font of fontFamilies) {
    if (font === 'Cairo') {
      imports.push(`
@font-face { font-family:'Cairo'; src:url('/fonts/cairo-arabic-400-normal.woff2') format('woff2'); font-weight:400; font-display:swap; }
@font-face { font-family:'Cairo'; src:url('/fonts/cairo-arabic-700-normal.woff2') format('woff2'); font-weight:700; font-display:swap; }
@font-face { font-family:'Cairo'; src:url('/fonts/cairo-arabic-900-normal.woff2') format('woff2'); font-weight:900; font-display:swap; }
      `);
    } else if (font === 'Amiri') {
      imports.push(`
@font-face { font-family:'Amiri'; src:url('/fonts/amiri-arabic-400-normal.woff2') format('woff2'); font-weight:400; font-display:swap; }
@font-face { font-family:'Amiri'; src:url('/fonts/amiri-arabic-700-normal.woff2') format('woff2'); font-weight:700; font-display:swap; }
      `);
    }
    // Other fonts fall back to system fonts
  }

  return imports.join('\n');
}
