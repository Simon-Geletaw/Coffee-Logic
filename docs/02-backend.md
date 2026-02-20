# 02 — Backend System (NestJS orchestrator)

Overview
- Use `NestJS` (TypeScript) as the orchestration and admin API layer. It should implement auth, admin UIs, public REST/GraphQL endpoints, and delegate low-latency work to compiled services.

Who this is for
- Junior developers learning TypeScript, NestJS, and backend basics.

What you are building (simple)
- A REST API that the frontend calls to list products, start checkout, and manage subscriptions.
- Admin endpoints for products, inventory, and alerts.

Architecture & modules
- Modules: `Auth`, `Products`, `Subscriptions`, `Orders`, `Inventory`, `SearchProxy`, `Payments`, `Admin`.
- Each module contains Controllers (HTTP/gRPC proxies), Services (business logic), Repositories (DB access), and DTOs/validators.

Simple request flow (example)
1. Client calls `GET /products`.
2. Controller validates input and calls a Service.
3. Service asks Repository for DB data.
4. Data returns to Controller and is sent back to the client.

API design
- Public REST: stable OpenAPI spec for storefront needs (product list, product detail, checkout init, subscription management).
- Internal gRPC: for communication with the compiled microservices (Selection, Inventory, Checkout worker).
- Idempotency: all non-read APIs (checkout, webhooks) must verify idempotency keys and store request trace in Postgres for replayability.

Beginner steps (how to add a new endpoint)
1. Create a DTO for input validation.
2. Add a Controller method with a route.
3. Add a Service method with the business logic.
4. Add a Repository method if DB access is needed.
5. Add a unit test for the Service.

Persistence & DTOs
- Use `Prisma` for type-safe DB access (or `TypeORM` if tighter NestJS integration is preferred). Keep migrations in source control.

Operational requirements
- Rate limiting and request quotas (per IP / per user) to protect checkout flows.
- Circuit-breakers for external services (Stripe, Shipping) with graceful degradation UX.
- Health checks, readiness & liveness endpoints for container orchestration.

Testing & contracts
- Integration tests: run with a transient Postgres, Redis, and mock Stripe in CI.
- Contract tests: when proto/OpenAPI changes, run a generation step in CI that updates SDKs and fails on breaking changes.

Notes
- Keep NestJS responsibilities as orchestration and non-latency-critical logic. Avoid heavy compute or synchronous ML in the Nest processes.

SRS alignment (MVP)
- Primary FR coverage: FR-03, FR-04, FR-05, FR-Admin-001..007, FR-Auth-001..006.
- Public endpoints: catalog list/detail, filter/search, checkout session init, subscription management, auth.
- Admin endpoints: products, batches, inventory adjustments, audit log, low-stock thresholds.
- Webhook handling: store idempotency keys and payloads in `webhook_logs` for replay safety.

Build and run (junior-friendly)
- Follow the step-by-step setup in docs/09-development-setup.md.
- Start the API before the frontend so the UI can fetch data.

Common beginner mistakes
- Forgetting to export a module or provider.
- Not validating inputs (use DTOs).
- Returning DB models directly without mapping to response shapes.
