# 09 — Development Setup (Junior-Friendly)

Purpose
- This guide explains how to set up a local dev environment, run the app, and run tests.

Prerequisites
- Git
- Node.js LTS (20.x recommended)
- pnpm (or npm/yarn if the repo chooses it later)
- Go (1.20+)
- Docker Desktop (for local Postgres/Redis)
- A code editor (VS Code recommended)

If you are new
- Install Node.js from the official website.
- Install Git and confirm `git --version` works.
- Install Docker Desktop and open it once so it finishes setup.

Repository setup
1. Clone the repo and open it in your editor.
2. Install dependencies (choose one package manager and stick to it).
   - pnpm: `pnpm install`
   - npm: `npm install`
   - yarn: `yarn install`

Check your tools
- `node -v` should show a version like 20.x
- `git --version` should print a version number
- `docker version` should print client and server info

Local services (database and cache)
- Recommended: run Postgres and Redis via Docker.
- If a `docker-compose.yml` exists, start it with `docker compose up -d`.
- If not, install Postgres and Redis locally and run them as services.

How to confirm services are running
- Postgres: you should see a running container named `postgres`.
- Redis: you should see a running container named `redis`.

Environment variables (typical keys)
- Create `.env` files for frontend and backend when templates are added.
- Common variables you will need:
  - `DATABASE_URL`
  - `REDIS_URL`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `NEXTAUTH_SECRET`
  - `NEXTAUTH_URL`
- Use Stripe test keys for local development.

Where to find values
- `DATABASE_URL`: from your local Postgres config.
- `REDIS_URL`: from your local Redis config.
- Stripe keys: from the Stripe dashboard (test mode).

Running the app (expected workflow)
1. Start the API server.
2. Start the frontend dev server.
3. Open the app in a browser and verify the health endpoint.

Example (expected) commands
- API: `pnpm dev:api`
- Frontend: `pnpm dev:web`
- Health check: `http://localhost:3000/api/health`

Database migrations (expected workflow)
- Run migrations after starting Postgres.
- Example: `pnpm db:migrate` or `pnpm prisma migrate dev`

Tests (expected workflow)
- Unit tests: `pnpm test`
- E2E smoke tests: `pnpm test:e2e`

Troubleshooting
- If the API cannot connect to the database, verify `DATABASE_URL` and that Postgres is running.
- If Stripe webhooks fail, confirm `STRIPE_WEBHOOK_SECRET` matches your local webhook listener.
- If the frontend shows empty data, verify the API is running and reachable.

Common beginner mistakes
- Using the wrong Node.js version.
- Running the frontend before the API.
- Forgetting to run migrations.

Notes
- Exact commands will be finalized once the repo scaffolding tasks in Sprint 1 are complete.
- If a command fails, check `package.json` scripts or ask the lead developer.
