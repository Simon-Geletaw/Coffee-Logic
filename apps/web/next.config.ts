import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const distDir = process.env.COFFEE_LOGIC_NEXT_DIST_DIR ?? '.next-web';

const baseConfig: NextConfig = {
  // Keep build artifacts scoped to this app in a pnpm workspace.
  // The dev script can override this to a unique folder to avoid deletes on startup.
  distDir,
  images: {
    // Serve images at maximum quality (quality={100} is used across the storefront).
    qualities: [75, 100],
    // Prefer AVIF, fall back to WebP — best fidelity per byte at high quality.
    formats: ['image/avif', 'image/webp'],
    // Product.imageUrl can point at an external host. Optimised images are
    // re-served from this origin, so the CSP img-src 'self' rule still covers
    // them. NOTE: narrow this to your actual image host before production —
    // a wildcard lets anyone use the optimiser as an open image proxy.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [
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
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self' http://localhost:3001 https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          {
            key: 'Cache-Control',
            value: 'no-store',
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
