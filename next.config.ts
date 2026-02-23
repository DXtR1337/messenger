import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        // Cache static assets (photos, icons, fonts) for 1 year
        source: '/:path*(jpg|jpeg|png|webp|avif|svg|ico|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache Spline scenes for 1 week
        source: '/:path*.splinecode',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://www.google-analytics.com",
              "font-src 'self' data:",
              "connect-src 'self' https://generativelanguage.googleapis.com https://www.google-analytics.com https://discord.com https://cdn.discordapp.com https://prod.spline.design https://*.spline.design https://unpkg.com https://www.gstatic.com blob:",
              "frame-src 'self' https://my.spline.design",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  experimental: {
    /**
     * Workaround for Next.js 16 + Turbopack bug:
     * "Expected workUnitAsyncStorage to have a store" during /_global-error prerender.
     * Allow build to continue despite prerender failures.
     */
    staticGenerationRetryCount: 0,
    optimizePackageImports: ['framer-motion', 'lucide-react', 'recharts'],
  },
};

export default nextConfig;
