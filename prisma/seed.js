const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Default settings
  const defaultSettings = [
    // General
    ['site_name', 'وكالة الأنباء التنسيقية'],
    ['site_name_en', 'CNA'],
    ['site_tagline', 'المصدر الرسمي للأنباء'],
    ['logo_path', '/img/logo.png'],
    ['favicon_path', '/img/logo.png'],
    ['registration_enabled', '1'],
    // Theme
    ['theme_font_body', 'Cairo'],
    ['theme_font_heading', 'Amiri'],
    ['theme_site_bg_type', 'default'],
    ['theme_site_bg_value', ''],
    ['theme_header_bg_type', 'default'],
    ['theme_header_bg_value', ''],
    ['theme_nav_bg_type', 'default'],
    ['theme_nav_bg_value', ''],
    ['theme_footer_bg_type', 'default'],
    ['theme_footer_bg_value', ''],
    ['theme_accent_color', '#0a0a0a'],
    ['theme_card_bg', ''],
    ['theme_card_border', ''],
    ['theme_text_primary', ''],
    ['theme_text_secondary', ''],
    ['theme_btn_bg', ''],
    ['theme_btn_text', ''],
    ['theme_btn_hover_bg', ''],
    ['theme_hero_panel_bg', ''],
    ['theme_hero_panel_gradient', ''],
    ['theme_hero_title_color', ''],
    ['theme_hero_desc_color', ''],
    ['theme_hero_badge_bg', ''],
    ['theme_hero_badge_text', ''],
    ['theme_version', '1'], // Increment to force browser refresh
    // Ticker
    ['ticker_speed', '40'],
    ['ticker_bg', '#000000'],
    ['ticker_text_color', '#ffffff'],
    // NewsAPI
    ['newsapi_key', ''],
    ['newsapi_country', 'us'],
    ['newsapi_category', 'general'],
    ['show_world_news', '0'],
    // Breaking
    ['breaking_popup_enabled', '0'],
    // Election
    ['election_active_id', ''],
    // Email
    ['email_host', ''],
    ['email_port', '587'],
    ['email_user', ''],
    ['email_pass', ''],
    ['email_from', 'noreply@cna.gov'],
    ['email_from_name', 'وكالة الأنباء التنسيقية'],
    // Newspaper
    ['newspaper_auto_generate', '0'],
  ];

  for (const [key, value] of defaultSettings) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  // Default departments
  const departments = [
    { name: 'الشؤون المحلية', nameEn: 'Local Affairs', slug: 'local', color: '#0a0a0a', order: 1 },
    { name: 'الشؤون الدولية', nameEn: 'International', slug: 'international', color: '#1a3a6b', order: 2 },
    { name: 'الاقتصاد والمال', nameEn: 'Economy', slug: 'economy', color: '#1a5c2a', order: 3 },
    { name: 'الشؤون الأمنية', nameEn: 'Security', slug: 'security', color: '#5c1a1a', order: 4 },
    { name: 'الشؤون السياسية', nameEn: 'Politics', slug: 'politics', color: '#4a1a5c', order: 5 },
    { name: 'الثقافة والمجتمع', nameEn: 'Culture', slug: 'culture', color: '#5c4a1a', order: 6 },
    { name: 'الرياضة', nameEn: 'Sports', slug: 'sports', color: '#1a4a5c', order: 7 },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { slug: dept.slug },
      update: {},
      create: dept,
    });
  }

  // Director admin account
  const existingDir = await prisma.user.findUnique({ where: { username: 'director' } });
  if (!existingDir) {
    await prisma.user.create({
      data: {
        email: 'director@cna.gov',
        username: 'director',
        password: await bcrypt.hash('CNA@Director2025', 10),
        fullName: 'مدير الوكالة',
        role: 'DIRECTOR',
        status: 'APPROVED',
        emailVerified: true,
      },
    });
    console.log('✓ Director account: director / CNA@Director2025');
  }

  // Admissions account
  const existingAdm = await prisma.user.findUnique({ where: { username: 'admissions' } });
  if (!existingAdm) {
    await prisma.user.create({
      data: {
        email: 'admissions@cna.gov',
        username: 'admissions',
        password: await bcrypt.hash('CNA@Admissions2025', 10),
        fullName: 'عمادة القبول',
        role: 'ADMISSIONS',
        status: 'APPROVED',
        emailVerified: true,
      },
    });
    console.log('✓ Admissions account: admissions / CNA@Admissions2025');
  }

  // Sample news
  const localDept = await prisma.department.findUnique({ where: { slug: 'local' } });
  const dirUser = await prisma.user.findUnique({ where: { username: 'director' } });
  const existingNews = await prisma.news.count();
  
  if (existingNews === 0 && localDept && dirUser) {
    await prisma.news.create({
      data: {
        title: 'مرحباً بكم في وكالة الأنباء التنسيقية',
        titleEn: 'Welcome to the Coordinating News Agency',
        slug: 'welcome-cna-' + Date.now(),
        shortDesc: 'الخبر التجريبي الأول لوكالة الأنباء التنسيقية الرسمية',
        shortDescEn: 'First demo news of the official CNA',
        content: '<p>مرحباً بكم في وكالة الأنباء التنسيقية. نقدم لكم أحدث الأخبار والتقارير بدقة واحترافية عالية.</p>',
        contentEn: '<p>Welcome to the Coordinating News Agency. We deliver the latest news with accuracy and professionalism.</p>',
        lang: 'both',
        isBreaking: true,
        isFeatured: true,
        status: 'APPROVED',
        category: 'general',
        authorId: dirUser.id,
        departmentId: localDept.id,
        publishedAt: new Date(),
      },
    });
  }

  console.log('✅ Database seeded successfully');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
