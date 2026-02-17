# 01 — Frontend System (Next.js + PWA)

Overview
- Use `Next.js` (latest LTS) as the primary frontend framework to satisfy SSR, PWA and Lighthouse goals.
- Host on Vercel for first-class SSR, edge caching and automatic image optimization; alternate: CloudFront+S3 for a self-managed option.

Key subsystems & libraries
- Styling: `Tailwind CSS` + `Headless UI` for accessible components and fast styling system.
- Auth: `NextAuth.js` + cookie-based session or JWT; store session metadata in Redis for cross-instance consistency.
- Payments UI: Use Stripe Elements / Payment Request API for Apple Pay / Google Pay flows.
- Data fetching: `React Query` / `SWR` for caching + background revalidation; GraphQL (Apollo) or REST (Axios/fetch) for API comms.
- Images: Next/Image or external image processor -> CDN. Always produce multiple sizes + AVIF/WebP where supported.

Performance patterns
- Pre-render product pages where possible (ISR for frequently changing pages), SSR for checkout and account pages.
- Stale-while-revalidate cache for filters and product lists; cache computed sensory-filtered results in Redis.
- Use edge middleware to respond quickly to critical checks (A/B, feature flags) and to handle geolocation/shipping fallback logic.
- Optimize fonts (font-display: swap), critical CSS, and avoid large client bundles: split code at route level.

Developer & build details
- Build with `esbuild`/`swc` for faster production compilation.
- Linting & formatting: `ESLint`, `Prettier`, `TypeScript` (strict). Run tests in CI and block merges on failing checks.
- Local dev: `pnpm` or `yarn` workspace with storybook for UI components.

Security & UX
- Use secure cookies, set `SameSite` attributes and strong CSRF protections on state-changing endpoints.
- Protect client routes with server session checks for checkout and subscription pages.

Notes
- Keep business logic minimal in the client; all critical selection/checkout decisions should be server-side to meet reliability targets.
