# 02 — Backend System (NestJS orchestrator)

Overview
- Use `NestJS` (TypeScript) as the orchestration and admin API layer. It should implement auth, admin UIs, public REST/GraphQL endpoints, and delegate low-latency work to compiled services.

Architecture & modules
- Modules: `Auth`, `Products`, `Subscriptions`, `Orders`, `Inventory`, `SearchProxy`, `Payments`, `Admin`.
- Each module contains Controllers (HTTP/gRPC proxies), Services (business logic), Repositories (DB access), and DTOs/validators.

API design
- Public REST: stable OpenAPI spec for storefront needs (product list, product detail, checkout init, subscription management).
- Internal gRPC: for communication with the compiled microservices (Selection, Inventory, Checkout worker).
- Idempotency: all non-read APIs (checkout, webhooks) must verify idempotency keys and store request trace in Postgres for replayability.

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
