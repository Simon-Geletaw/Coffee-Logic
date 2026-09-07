# Coffee Logic · Melkora storefront

Specialty Ethiopian coffee — storefront, cart, checkout (Stripe + Chapa), and an admin back-office.

| App | Stack | Port |
|---|---|---|
| `apps/web` | Next 16 · React 19 · Tailwind 4 · TanStack Query | 3000 |
| `apps/api` | NestJS 11 · Prisma 6 · Postgres 16 · Redis 7 | 3001 |

## Quick start

```bash
docker compose up -d postgres redis
cp .env.example .env            # fill JWT_SECRET; payment keys optional for a first run
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev:api & pnpm dev:web
```

Open http://localhost:3000/shop. Without payment keys, run the API with `PAYMENTS_FAKE=true` — see [`docs/RUNBOOK-payments-local.md`](docs/RUNBOOK-payments-local.md).

## Tests

```bash
pnpm -C apps/api exec jest          # unit
pnpm -C apps/web test:unit          # Vitest
pnpm -C apps/web test:e2e           # Playwright (needs api PAYMENTS_FAKE=true + web running)
```

## Docs

- [`docs/SHOP_PAYMENTS_ROADMAP.md`](docs/SHOP_PAYMENTS_ROADMAP.md) — architecture, decisions, plan
- [`docs/lectures/`](docs/lectures/) — module-by-module walkthroughs (concept → syntax → code → edge cases)
- [`docs/RUNBOOK-payments-local.md`](docs/RUNBOOK-payments-local.md) — Stripe CLI, ngrok, Chapa, fake provider
- `docs/SRS-*.md` — requirements
