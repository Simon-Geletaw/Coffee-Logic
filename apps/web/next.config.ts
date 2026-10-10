import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const distDir = process.env.COFFEE_LOGIC_NEXT_DIST_DIR ?? '.next-web';

const baseConfig: NextConfig = {
  // Keep build artifacts scoped to this app in a pnpm workspace.
  // The dev script can override this to a unique folder to avoid deletes on startup.
  distDir,
  images: {
    // Sources are pre-compressed WebP (see scripts/optimize-images.mjs); the
    // optimizer only re-encodes sizes, so quality 75 keeps files tiny.
    qualities: [75],
    // Prefer AVIF, fall back to WebP — best fidelity per byte at high quality.
    formats: ['image/avif', 'image/webp'],
    // Keep the optimizer's output cache warm for 30 days.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Product.imageUrl can point at an external host. Optimised images are
    // re-served from this origin, so the CSP img-src 'self' rule still covers
    // them. NOTE: narrow this to your actual image host before production —
    // a wildcard lets anyone use the optimiser as an open image proxy.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [
      {
        // Immutable hashed build output — cache forever; cache busting via URL hash.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self' https://api.simonbuilds.pro.et; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          {
            // HTML revalidates on every request; /_next/static above caches forever.
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  if (!isDev) return baseConfig;

  return {
    ...baseConfig,
    experimental: {
      // Next dev acquires an exclusive lockfile in `distDir` by default. Some Windows
      // environments (including restricted shells/sandboxes) fail to create the lock,
      // causing dev startup to abort with "An IO error occurred while attempting to
      // create and acquire the lockfile".
      lockDistDir: false,

      // Disable Next's MCP server integration for local dev. It creates log files in `distDir`
      // before the dev server runs its cleanup step, which can trigger EPERM unlink failures
      // in restricted environments.
      mcpServer: false,
    },
  };
}
