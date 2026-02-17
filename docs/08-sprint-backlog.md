# 08 — Phase 1: Ticketized Sprint Backlog (MVP)

Notes
- Phase 1 spans 3 sprints (2 weeks each). Tasks below are written as tickets with acceptance criteria (AC) and estimate (points ~ 1 point = 4 hours).

Sprint 1 — Foundation (10 points)
- T1 (3): Setup repo, monorepo layout, `Next.js` app scaffold + `NestJS` skeleton. AC: dev server boots, sample page renders, API health endpoint returns 200.
- T2 (2): Postgres schema & migrations for `products`, `batches`, `inventory`. AC: migrations run in CI and schema present in dev DB.
- T3 (3): Stripe sandbox integration for non-recurring checkout (test payment flow). AC: test card accepted and order recorded.
- T4 (2): Basic product listing page + product detail with SSR. AC: product pages render with server data.

Sprint 2 — Subscriptions & Filtering (12 points)
- T5 (3): Implement subscription creation flow using Stripe Billing (checkout session + subscription webhooks). AC: subscription created in Stripe and DB entry created on webhook.
- T6 (3): Implement sensory filter API (simple DB-backed filters). AC: API returns filtered product list with correct filter logic.
- T7 (3): Address book & user account scaffold + auth (NextAuth stub). AC: user can sign in and add an address.
- T8 (3): Background worker (TS/BullMQ) to process subscription renewals (simulate). AC: worker processes test jobs successfully.

Sprint 3 — Inventory & Search MVP (12 points)
- T9 (4): Inventory freshness engine (TS worker): compute `peak_window` and mark batches as visible/unavailable. AC: batch state updates correctly.
- T10 (4): Integrate Elasticsearch (or pg_trgm fallback) for product search/facets. AC: search returns expected results and aggregations work.
- T11 (4): Low-stock alerts & admin notification (email or webhook). AC: when inventory < threshold, admin receives alert.

Common acceptance criteria for all tickets
- Unit tests added where reasonable; e2e smoke tests run in CI; code reviewed and merged via PRs.

Post-MVP follow-ups (Phase 2)
- Replace TS workers with Go microservices for Selection & Inventory; add gRPC contracts and generated clients.
