# 08 — Phase 1: Ticketized Sprint Backlog (MVP)

Notes (read first if you are new)
- Phase 1 spans 3 sprints (2 weeks each).
- A "ticket" is a small task you can finish in a few days.
- Each ticket has:
	- FR-* : a requirement ID from the SRS (what the business needs).
	- AT-* : an acceptance test ID (how we prove it works).
- Estimates: 1 point = ~4 hours. If you are new, it may take longer, and that is OK.
- Before starting any ticket, set up your machine using docs/09-development-setup.md.

How to use this backlog (simple steps)
1. Pick the next ticket in order (start at T1).
2. Read the FR and AT IDs listed on the ticket.
3. Implement the feature in small commits.
4. Run tests and confirm the acceptance criteria.
5. Ask for review and merge only when the ticket passes its AC.

Sprint 1 — Foundation + Storefront Core (12 points)
- T1 (3): Repo/monorepo scaffold, `Next.js` app, `NestJS` API, CI baseline.
	- What you do: create the folder structure, add basic project files, and make sure servers can start.
	- FR: FR-01.
	- AC: dev server boots, sample page renders, API health endpoint returns 200.
- T2 (2): Core schema & migrations for `products`, `batches`, `inventory`, `users`, `orders`.
	- What you do: add database tables and migration files, then run them locally.
	- FR: FR-01, FR-05, FR-Auth-001.
	- AC: migrations run in CI and schema present in dev DB.
- T3 (3): Storefront SSR catalog + product detail pages.
	- What you do: build basic pages that show product list and a product detail.
	- FR: FR-SF-001, FR-SF-003.
	- AC: AT-SF-001, AT-SF-003.
- T4 (2): Basic filter API + UI integration (roast, grind, weight, acidity, origin, caffeine, process).
	- What you do: add filter fields to the API and connect the UI filters.
	- FR: FR-SF-002, FR-02.
	- AC: AT-SF-002.
- T5 (2): Auth scaffold with session cookies, sign-in UI, and protected account route.
	- What you do: add login page, session cookie, and a page that only logged-in users can open.
	- FR: FR-Auth-001, FR-Auth-002.
	- AC: AT-Auth-001.

Sprint 2 — Subscriptions + Checkout (12 points)
- T6 (3): Stripe checkout session for one-time purchase; order creation on payment success.
	- What you do: create a checkout session and store an order when payment succeeds.
	- FR: FR-04, FR-CO-001, FR-CO-004.
	- AC: AT-CO-001.
- T7 (3): Stripe webhook handler with signature validation + idempotency.
	- What you do: verify Stripe webhooks and prevent duplicate processing.
	- FR: FR-CO-003, FR-CO-007.
	- AC: AT-CO-002.
- T8 (2): Shipping cost calculation and display in checkout.
	- What you do: compute shipping price and show it before checkout.
	- FR: FR-CO-002.
	- AC: AT-CO-003.
- T9 (2): Subscription toggle + cadence selection in product/cart flow.
	- What you do: add a switch and required cadence selection for subscriptions.
	- FR: FR-Subs-001, FR-Subs-002.
	- AC: AT-Subs-001.
- T10 (2): Subscription lifecycle management (pause/resume/cancel) in My Account.
	- What you do: add buttons in My Account to pause, resume, or cancel.
	- FR: FR-Subs-003.
	- AC: AT-Subs-002.

Sprint 3 — Inventory + Admin + Readiness (12 points)
- T11 (3): Inventory reservation/release during checkout and order states.
	- What you do: reserve items on checkout start, release on failure, and finalize on success.
	- FR: FR-Inv-006.
	- AC: AT-Inv-003.
- T12 (3): Freshness window computation and visibility logic.
	- What you do: calculate peak window dates and hide out-of-peak items.
	- FR: FR-Inv-002, FR-Inv-005.
	- AC: AT-Inv-002.
- T13 (2): Admin inventory adjustments with audit logging.
	- What you do: add admin form to change inventory and save audit logs.
	- FR: FR-Admin-003, FR-Admin-006.
	- AC: AT-Admin-001.
- T14 (2): Low-stock alerts configuration and notification.
	- What you do: let admins set thresholds and send alerts when stock is low.
	- FR: FR-Inv-004, FR-Admin-005.
	- AC: AT-Admin-002.
- T15 (2): Address book CRUD with default address.
	- What you do: allow users to add, edit, delete, and set a default address.
	- FR: FR-Auth-004.
	- AC: AT-Auth-003.

Common acceptance criteria for all tickets
- Unit tests added where reasonable; e2e smoke tests run in CI; code reviewed and merged via PRs.

Post-MVP follow-ups (Phase 2)
- Replace TS workers with Go microservices for Selection & Inventory; add gRPC contracts and generated clients.
- Expand search/facets (Elasticsearch or pg_trgm) and performance tuning.
