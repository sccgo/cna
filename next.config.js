/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Disable telemetry
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },

  // TypeScript — don't fail build on type errors
  typescript: { ignoreBuildErrors: true },
  eslint:     { ignoreDuringBuilds: true },

  // Next.js 15: serverExternalPackages (moved out of experimental)
  serverExternalPackages: ['bcryptjs', 'nodemailer', 'sanitize-html', '@prisma/client'],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https:",
              "connect-src 'self' https://newsapi.org https://*.vercel-storage.com",
              "frame-src 'self' https://www.youtube.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
      {
        source: '/fonts/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/vendor/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel-storage.com' },
      { protocol: 'https', hostname: '**.public.blob.vercel-storage.com' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' },
    ],
  },

  async redirects() {
    return [
      { source: '/dashboard', destination: '/admin', permanent: true },
    ];
  },
};

module.exports = nextConfig;
