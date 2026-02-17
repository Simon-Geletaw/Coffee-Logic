# 07 — Deployment & DevOps

Hosting choices
- Frontend: `Vercel` for Next.js SSR and preview deployments (fast developer feedback). Self-host alternative: CloudFront + Lambda@Edge or App Service with CDN.
- API & workers: AWS ECS/Fargate or Azure App Service / Container Instances. Use managed Postgres and Redis.

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
