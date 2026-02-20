# 03 — Latency-Critical Microservices (Go preferred)

Phase strategy
- MVP: implement selection, inventory, and webhook processing as TS workers in the NestJS stack to reduce complexity.
- Phase 2: migrate latency-critical paths to Go services with gRPC contracts.

Who this is for
- Junior developers who are new to microservices and gRPC.

What you are building (simple)
- In MVP: background jobs inside the API (no separate service).
- In Phase 2: small, fast services that do one job well (selection, inventory, webhooks).

Why compiled services
- Predictable GC, fast startup (relative to heavier runtimes), low memory footprint, static binaries and small containers.
- Use for Selection Logic, Inventory/Freshness engine, and Checkout webhook processing to minimize tail latency.

Language & framework choices
- Primary: `Go` (1.20+) for fastest development + deployment lifecycle.
- Alternative: `Rust` for maximum throughput and memory efficiency (longer dev velocity tradeoff).

Service responsibilities
- Selection Service: evaluate sensory filters, run preference matching, ranking; interface exposes a gRPC method `MatchProducts(userProfile, filters) -> rankedProducts`.
- Inventory/Freshness Service: compute peak flavor windows, adjust visibility for products that age past the window, keep per-batch TTLs and low-stock thresholds; subscribe to events from the DB/Redis stream.
- Checkout Processor: handle webhook events and perform synchronous lightweight verification; heavy processing done in workers.

Beginner steps (Phase 2)
1. Define the protobuf contract.
2. Generate client code.
3. Implement the service methods.
4. Add unit tests for service logic.
5. Containerize and deploy the service.

Contracts & interop
- Define Protobufs for each service. Generate TypeScript clients for NestJS and Go stubs for the services.
- Use gRPC for low‑latency calls; expose HTTP/JSON facade for external integrations.

Operational patterns
- Use connection pools for Postgres and Redis; keep per-request latency budgets and timeouts.
- Instrument with OpenTelemetry for traces and metrics; export to Prometheus/Grafana.
- Provide health/readiness endpoints and graceful shutdown on SIGTERM.

Build & deploy
- Build static binaries via `go build -ldflags '-s -w'`. Multi-stage Docker builds to minimize produced image size.
- CI generates release artifacts and container images; rely on a container registry (GHCR/ECR/ACR).

Notes
- Keep business rules outside microservices slim — microservices should be deterministic and easy to test.

Build and run (junior-friendly)
- In MVP, services run as TS workers inside the API. No separate Go service build is required yet.
- When Phase 2 begins, a separate Go build/run guide will be added.

Common beginner mistakes
- Over-splitting services too early.
- Adding business rules in multiple services (causes inconsistency).
