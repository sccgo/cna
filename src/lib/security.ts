import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createHmac, randomBytes } from 'crypto';

// ─── HTML Sanitizer — zero external dependencies ──────────────────
// Runs server-side only, no ESM issues
export async function sanitizeHTML(dirty: string): Promise<string> {
  if (!dirty) return '';

  const ALLOWED_TAGS = new Set([
    'p','br','strong','b','em','i','u','s','strike',
    'h1','h2','h3','h4','h5','h6',
    'ul','ol','li','blockquote','pre','code',
    'a','img','figure','figcaption',
    'table','thead','tbody','tr','th','td',
    'audio','video','source',
    'div','span','sup','sub',
  ]);

  const ALLOWED_ATTRS: Record<string, string[]> = {
    '*':      ['class','id','style','dir'],
    'a':      ['href','target','rel'],
    'img':    ['src','alt','title','width','height'],
    'audio':  ['src','controls','preload'],
    'video':  ['src','controls','preload','width','height'],
    'source': ['src','type'],
    'td':     ['colspan','rowspan'],
    'th':     ['colspan','rowspan'],
  };

  // 1 — Strip dangerous tags with content
  let clean = dirty
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 2 — Remove disallowed tags (keep inner content)
  clean = clean.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tag) => {
    if (ALLOWED_TAGS.has(tag.toLowerCase())) {
      // Clean attributes on allowed tag
      return match
        .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s+on\w+\s*=\s*\S+/gi, '')
        .replace(/javascript\s*:/gi, 'blocked:');
    }
    return '';
  });

  return clean.trim();
}

export function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// ─── Rate Limiting ────────────────────────────────────────────────
interface RLEntry { count: number; resetAt: number; }
const store = new Map<string, RLEntry>();
export interface RateLimitResult { success: boolean; remaining: number; resetAt: number; }

export function rateLimit(key: string, max = 30, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: max - 1, resetAt };
  }
  if (entry.count >= max) return { success: false, remaining: 0, resetAt: entry.resetAt };
  entry.count++;
  return { success: true, remaining: max - entry.count, resetAt: entry.resetAt };
}
setInterval(() => { const now = Date.now(); store.forEach((v,k) => { if (now > v.resetAt) store.delete(k); }); }, 60_000);

export const rateLimitAuth     = (ip: string) => rateLimit(`auth:${ip}`,      10, 15*60_000);
export const rateLimitRegister = (ip: string) => rateLimit(`register:${ip}`,   5, 60*60_000);
export const rateLimitAPI      = (ip: string, ep: string) => rateLimit(`api:${ip}:${ep}`, 60, 60_000);

// ─── CSRF ──────────────────────────────────────────────────────────
const CSRF_SECRET = process.env.SESSION_SECRET ?? 'fallback-secret';
export function generateCSRFToken(): string {
  const nonce = randomBytes(16).toString('hex');
  const hmac  = createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex');
  return `${nonce}.${hmac}`;
}
export function verifyCSRFToken(token: string): boolean {
  if (!token?.includes('.')) return false;
  const [nonce, hmac] = token.split('.');
  const expected = createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex');
  if (hmac.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < hmac.length; i++) diff |= hmac.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// ─── Zod Schemas ──────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email:    z.string().email('بريد إلكتروني غير صالح').max(254).toLowerCase().trim(),
  username: z.string().min(3,'3 أحرف على الأقل').max(30).regex(/^[a-zA-Z0-9_\u0600-\u06FF]+$/,'رموز غير مسموح بها').trim(),
  password: z.string().min(8,'8 أحرف على الأقل').max(128).regex(/[A-Z]/,'حرف كبير مطلوب').regex(/[0-9]/,'رقم مطلوب'),
  fullName: z.string().min(2,'الاسم قصير').max(100).trim(),
});
export const LoginSchema = z.object({
  identifier: z.string().min(1).max(254).trim(),
  password:   z.string().min(1).max(128),
});
export const NewsCreateSchema = z.object({
  title:       z.string().min(3).max(500).trim(),
  titleEn:     z.string().max(500).optional().nullable(),
  shortDesc:   z.string().max(1000).optional().nullable(),
  shortDescEn: z.string().max(1000).optional().nullable(),
  content:     z.string().min(1),
  contentEn:   z.string().optional().nullable(),
  lang:        z.enum(['ar','en','both']).default('ar'),
  isBreaking:  z.boolean().default(false),
  breakingStyle:z.enum(['ticker','popup','bar']).default('ticker'),
  isFeatured:  z.boolean().default(false),
  isLive:      z.boolean().default(false),
  liveUrl:     z.string().url().optional().nullable(),
  category:    z.string().max(50).default('general'),
  departmentId:z.string().optional().nullable(),
  tags:        z.array(z.string().max(50)).max(10).default([]),
  source:      z.string().max(200).optional().nullable(),
  sourceUrl:   z.string().url().optional().nullable(),
  heroStyle:   z.object({ bgType: z.string(), bgValue: z.string().optional() }).optional(),
});

// ─── IP + Responses ───────────────────────────────────────────────
export function getClientIP(req: NextRequest): string {
  return req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}
export const apiError   = (msg: string, status = 400) => Response.json({ error: msg }, { status });
export const apiSuccess = (data: unknown, status = 200) => Response.json(data, { status });
export const tooManyRequests = () => Response.json({ error: 'طلبات كثيرة جداً' }, { status: 429, headers: { 'Retry-After': '60' } });
