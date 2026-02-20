# 05 — Infrastructure, CI/CD & IaC

CI/CD pipeline
- Use `GitHub Actions` with separate workflows for `push`, `pull_request`, and `release`.
- Steps:
  1. Checkout, install deps, lint & test (TS + Go + Python as needed).
  2. Build artifacts: `esbuild`/`swc` for frontend, `go build` for services.
  3. Run container multi-stage builds and push to registry (GHCR/ECR/ACR).
  4. Terraform plan in PR comment and `terraform apply` on protected `main/master` or release tags.

Who this is for
- Junior developers learning CI/CD and deployments.

What you are building (simple)
- A pipeline that runs tests on every change and deploys safely.

Docker & image management
- Keep small images via multi-stage builds; use distroless or scratch for Go images.
- Tag images with semantic versions and commit SHA.

Infrastructure as Code
- `Terraform` modules: `network`, `ecs/aks`, `rds/az-postgres`, `redis`, `elasticsearch`, `iam`, `secrets`.
- Keep state remote (S3/Blobstore) with locking (DynamoDB/Storage Account).

Secrets & config
- Use cloud secret manager (AWS Secrets Manager / Azure Key Vault) for runtime secrets; avoid embedding secrets in Terraform state.

Dev & staging strategy
- Branch-per-feature with ephemeral environments (preview apps for Next.js on Vercel).
- Use separate dev/staging/prod accounts and guard prod with manual approvals for infra changes.

Testing
- Integration tests run in CI against ephemeral infra where possible; fallback to Docker Compose for fast local runs.

Observability & alerts
- CI should build artifacts and run smoke tests after deployment, posting success/failure to Slack/Teams.

Quality gates (MVP)
- Run SRS acceptance tests (AT-*) as e2e smoke checks in staging.
- Block merges if lint, unit tests, or AT smoke checks fail.

Build and run (junior-friendly)
- For local setup and commands, follow docs/09-development-setup.md.

Common beginner mistakes
- Merging without running tests.
- Storing secrets in the repo.
