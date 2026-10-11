# Deploying the backend (apps/api) on Render

**Stack: API on Render · Postgres on Neon · Frontend on Vercel.** Render hosts only this API; the database already lives on Neon and needs no changes there.

## What was fixed (package-management issues)

1. **`package-lock.json` deleted** — the repo is a pnpm workspace (`pnpm-workspace.yaml` + `pnpm-lock.yaml`). A tracked npm lockfile made Render's Node runtime potentially run `npm install`, which cannot install a pnpm workspace and would leave the API with missing/broken dependencies. It is now also in `.gitignore` so it can't come back.
2. **Root `package.json`** now pins `"packageManager": "pnpm@11.5.1"` (corepack/Render pick the right pnpm) and `"engines": { "node": ">=22.0.0 <25.0.0" }`. The useless `pnpm` and duplicated `next` root dependencies were removed (they only slowed Render installs). A `migrate:deploy` script was added.
3. **`.node-version`** pins Node `22.22.0` for Render (matches the Dockerfile and CI).
4. **`prisma.config.ts`** no longer throws when `DATABASE_URL` is missing — `prisma generate` (which runs on every `pnpm install` via the root `postinstall`) doesn't need a database. Commands that do touch the database (`migrate`, `db seed`, `db push`) still hard-fail without it.
5. **`render.yaml`** (Render Blueprint) added at the repo root with the correct build/start commands and health check.
6. **Port** — no code change needed: `apps/api/src/main.ts` already binds `process.env.PORT` on `0.0.0.0`, which is exactly what Render requires. `GET /health` returns `{"status":"ok"}` for Render's health checks.

## IMPORTANT: keep the service Root Directory empty (repo root)

The Prisma schema (`prisma/schema.prisma`), `prisma.config.ts`, `pnpm-workspace.yaml`
and `pnpm-lock.yaml` all live at the **repo root**, not in `apps/api`. Render does
**not** make files outside a service's Root Directory available at build or runtime,
so setting Root Directory = `apps/api` would break `prisma generate` and workspace
installation. Leave Root Directory **blank** (or use the Blueprint below, which
pins it correctly).

## Step-by-step: first deploy

1. **Commit and push these changes** to the branch Render watches (usually `main`).
2. **Get your Neon database connection string** (the DB is already hosted there — nothing to create):
   - Neon Console → your project → **Dashboard → Connection Details**.
   - Choose the **pooled connection string** (host contains `-pooler`). It looks like
     `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require`.
   - Neon accepts both `postgresql://` and `postgres://` schemes; the API accepts both too.
   - Keep `?sslmode=require` in the URL.
3. **Create the API service:**
   - **New +** → **Blueprint** → select this repo → Render detects `render.yaml` → **Apply**.
   - (Manual alternative: **New +** → **Web Service** → pick repo, leave **Root Directory blank**, then set Build/Start commands exactly as in `render.yaml`.)
4. **Set environment variables** on the `coffee-logic-api` service → **Environment**. The API validates all of them at boot and **refuses to start if any is wrong** (that is the "Invalid environment variables" crash):

   | Variable | Required? | Value |
   |---|---|---|
   | `DATABASE_URL` | always | Your **Neon pooled connection string** (host contains `-pooler`), keep `?sslmode=require`. Both `postgres://` and `postgresql://` schemes are accepted. |
   | `JWT_SECRET` | always | **Exactly 64 hex characters.** Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `NODE_ENV` | always | `production` (Blueprint sets it) |
   | `WEB_ORIGIN` | always | Your **Vercel** frontend URL, e.g. `https://your-app.vercel.app` — the only CORS origin allowed in production. Must match exactly (protocol + host, no trailing slash). If you use a custom domain, use that instead. |
   | `API_PUBLIC_URL` | always | This API's public URL, e.g. `https://coffee-logic-api.onrender.com` — used to build payment callback/webhook URLs |
   | `REDIS_URL` | **required in production** | Redis URL (`redis://...`). Options: **Render Key Value** (free tier, same dashboard — its *internal* URL works since the API runs on Render) or **Upstash**. Backs checkout holds. |
   | `CHAPA_SECRET_KEY` | **required in production** | `CHASECK_...` (the active payment provider) |
   | `CHAPA_WEBHOOK_SECRET` | **required in production** | min 16 chars |
   | `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | optional | If you set the key you must also set the webhook secret; a `sk_test_` key is rejected in production |

   Do **NOT** set `PORT` manually — Render injects it (default `10000`) and the app already reads it.

   > **Vercel side note:** your frontend needs the API's public URL too (e.g. `NEXT_PUBLIC_API_URL=https://coffee-logic-api.onrender.com` in the Vercel project env vars). And if your Vercel app is on a `*.vercel.app` preview domain per-deployment, only the exact `WEB_ORIGIN` value will pass CORS — use the production domain.

5. Click **Manual Deploy → Deploy latest commit** (or just push).
6. Watch **Logs**. Expected sequence:
   - `pnpm install --frozen-lockfile` (runs the root `postinstall` → `prisma generate`)
   - `prisma generate` + `nest build` → `dist/main.js`
   - `prisma migrate deploy` (idempotent, safe on every boot/wake-up)
   - `API listening on 0.0.0.0:10000`
7. **Health check** is preconfigured to `GET /health` (Blueprint `healthCheckPath: /health`). If creating the service manually, set **Health Check Path** = `/health` in Settings so deploys only go live when the API is actually ready.

## Troubleshooting boot crashes

- **`ERROR [ExceptionHandler] Error: Invalid environment variables`** — the API validated env at boot and failed. The details are printed just above the error (`Invalid environment variables: { ... }`). The usual causes:
  - `DATABASE_URL` missing or not a `postgres(ql)://` URL.
  - `JWT_SECRET` not exactly 64 hex characters.
  - `NODE_ENV=production` without `REDIS_URL` / `CHAPA_SECRET_KEY` / `CHAPA_WEBHOOK_SECRET`.
  - A `sk_test_` Stripe key while `NODE_ENV=production`.
- **Crash loop right after start, `Can't reach database server`** — `DATABASE_URL` unreachable or wrong. With Neon: make sure you used the **pooled** host (`-pooler`), kept `?sslmode=require`, and the branch/compute is enabled. The API now retries the connection 5× (3 s apart) before giving up, so a suspended Neon compute waking up (which can take several seconds) no longer crash-loops the deploy; if it still fails after ~15 s, the URL/credentials are wrong.
- **Deploy never goes live / "health check failed"** — the app never started listening; see the crash above in the logs.

## Ports — the rules

- Render web services must listen on the port in the `PORT` env var (`10000` by default) on all interfaces — `main.ts` does `app.listen(process.env.PORT ?? 3001, '0.0.0.0')`. ✔ Nothing to configure.
- Render routes public HTTPS traffic (443) to that port automatically; you never open ports in a firewall.
- `3001` is only the local/dev fallback — do not try to expose it on Render.
- The Docker path (`deploy/Dockerfile` + `apps/api/entrypoint.sh`) exposes 3001 internally and is for self-hosting, not Render's native runtime.

## Local verification (what was tested)

- `pnpm install --frozen-lockfile` → passes (lockfile in sync).
- `pnpm -C apps/api run build` → generates Prisma Client + `dist/main.js`.
- `PORT=10010 node dist/main.js` → `GET /health` → `HTTP 200 {"status":"ok"}`.

## Free-tier notes

- Free instances **spin down** after ~15 min idle and cold-start on the next request. The start command re-runs `prisma migrate deploy` on wake-up, which is safe/idempotent.
- **Neon free tier** auto-suspends the compute when idle; the first request after suspension pays the wake-up cost (several seconds). The API's connection retry (5×, 3 s apart) absorbs this on boot — requests during that window may still be slow, which is normal for Neon.
- For Redis, **Render Key Value** has a free tier (same dashboard; use its internal URL) and **Upstash** has a generous free tier — either satisfies the production `REDIS_URL` requirement.
