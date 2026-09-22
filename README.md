# وكالة الأنباء التنسيقية (CNA)
## Coordinating News Agency — Production v2.0

---

## النشر على Vercel (5 خطوات)

### 1. قاعدة البيانات
- افتح [vercel.com/dashboard](https://vercel.com/dashboard)
- Storage → Create → Postgres
- انسخ متغيرات البيئة تلقائياً للمشروع

### 2. رفع الملفات للـ GitHub
```bash
git init
git add .
git commit -m "CNA v2.0"
git push origin main
```

### 3. نشر على Vercel
```bash
npm i -g vercel
vercel --prod
```

### 4. متغيرات البيئة (Vercel Dashboard → Settings → Environment Variables)
```
POSTGRES_PRISMA_URL       = [من Vercel Postgres]
POSTGRES_URL_NON_POOLING  = [من Vercel Postgres]
SESSION_SECRET            = [64 حرف عشوائي - openssl rand -base64 48]
BLOB_READ_WRITE_TOKEN     = [من Vercel Blob]
SMTP_HOST                 = smtp.resend.com
SMTP_PORT                 = 587
SMTP_USER                 = resend
SMTP_PASS                 = [مفتاح Resend]
EMAIL_FROM                = noreply@yourdomain.com
NEWSAPI_KEY               = [اختياري - من newsapi.org]
NEXT_PUBLIC_SITE_URL      = https://your-site.vercel.app
```

### 5. تهيئة قاعدة البيانات
```bash
vercel env pull .env.local
npx prisma db push
node prisma/seed.js
```

---

## حسابات الدخول الافتراضية

| الحساب | اسم المستخدم | كلمة المرور | الصلاحيات |
|---------|-------------|-------------|-----------|
| رئيس الوكالة | `director` | `CNA@Director2025` | كاملة |
| عمادة القبول | `admissions` | `CNA@Admissions2025` | قبول/رفض الأعضاء |

> **⚠️ غيّر كلمات المرور فوراً بعد أول دخول**

---

## الأدوار السبعة

| الدور | الصلاحيات |
|-------|-----------|
| زائر (VIEWER) | تصفح + تصويت |
| محرر (EDITOR) | إنشاء وتعديل أخباره (تحتاج مراجعة) |
| مراجع (REVIEWER) | قبول/رفض المحتوى |
| مبرمج (DEVELOPER) | تعديل التصميم (تحتاج موافقة المدير) |
| رئيس التحرير (EDITOR_IN_CHIEF) | صلاحية كاملة على المحتوى والمحررين |
| عمادة القبول (ADMISSIONS) | قبول/رفض المستخدمين الجدد |
| رئيس الوكالة (DIRECTOR) | كل الصلاحيات |

---

## نظام التصميم

- **من لوحة الإدارة**: الإعدادات والتصميم
- يمكن تغيير: الخطوط، الألوان، الخلفيات (لون/تدرج/صورة)، ألوان الأزرار، الخبر المميز
- التغييرات تُطبق **فوراً** على الموقع لجميع الزوار
- المبرمج يقدم التعديل → المدير يوافق → يُطبق فوراً

---

## الخصائص الرئيسية

- ✅ نظام مصادقة كامل (تسجيل + تحقق البريد + موافقة الإدارة)
- ✅ محرر نصوص Quill (عربي/إنجليزي، صور، صوتيات، مقاطع)
- ✅ شريط أخبار عاجلة متحرك + نافذة منبثقة
- ✅ استيراد أخبار من أي موقع (Web Scraper)
- ✅ أخبار عالمية من NewsAPI
- ✅ انتخابات تفاعلية (محلية + خريطة أمريكا التفاعلية)
- ✅ نظام جرائد (16 صفحة، توليد تلقائي، عرض + PDF)
- ✅ استطلاعات رأي للمسجلين
- ✅ عداد وقت مخصص (خط/ألوان/تدرج)
- ✅ دعم ثنائية اللغة (عربي/إنجليزي)
- ✅ تحليلات حقيقية (مشاهدات/مستخدمين/نشاط)
- ✅ رفع الملفات عبر Vercel Blob
- ✅ نظام إشعارات + سجل نشاط

---

## الأمان

- bcrypt cost 12
- Iron Session (encrypted, httpOnly, secure)
- Rate limiting على جميع endpoints
- CSRF protection
- HTML Sanitization (DOMPurify)
- Zod validation
- CSP, HSTS, X-Frame-Options headers
- SSRF prevention في الـ scraper
- Role-based access control (server-side)
