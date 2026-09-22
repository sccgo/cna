import nodemailer from 'nodemailer';
import { prisma } from './db';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    pool: true,
    maxConnections: 5,
  });
  return transporter;
}

async function getSiteName() {
  try {
    const s = await prisma.setting.findUnique({ where: { key: 'site_name' } });
    return s?.value || 'وكالة الأنباء التنسيقية';
  } catch(_e) { return 'وكالة الأنباء التنسيقية'; }
}

const baseStyle = `
  font-family: Arial, sans-serif; direction: rtl; text-align: right;
  background: #f5f5f5; padding: 0; margin: 0;
`;
const boxStyle = `
  max-width: 520px; margin: 2rem auto; background: #fff;
  border: 2px solid #0a0a0a; padding: 2.5rem;
`;
const logoStyle = `
  font-family: Georgia, serif; font-size: 2rem; font-weight: 700;
  letter-spacing: .3em; color: #0a0a0a; display: block; text-align: center;
  margin-bottom: .5rem;
`;
const dividerStyle = `
  width: 40px; height: 3px; background: #0a0a0a;
  margin: .5rem auto 2rem; display: block;
`;
const btnStyle = `
  display: inline-block; padding: .9rem 2rem; background: #0a0a0a;
  color: #fff; text-decoration: none; font-weight: 700;
  margin: 1.5rem 0; font-size: 1rem;
`;
const footerStyle = `
  border-top: 1px solid #e5e5e5; margin-top: 2rem; padding-top: 1rem;
  font-size: .78rem; color: #a3a3a3; text-align: center;
`;

function buildEmail(title: string, body: string, siteName: string): string {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"></head>
<body style="${baseStyle}">
  <div style="${boxStyle}">
    <span style="${logoStyle}">CNA</span>
    <span style="${dividerStyle}"></span>
    <h2 style="font-size:1.3rem;margin-bottom:1rem;color:#0a0a0a">${title}</h2>
    ${body}
    <div style="${footerStyle}">
      ${siteName} — هذا البريد تلقائي، لا ترد عليه
    </div>
  </div>
</body></html>`;
}

// Email verification
export async function sendVerificationEmail(email: string, fullName: string, token: string) {
  const siteName = await getSiteName();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const verifyUrl = `${siteUrl}/verify?token=${token}`;
  const body = `
    <p style="margin-bottom:1rem">مرحباً <strong>${fullName}</strong>،</p>
    <p>شكراً لتسجيلك في ${siteName}. يرجى تأكيد بريدك الإلكتروني بالنقر على الزر أدناه:</p>
    <center><a href="${verifyUrl}" style="${btnStyle}">تأكيد البريد الإلكتروني</a></center>
    <p style="font-size:.85rem;color:#737373">أو انسخ هذا الرابط:<br><code style="word-break:break-all">${verifyUrl}</code></p>
    <p style="font-size:.82rem;color:#a3a3a3">الرابط صالح لمدة 24 ساعة. إذا لم تطلب هذا التسجيل، تجاهل هذا البريد.</p>
  `;
  return sendMail(email, `تأكيد البريد الإلكتروني — ${siteName}`, buildEmail('تأكيد البريد الإلكتروني', body, siteName));
}

// Account approved
export async function sendApprovalEmail(email: string, fullName: string) {
  const siteName = await getSiteName();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const body = `
    <p>مرحباً <strong>${fullName}</strong>،</p>
    <p>يسعدنا إخبارك بأن طلب انضمامك إلى <strong>${siteName}</strong> قد تمت <strong>الموافقة عليه</strong>.</p>
    <p>يمكنك الآن تسجيل الدخول والاستمتاع بجميع مزايا العضوية.</p>
    <center><a href="${siteUrl}/login" style="${btnStyle}">تسجيل الدخول</a></center>
  `;
  return sendMail(email, `تمت الموافقة على طلبك — ${siteName}`, buildEmail('مرحباً بك في الوكالة', body, siteName));
}

// Account rejected
export async function sendRejectionEmail(email: string, fullName: string, note?: string) {
  const siteName = await getSiteName();
  const body = `
    <p>مرحباً <strong>${fullName}</strong>،</p>
    <p>نأسف لإخبارك بأن طلب انضمامك إلى <strong>${siteName}</strong> قد تم <strong>رفضه</strong>.</p>
    ${note ? `<p><strong>السبب:</strong> ${note}</p>` : ''}
    <p style="font-size:.85rem;color:#737373">إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع إدارة الوكالة.</p>
  `;
  return sendMail(email, `حول طلب انضمامك — ${siteName}`, buildEmail('بشأن طلب الانضمام', body, siteName));
}

// Pending approval notification to admissions
export async function sendNewRegistrationAlert(newUserName: string, newUserEmail: string) {
  const siteName = await getSiteName();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  // Get admissions emails
  const admissions = await prisma.user.findMany({
    where: { role: 'ADMISSIONS', status: 'APPROVED' },
    select: { email: true },
  });
  if (!admissions.length) return;
  const body = `
    <p>تم استلام طلب انضمام جديد:</p>
    <ul style="margin:1rem 0;padding-right:1.5rem">
      <li><strong>الاسم:</strong> ${newUserName}</li>
      <li><strong>البريد:</strong> ${newUserEmail}</li>
    </ul>
    <center><a href="${siteUrl}/admin/users?tab=pending" style="${btnStyle}">مراجعة الطلب</a></center>
  `;
  const emails = admissions.map(a => a.email);
  return sendMail(emails, `طلب انضمام جديد — ${siteName}`, buildEmail('طلب انضمام جديد', body, siteName));
}

// Password reset
export async function sendPasswordResetEmail(email: string, fullName: string, token: string) {
  const siteName = await getSiteName();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;
  const body = `
    <p>مرحباً <strong>${fullName}</strong>،</p>
    <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك.</p>
    <center><a href="${resetUrl}" style="${btnStyle}">إعادة تعيين كلمة المرور</a></center>
    <p style="font-size:.82rem;color:#a3a3a3">الرابط صالح لمدة ساعة واحدة. إذا لم تطلب ذلك، تجاهل هذا البريد.</p>
  `;
  return sendMail(email, `إعادة تعيين كلمة المرور — ${siteName}`, buildEmail('إعادة تعيين كلمة المرور', body, siteName));
}

// Design review notification
export async function sendDesignReviewAlert(developerName: string, designTitle: string) {
  const siteName = await getSiteName();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const directors = await prisma.user.findMany({
    where: { role: 'DIRECTOR', status: 'APPROVED' },
    select: { email: true },
  });
  if (!directors.length) return;
  const body = `
    <p>تم تقديم تعديل تصميم جديد من <strong>${developerName}</strong>:</p>
    <p><strong>العنوان:</strong> ${designTitle}</p>
    <center><a href="${siteUrl}/admin/settings?tab=design-review" style="${btnStyle}">مراجعة التعديل</a></center>
  `;
  return sendMail(directors.map(d => d.email), `تعديل تصميم جديد — ${siteName}`, buildEmail('تعديل تصميم بانتظار المراجعة', body, siteName));
}

// Content review
export async function sendContentReviewAlert(newsTitle: string, newsId: string) {
  const siteName = await getSiteName();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const reviewers = await prisma.user.findMany({
    where: { role: { in: ['REVIEWER', 'EDITOR_IN_CHIEF', 'DIRECTOR'] }, status: 'APPROVED' },
    select: { email: true },
  });
  if (!reviewers.length) return;
  const body = `
    <p>مقال جديد بانتظار المراجعة:</p>
    <p><strong>${newsTitle}</strong></p>
    <center><a href="${siteUrl}/admin/review/${newsId}" style="${btnStyle}">مراجعة المقال</a></center>
  `;
  return sendMail(reviewers.map(r => r.email), `مقال بانتظار المراجعة — ${siteName}`, buildEmail('محتوى بانتظار المراجعة', body, siteName));
}

// Core send function
async function sendMail(to: string | string[], subject: string, html: string) {
  const transport = getTransporter();
  const fromName = process.env.EMAIL_FROM_NAME || 'وكالة الأنباء التنسيقية';
  const fromEmail = process.env.EMAIL_FROM || 'noreply@cna.gov';
  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
    });
  } catch (e) {
    console.error('[EMAIL ERROR]', e);
    // Don't throw — email failure shouldn't break the flow
  }
}
