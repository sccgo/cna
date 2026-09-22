import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import NewsDetailClient from './NewsDetailClient';

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const news = await prisma.news.findFirst({
    where: { OR: [{ id: resolvedParams.id }, { slug: resolvedParams.id }], status: 'APPROVED' },
    select: { title: true, titleEn: true, shortDesc: true, mainImage: true },
  }).catch(() => null);
  if (!news) return { title: 'خبر غير موجود' };
  return {
    title: news.title,
    description: news.shortDesc || '',
    openGraph: { title: news.title, description: news.shortDesc || '', images: news.mainImage ? [news.mainImage] : [] },
  };
}

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await Promise.resolve(params);
  const news = await prisma.news.findFirst({
    where: { OR: [{ id: resolvedParams.id }, { slug: resolvedParams.id }], status: 'APPROVED' },
    include: {
      author: { select: { fullName: true, username: true } },
      department: true,
      poll: { include: { votes: { select: { optionIdx: true, userId: true } } } },
      counter: true,
    },
  }).catch(() => null);

  if (!news) notFound();

  const related = await prisma.news.findMany({
    where: { id: { not: news.id }, status: 'APPROVED', OR: [{ departmentId: news.departmentId ?? undefined }, { category: news.category }] },
    take: 4, orderBy: { publishedAt: 'desc' },
    select: { id: true, title: true, titleEn: true, mainImage: true, publishedAt: true, shortDesc: true, department: { select: { name: true } } },
  }).catch(() => []);

  // Increment views
  prisma.news.update({ where: { id: news.id }, data: { views: { increment: 1 } } }).catch(() => {});

  return (
    <NewsDetailClient
      news={JSON.parse(JSON.stringify(news))}
      related={JSON.parse(JSON.stringify(related))}
    />
  );
}
