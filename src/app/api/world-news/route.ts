import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess, rateLimit, getClientIP } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req);
  const rl = rateLimit(`worldnews:${ip}`, 20, 60_000);
  if (!rl.success) return apiError('طلبات كثيرة', 429);

  const apiKey = await prisma.setting.findUnique({ where: { key: 'newsapi_key' } }).then(r=>r?.value).catch(()=>'');
  if (!apiKey) return apiSuccess({ articles: [], error: 'no_key' });

  const sp = req.nextUrl.searchParams;
  const country  = sp.get('country')  || 'us';
  const category = sp.get('category') || 'general';

  // Validate inputs (prevent injection)
  const validCountries = ['ae','us','gb','de','fr','jp','cn','in','au','ca','ru','br','it','es','kr','za','ng','mx','ar','sa'];
  const validCats      = ['general','business','technology','sports','health','science','entertainment'];
  if (!validCountries.includes(country)) return apiError('دولة غير مدعومة');
  if (!validCats.includes(category))     return apiError('تصنيف غير مدعوم');

  try {
    const url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=15&apiKey=${apiKey}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CNA/2.0' },
      next: { revalidate: 300 }, // Cache 5 minutes
    });
    if (!res.ok) return apiError(`NewsAPI Error: ${res.status}`);
    const data = await res.json();
    return apiSuccess(data);
  } catch (e: any) {
    return apiError('فشل الاتصال بـ NewsAPI: ' + e.message, 500);
  }
}
