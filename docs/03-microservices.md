# 03 — Latency-Critical Microservices (Go preferred)

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
