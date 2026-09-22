import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess, rateLimit, getClientIP } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'news:create')) return apiError('غير مصرح', 403);

  const ip = getClientIP(req);
  const rl = rateLimit(`scrape:${ip}`, 10, 60_000);
  if (!rl.success) return apiError('طلبات كثيرة', 429);

  const targetUrl = req.nextUrl.searchParams.get('url');
  if (!targetUrl) return apiError('URL مطلوب');

  let parsed: URL;
  try { parsed = new URL(targetUrl); } catch(_e) { return apiError('رابط غير صالح'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) return apiError('بروتوكول غير مدعوم');

  // Block internal URLs
  const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
  if (blockedHosts.some(h => parsed.hostname.includes(h))) return apiError('رابط غير مسموح');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CNABot/2.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) return apiError(`فشل الاتصال: ${response.status}`);

    const html = await response.text();
    const article = extractArticle(html, targetUrl);
    return apiSuccess(article);
  } catch (e: any) {
    if (e.name === 'AbortError') return apiError('انتهت مهلة الاتصال');
    return apiError('فشل استيراد المقال: ' + e.message);
  }
}

function extractArticle(html: string, sourceUrl: string) {
  const g = (p: RegExp) => { const m = html.match(p); return m ? (m[1] || m[2] || '').trim() : ''; };
  const decode = (s: string) => s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ');

  const title = decode(
    g(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,500})["']/i) ||
    g(/<meta[^>]+content=["']([^"']{1,500})["'][^>]+property=["']og:title["']/i) ||
    g(/<title[^>]*>([^<]{1,300})<\/title>/i)
  );

  const description = decode(
    g(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,1000})["']/i) ||
    g(/<meta[^>]+content=["']([^"']{1,1000})["'][^>]+name=["']description["']/i) || ''
  );

  const image =
    g(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    g(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

  const author = decode(
    g(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']{1,200})["']/i) ||
    g(/<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']{1,200})["']/i) || ''
  );

  const publishDate =
    g(/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i) ||
    g(/<time[^>]+datetime=["']([^"']+)["']/i) ||
    g(/"datePublished"\s*:\s*"([^"]+)"/i);

  const siteName = decode(
    g(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']{1,200})["']/i) ||
    new URL(sourceUrl).hostname.replace('www.', '')
  );

  // Extract article body
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  let content = '';
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]+class=["'][^"']*(?:article[-_]body|article[-_]content|story[-_]body|post[-_]content|entry[-_]content|content[-_]body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const pat of contentPatterns) {
    const m = body.match(pat);
    if (m && m[1] && m[1].length > 200) { content = m[1]; break; }
  }

  if (!content) {
    const ps = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
    content = ps.map(m => `<p>${m[1]}</p>`).join('\n');
  }

  // Fix relative URLs in content
  const base = new URL(sourceUrl);
  content = content
    .replace(/(<img[^>]+src=["'])(?!https?:\/\/|data:)([^"']+)["']/gi, (m, pre, src) => {
      try { return pre + new URL(src, base).href + '"'; } catch(_e) { return m; }
    })
    .replace(/(<a[^>]+href=["'])(?!https?:\/\/|#|mailto:)([^"']+)["']/gi, (m, pre, href) => {
      try { return pre + new URL(href, base).href + '"'; } catch(_e) { return m; }
    });

  // Extract all images from content
  const allImages = [...new Set([
    image,
    ...[...content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]),
  ].filter(Boolean))].slice(0, 12);

  return { title, description, image, author, publishDate, siteName, sourceUrl, content, images: allImages };
}
