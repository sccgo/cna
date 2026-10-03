// شهور العز: سبتمبر — فبراير
const EZZ_MONTHS = new Set([9, 10, 11, 12, 1, 2]); // month numbers

export const MONTHS_AR = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export function getMonthName(monthNum: number): string {
  const base = MONTHS_AR[monthNum] || '';
  return EZZ_MONTHS.has(monthNum) ? base + ' العز' : base;
}

export function dateAr(d: string | Date): string {
  const dt = new Date(d);
  const day   = dt.getDate();
  const month = getMonthName(dt.getMonth() + 1);
  const year  = dt.getFullYear();
  return `${day} ${month} ${year}`;
}

export function dateTimeAr(d: string | Date): string {
  const dt = new Date(d);
  const h = String(dt.getHours()).padStart(2,'0');
  const m = String(dt.getMinutes()).padStart(2,'0');
  return `${dateAr(dt)} — ${h}:${m}`;
}

export function timeAgo(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'الآن';
  if (min < 60) return `منذ ${min} دقيقة`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return dateAr(d);
}
