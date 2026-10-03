import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess, rateLimit, getClientIP } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user || !can(user.role, 'news:create')) return apiError('غير مصرح', 401);

  const ip = getClientIP(req);
  const rl = rateLimit(`translate:${ip}`, 20, 60_000);
  if (!rl.success) return apiError('طلبات ترجمة كثيرة', 429);

  const body = await req.json().catch(() => null);
  if (!body?.text) return apiError('النص مطلوب');

  const { text, from = 'ar', to = 'en' } = body;
  if (!text.trim()) return apiError('النص فارغ');

  const systemPrompt = from === 'ar'
    ? `You are a professional Arabic-to-English news translator for an official Arabic government news agency.
Translate the given Arabic text to natural, fluent journalistic English.
Rules:
- Produce natural English — NOT word-for-word literal translation
- Preserve proper nouns, names, official titles
- Maintain formal news agency tone
- If input contains HTML tags, preserve the HTML structure and only translate text content
- Output ONLY the translated text, no explanations or notes`
    : `أنت مترجم صحفي محترف من الإنجليزية للعربية لوكالة أنباء رسمية.
ترجم النص الإنجليزي إلى عربية فصحى صحفية رسمية.
قواعد:
- ترجمة طبيعية وسلسة وليست حرفية
- الحفاظ على الأسماء العلم والألقاب الرسمية
- الحفاظ على هيكل HTML إن وُجد وترجمة النصوص فقط
- اكتب الترجمة فقط بدون أي شرح`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return apiError('فشل الترجمة: ' + (err.error?.message || response.status), 500);
    }

    const data = await response.json();
    const translated = data.content?.[0]?.text?.trim() || '';
    if (!translated) return apiError('لم تُرجع الترجمة نتيجة');

    return apiSuccess({ translated, from, to });
  } catch (e: any) {
    return apiError('خطأ في الترجمة: ' + e.message, 500);
  }
}
