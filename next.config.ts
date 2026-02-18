import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
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
