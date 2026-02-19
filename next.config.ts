import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://generativelanguage.googleapis.com https://www.google-analytics.com https://region1.google-analytics.com https://prod.spline.design https://*.spline.design",
  "frame-src 'self' https://prod.spline.design",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
].join('; ');

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives,
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
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
