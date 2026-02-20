# 07 — Deployment & DevOps

Hosting choices
- Frontend: `Vercel` for Next.js SSR and preview deployments (fast developer feedback). Self-host alternative: CloudFront + Lambda@Edge or App Service with CDN.
- API & workers: AWS ECS/Fargate or Azure App Service / Container Instances. Use managed Postgres and Redis.

Who this is for
- Junior developers learning deployment and operations basics.

What you are building (simple)
- A stable environment where the app can run in staging and production.

Scaling & availability
- Autoscale stateless services by CPU/RPS; use target tracking for average latency.
- Use read replicas for Postgres heavy read workloads; put a cache tier in front (Redis).

Backup & recovery
- Automated daily DB snapshots and continuous WAL archiving for point-in-time recovery.
- S3/Blob lifecycle policies for long-term logs and backups.

Monitoring & alerting
- Metrics: instrument services with OpenTelemetry; collect to Prometheus and create Grafana dashboards for SLOs.
- Errors: Sentry for exceptions and release tracking.
- Alerting: SLO-based alerts (e.g., increase in 5xx within checkout flow), PagerDuty for playbook escalation.

Runbooks & operational playbooks
- Provide runbooks for: payment failures, inventory reconciliation, rollback releases, and database failover.

Cost control
- Use reserved capacity for databases if usage is predictable; set autoscaling caps and alerts for cost spikes.

MVP readiness checklist
- Staging environment available with SSR storefront and checkout flows.
- Stripe test mode configured; webhooks validated and idempotent.
- Inventory freshness job scheduled daily or on batch updates.
- Admin audit logs enabled; low-stock alerts wired.
- SRS AT smoke tests pass in CI before deploy.

Build and run (junior-friendly)
- Follow docs/09-development-setup.md for local setup and commands.

Next deployment-ready step
- Create the initial repo scaffolding (Sprint 1 T1) and add:
	- `package.json` scripts for `dev:web`, `dev:api`, `test`, and `test:e2e`.
	- `docker-compose.yml` for Postgres and Redis.
	- `.env.example` files for frontend and backend.

Common beginner mistakes
- Deploying without running tests.
- Skipping backups or missing restore steps.
