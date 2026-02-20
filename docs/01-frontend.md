# 01 — Frontend System (Next.js + PWA)

Overview
- Use `Next.js` (latest LTS) as the primary frontend framework to satisfy SSR, PWA and Lighthouse goals.
- Host on Vercel for first-class SSR, edge caching and automatic image optimization; alternate: CloudFront+S3 for a self-managed option.

Who this is for
- Junior developers learning Next.js, React, and web performance basics.

What you are building (simple)
- A storefront website with product lists, product detail pages, filters, and checkout pages.
- Pages should load fast and work well on mobile.

Key subsystems & libraries
- Styling: `Tailwind CSS` + `Headless UI` for accessible components and fast styling system.
- Auth: `NextAuth.js` + cookie-based session or JWT; store session metadata in Redis for cross-instance consistency.
- Payments UI: Use Stripe Elements / Payment Request API for Apple Pay / Google Pay flows.
- Data fetching: `React Query` / `SWR` for caching + background revalidation; GraphQL (Apollo) or REST (Axios/fetch) for API comms.
- Images: Next/Image or external image processor -> CDN. Always produce multiple sizes + AVIF/WebP where supported.

Recommended folder layout (simple)
- `apps/web` or `frontend/` for the Next.js app (exact path will be decided in Sprint 1).
- `src/pages` or `src/app` for routes (depending on Next.js router choice).
- `src/components` for reusable UI pieces (buttons, cards, filters).
- `src/lib` for API clients and shared utilities.

Performance patterns
- Pre-render product pages where possible (ISR for frequently changing pages), SSR for checkout and account pages.
- Stale-while-revalidate cache for filters and product lists; cache computed sensory-filtered results in Redis.
- Use edge middleware to respond quickly to critical checks (A/B, feature flags) and to handle geolocation/shipping fallback logic.
- Optimize fonts (font-display: swap), critical CSS, and avoid large client bundles: split code at route level.

Beginner steps (how to build each page)
1. Start with layout: header, footer, and main content area.
2. Create a product list page that reads products from the API.
3. Create a product detail page that loads a single product by ID.
4. Add filter UI and connect it to the filter API.
5. Add cart and checkout pages that call the checkout API.

Developer & build details
- Build with `esbuild`/`swc` for faster production compilation.
- Linting & formatting: `ESLint`, `Prettier`, `TypeScript` (strict). Run tests in CI and block merges on failing checks.
- Local dev: `pnpm` or `yarn` workspace with storybook for UI components.

Security & UX
- Use secure cookies, set `SameSite` attributes and strong CSRF protections on state-changing endpoints.
- Protect client routes with server session checks for checkout and subscription pages.

Notes
- Keep business logic minimal in the client; all critical selection/checkout decisions should be server-side to meet reliability targets.

SRS alignment (MVP)
- Storefront scope: FR-SF-001..003, FR-02.
- Auth/session UX: FR-Auth-001..002 with server-side session checks on protected routes.
- Checkout UI: FR-CO-001..006 using Stripe Elements/Payment Request.

Build and run (junior-friendly)
- Follow the step-by-step setup in docs/09-development-setup.md.
- Start the frontend after the API is running.

Quick checklist (before you finish a ticket)
- Page loads without errors.
- API call returns expected data.
- Empty state is visible if no data.
- Basic accessibility: keyboard focus works and text contrast is readable.
