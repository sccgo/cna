import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { uploadImage, uploadMedia, uploadLogo, uploadBgImage, getFile } from '@/lib/upload';
import { apiError, apiSuccess, rateLimit, getClientIP } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('غير مصرح', 401);
  if (!can(user.role, 'news:create') && !can(user.role, 'settings:theme')) {
    return apiError('ليس لديك صلاحية الرفع', 403);
  }

  const ip = getClientIP(req);
  const rl = rateLimit(`upload:${ip}`, 30, 60_000);
  if (!rl.success) return apiError('طلبات رفع كثيرة', 429);

  let fd: FormData;
  try { fd = await req.formData(); } catch(_e) { return apiError('بيانات غير صالحة'); }

  const type = fd.get('type') as string || 'image';
  const file = getFile(fd, 'file') || getFile(fd, 'media') || getFile(fd, 'logo') || getFile(fd, 'bg');
  if (!file) return apiError('لم يتم رفع أي ملف');

  try {
    switch (type) {
      case 'logo':
        if (!can(user.role, 'settings:write') && !can(user.role, 'settings:theme')) {
          return apiError('غير مصرح برفع الشعار', 403);
        }
        const logoResult = await uploadLogo(file);
        return apiSuccess({ url: logoResult.url, type: 'logo' });

      case 'bg':
        const bgResult = await uploadBgImage(file);
        return apiSuccess({ url: bgResult.url, type: 'bg' });

      case 'media':
        const mediaResult = await uploadMedia(file);
        return apiSuccess({ url: mediaResult.url, kind: mediaResult.kind, type: 'media' });

      case 'image':
      default:
        const folder = fd.get('folder') as string || 'news';
        const imgResult = await uploadImage(file, folder);
        return apiSuccess({ url: imgResult.url, type: 'image' });
    }
  } catch (e: any) {
    return apiError(e.message || 'فشل الرفع', 500);
  }
}
