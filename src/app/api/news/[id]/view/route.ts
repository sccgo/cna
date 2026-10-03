import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { rateLimit, getClientIP } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ip = getClientIP(req);
  // Rate limit: 1 view per IP per news per 10 minutes
  const rl = rateLimit(`view:${ip}:${params.id}`, 1, 10 * 60_000);
  if (!rl.success) return new Response(null, { status: 204 }); // Already counted

  try {
    await prisma.news.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    });
  } catch (_e) { /* news not found */ }

  return new Response(null, { status: 204 });
}
