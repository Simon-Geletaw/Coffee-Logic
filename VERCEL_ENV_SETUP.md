# Vercel Environment Variables — add these to your backend project

Go to: **Vercel Dashboard → your project → Settings → Environment Variables**
Add every entry below (copy key + value), then **Redeploy**.

> Backend entry: `api/index.ts` → `apps/api` (NestJS). `NODE_ENV` is set to
> `production` automatically by Vercel — that turns ON the strict validation
> in `apps/api/src/config/env.config.ts`, so ALL "Required" vars below must
> exist or the function crashes at boot with:
> `Invalid environment variables`.

## Required (boot fails without these)

### DATABASE_URL
```
postgresql://neondb_owner:npg_dPJ5MS9gBtcG@ep-cold-frog-b5tq4sla-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
(Your Neon connection string — same as local `.env`. Works from Vercel since it's a public Neon endpoint.)

### JWT_SECRET
```
c5ef02ecf63db52f03498375066db4b5d3ea9f16d2a6360d526d98d45130e12d
```
(Exactly 64 hex characters — validation rejects anything else. This is the same secret your local/dev API uses, so existing tokens keep working.)

### WEB_ORIGIN
```
https://simonbuilds.pro.et
```
The ONLY origin CORS allows in production. ⚠️ Must EXACTLY match the URL you open the frontend from (scheme + domain, no trailing slash). If your frontend is served from Vercel too (e.g. `https://your-app.vercel.app`), use that instead.

### API_PUBLIC_URL
```
https://coffee-logic.vercel.app
```
Where payment providers reach this API for webhooks. (Must be a full URL with `https://` — the local value `localhost:3001` is invalid in production.)

### REDIS_URL  ← Required in production (your local .env has none!)
Get a free one in ~1 minute:
1. https://vercel.com/marketplace → **Upstash for Redis** → Create (free plan)
   — or https://upstash.com → create a free database
2. Copy the **Redis protocol URL** (`redis://default:<password>@...:6379`)
3. Paste below. It must start with `redis://` (validator enforces this).
```
redis://default:PASTE_YOUR_UPSTASH_URL_HERE
```

### CHAPA_SECRET_KEY
```
CHASECK_TEST-yCY5KDArtGPNWatDYCb0QD1siRW6jJ3z
```
(Must start with `CHASECK_` — test key only logs a warning, it does NOT block boot.)

### CHAPA_WEBHOOK_SECRET
```
local-docker-chapa-webhook-secret-2026
```
(Min 16 characters.)

## Do NOT set these on Vercel (they will CRASH production boot)

- `STRIPE_SECRET_KEY` — the validator **rejects `sk_test_` keys in production**
  ("A Stripe TEST key cannot be used in production" → boot crash).
  Leave it unset while testing; add a live `sk_live_` key + matching
  `STRIPE_WEBHOOK_SECRET` (starts `whsec_`) later, or set BOTH only when you
  go live with Stripe.
- `STRIPE_WEBHOOK_SECRET` alone (without `STRIPE_SECRET_KEY`).

## Optional

### CHECKOUT_HOLD_MINUTES
```
30
```
(default 30; valid range 5–120)

## Checklist before you deploy

- [ ] All 7 Required vars added (DATABASE_URL, JWT_SECRET, WEB_ORIGIN, API_PUBLIC_URL, REDIS_URL, CHAPA_SECRET_KEY, CHAPA_WEBHOOK_SECRET)
- [ ] `git add -A && git commit -m "fix: relative imports for Vercel" && git push`
      ← THE CODE FIX IS STILL UNCOMMITTED! Without this, Vercel keeps serving the broken build.
- [ ] After push: Vercel → Deployments → wait for build → test:
      `curl -i https://coffee-logic.vercel.app/health` (expect 200)
- [ ] Then login test:
      `curl -i -X POST https://coffee-logic.vercel.app/auth/login -H "Content-Type: application/json" -d '{"email":"...","password":"..."}'`
- [ ] Still failing? Vercel → Deployments → select deployment → **Logs** tab:
      - `Invalid environment variables` → a Required var above is missing/malformed
      - `Cannot find module ...` → the fix commit isn't deployed yet
      - `@prisma/client did not initialize` → build log: `prisma generate` didn't run

## How validation maps to errors

| Log message in Vercel | Cause |
|---|---|
| `Invalid environment variables` | Missing/malformed Required var (see `env.config.ts` messages like `REDIS_URL is required in production`) |
| `Cannot find module 'src/...'` | Old build without the relative-import fix |
| 401 on login | ✅ backend works — wrong email/password |
| 429 on login | ✅ works — rate limit (5 req / 6 s), wait and retry |
