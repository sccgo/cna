import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { can } from '@/lib/permissions';
import { apiError, apiSuccess } from '@/lib/security';
import { bumpThemeVersion } from '@/lib/theme';
import { sendDesignReviewAlert } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/settings — public (read theme keys only) or full (director)
export async function GET(req: NextRequest) {
  const session = await getSession();
  const user = session.user;

  const rows = await prisma.setting.findMany();
  const all: Record<string, string> = {};
  rows.forEach(r => { all[r.key] = r.value; });

  // Non-admin: only expose public keys
  if (!user || !can(user.role, 'settings:read')) {
    const PUBLIC_KEYS = ['site_name','site_name_en','site_tagline','logo_path','favicon_path',
      'ticker_bg','ticker_text_color','ticker_speed','theme_version',
      'show_world_news','registration_enabled','breaking_popup_enabled',
      'election_active_id','newspaper_auto_generate',
      ...Object.keys(all).filter(k => k.startsWith('theme_')),
    ];
    const pub: Record<string,string> = {};
    PUBLIC_KEYS.forEach(k => { if (all[k] !== undefined) pub[k] = all[k]; });
    return apiSuccess(pub);
  }

  return apiSuccess(all);
}

// PUT /api/settings — update settings
export async function PUT(req: NextRequest) {
  const session = await getSession();
  const user = session.user;
  if (!user) return apiError('غير مصرح', 401);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return apiError('بيانات غير صالحة');

  const updates = body as Record<string, string>;
  const isThemeUpdate = Object.keys(updates).some(k => k.startsWith('theme_'));
  const isSystemUpdate = Object.keys(updates).some(k =>
    ['site_name','site_name_en','email_host','email_pass','newsapi_key'].includes(k)
  );

  // Theme settings — developer submits for review, director applies directly
  if (isThemeUpdate && !can(user.role, 'settings:write')) {
    if (!can(user.role, 'design:submit')) return apiError('ليس لديك صلاحية', 403);

    // Developer: create a design change request
    const title = (updates._design_title as string) || 'تعديل تصميم';
    const description = (updates._design_description as string) || '';
    delete updates._design_title;
    delete updates._design_description;

    const change = await prisma.designChange.create({
      data: {
        title,
        description,
        settings: updates,
        status: 'PENDING',
        submittedBy: user.id,
      },
    });

    await sendDesignReviewAlert(user.fullName, title).catch(console.error);
    return apiSuccess({ submitted: true, changeId: change.id, message: 'تم تقديم التعديل للمراجعة' });
  }

  // System settings — director only
  if (isSystemUpdate && !can(user.role, 'settings:write')) {
    return apiError('ليس لديك صلاحية تعديل إعدادات النظام', 403);
  }

  // Director: apply directly
  if (!can(user.role, 'settings:write') && !can(user.role, 'settings:theme')) {
    return apiError('ليس لديك صلاحية', 403);
  }

  const stmt = Object.entries(updates)
    .filter(([k]) => !k.startsWith('_'))
    .map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value), updatedBy: user.id },
        create: { key, value: String(value), updatedBy: user.id },
      })
    );
  await Promise.all(stmt);

  // Bump theme version so clients get fresh CSS
  if (isThemeUpdate) await bumpThemeVersion();

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'SETTINGS_UPDATE', details: { keys: Object.keys(updates) } },
  }).catch(() => {});

  return apiSuccess({ saved: true });
}

// POST /api/settings/design-review — Director approves/rejects design change
// (separate endpoint)
