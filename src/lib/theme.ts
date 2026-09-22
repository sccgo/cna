import { prisma } from './db';

export type ThemeSettings = Record<string, string>;

// Fetch all theme settings from DB
export async function getThemeSettings(): Promise<ThemeSettings> {
  try {
    const rows = await prisma.setting.findMany();
    const settings: ThemeSettings = {};
    for (const row of rows) settings[row.key] = row.value;
    return settings;
  } catch(_e) { return {}; }
}

// Generate complete CSS from theme settings
export function generateThemeCSS(s: ThemeSettings): string {
  const rules: string[] = [];

  // ── Body font ───────────────────────────────────────────────
  const fontBody    = s.theme_font_body    || 'Cairo';
  const fontHeading = s.theme_font_heading || 'Amiri';
  rules.push(`
    :root {
      --font-body: '${fontBody}', 'Cairo', Arial, sans-serif;
      --font-heading: '${fontHeading}', 'Amiri', Georgia, serif;
    }
    body { font-family: var(--font-body) !important; }
    h1,h2,h3,h4,h5 { font-family: var(--font-heading) !important; }
  `);

  // ── Site background ─────────────────────────────────────────
  const siteBg = resolveBackground(s.theme_site_bg_type, s.theme_site_bg_value);
  if (siteBg) rules.push(`body { background: ${siteBg} !important; }`);

  // ── Header ──────────────────────────────────────────────────
  const headerBg = resolveBackground(s.theme_header_bg_type, s.theme_header_bg_value);
  if (headerBg) rules.push(`.site-header { background: ${headerBg} !important; }`);

  // ── Nav bar ─────────────────────────────────────────────────
  const navBg = resolveBackground(s.theme_nav_bg_type, s.theme_nav_bg_value);
  if (navBg) rules.push(`.nav-bar { background: ${navBg} !important; }`);

  // ── Footer ──────────────────────────────────────────────────
  const footerBg = resolveBackground(s.theme_footer_bg_type, s.theme_footer_bg_value);
  if (footerBg) rules.push(`.site-footer { background: ${footerBg} !important; }`);

  // ── Cards ───────────────────────────────────────────────────
  if (s.theme_card_bg) rules.push(`.news-card, .world-card { background: ${s.theme_card_bg} !important; }`);
  if (s.theme_card_border) rules.push(`.news-card, .world-card, .news-grid { border-color: ${s.theme_card_border} !important; }`);

  // ── Accent color ────────────────────────────────────────────
  if (s.theme_accent_color) {
    const ac = s.theme_accent_color;
    rules.push(`
      .btn-primary                       { background:${ac}!important; border-color:${ac}!important; }
      .breaking-badge, .live-badge       { background:${ac}!important; }
      .news-section-header               { border-bottom-color:${ac}!important; }
      .sidebar-widget-title              { border-bottom-color:${ac}!important; }
      .nav-link.active, .nav-link:hover  { border-bottom-color:${ac}!important; }
      .page-btn.active                   { background:${ac}!important; border-color:${ac}!important; }
      .filter-chip.active                { background:${ac}!important; border-color:${ac}!important; }
      .form-control:focus                { border-color:${ac}!important; }
      .detail-desc                       { border-right-color:${ac}!important; }
      .poll-bar-fill                     { background:${ac}!important; }
    `);
  }

  // ── Text colors ─────────────────────────────────────────────
  if (s.theme_text_primary) {
    const tp = s.theme_text_primary;
    rules.push(`body,h1,h2,h3,h4,h5,.news-card-title,.detail-title,.hero-title { color:${tp}!important; }`);
  }
  if (s.theme_text_secondary) {
    const ts = s.theme_text_secondary;
    rules.push(`p,.news-card-desc,.news-card-footer,.hero-desc,.detail-meta { color:${ts}!important; }`);
  }

  // ── Buttons ─────────────────────────────────────────────────
  if (s.theme_btn_bg) {
    const bg  = s.theme_btn_bg;
    const txt = s.theme_btn_text || '#fff';
    const bdr = s.theme_btn_border || bg;
    rules.push(`.btn-primary { background:${bg}!important; color:${txt}!important; border-color:${bdr}!important; }`);
  }
  if (s.theme_btn_hover_bg) {
    const hbg  = s.theme_btn_hover_bg;
    const htxt = s.theme_btn_hover_text || '#fff';
    rules.push(`.btn:not(.btn-ghost):hover { background:${hbg}!important; color:${htxt}!important; border-color:${hbg}!important; }`);
  }

  // ── Hero featured card ──────────────────────────────────────
  const heroBg = s.theme_hero_panel_gradient || s.theme_hero_panel_bg;
  if (heroBg) rules.push(`.hero-info { background:${heroBg}!important; }`);
  if (s.theme_hero_title_color) rules.push(`.hero-title { color:${s.theme_hero_title_color}!important; }`);
  if (s.theme_hero_desc_color) rules.push(`.hero-desc,.hero-meta { color:${s.theme_hero_desc_color}!important; }`);
  if (s.theme_hero_badge_bg) rules.push(`.hero-badge { background:${s.theme_hero_badge_bg}!important; color:${s.theme_hero_badge_text||'#fff'}!important; }`);

  // ── Card title color ────────────────────────────────────────
  if (s.theme_card_title_color) rules.push(`.news-card-title { color:${s.theme_card_title_color}!important; }`);

  // ── Nav link color ──────────────────────────────────────────
  if (s.theme_nav_link_color) rules.push(`.nav-link { color:${s.theme_nav_link_color}!important; }`);

  // ── Read more button ────────────────────────────────────────
  if (s.theme_readmore_bg) {
    rules.push(`.hero-read-btn { background:${s.theme_readmore_bg}!important; color:${s.theme_readmore_text||'#fff'}!important; border-color:${s.theme_readmore_border||s.theme_readmore_bg}!important; }`);
  }

  // ── Breaking ticker ─────────────────────────────────────────
  if (s.ticker_bg) rules.push(`.breaking-ticker { background:${s.ticker_bg}!important; }`);
  if (s.ticker_text_color) rules.push(`.breaking-ticker .ticker-item { color:${s.ticker_text_color}!important; }`);

  return rules.join('\n');
}

function resolveBackground(type?: string, value?: string): string | null {
  if (!type || type === 'default' || !value) return null;
  if (type === 'image') return `url('${value}') center/cover fixed no-repeat`;
  return value; // color or gradient
}

// Get the current theme version (used for cache busting)
export async function getThemeVersion(): Promise<string> {
  try {
    const v = await prisma.setting.findUnique({ where: { key: 'theme_version' } });
    return v?.value || '1';
  } catch(_e) { return '1'; }
}

// Increment theme version to invalidate caches
export async function bumpThemeVersion(): Promise<void> {
  const current = await getThemeVersion();
  const next = String(parseInt(current || '1') + 1);
  await prisma.setting.upsert({
    where: { key: 'theme_version' },
    update: { value: next },
    create: { key: 'theme_version', value: next },
  });
}
