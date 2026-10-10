# Coffee Logic — Hosting on this machine

Stack: Docker Compose (Postgres, Redis, NestJS API, Next.js, Caddy) + Cloudflare Tunnel.
Public hostnames:

| Hostname | Target |
|---|---|
| `https://simonbuilds.pro.et` | Next.js storefront |
| `https://api.simonbuilds.pro.et` | NestJS API |
| `https://www.simonbuilds.pro.et` | → storefront |

TLS is terminated by **Cloudflare Tunnel** (edge). Caddy is the internal reverse proxy on the compose network (`http://caddy:80`).

## Prerequisites

- Docker Desktop with WSL2 integration (Ubuntu)
- Cloudflare account with `simonbuilds.pro.et` on the zone
- `.env` filled (JWT_SECRET, Chapa, etc.)

## 1. Build and start the app stack

From the repo root on Windows (Docker Desktop):

```powershell
docker compose up -d --build postgres redis api web caddy
```

Watch the API container apply migrations + seed:

```powershell
docker compose logs -f api
```

Health checks (from Windows):

```powershell
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:3001/health   # only if you temporarily publish api
```

Caddy is published on **http://127.0.0.1:8080** for local checks. Public traffic goes through Cloudflare.

Admin seed login (from `apps/api/prisma/seed.sql`):

- email: `admin@coffee.dev`
- password: `Admin123!`

## 2. Cloudflare Tunnel

### Option A — token (recommended)

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → **Networks → Tunnels → Create a tunnel** → **Cloudflared**
2. Name it (e.g. `coffelogic-local`)
3. Copy the tunnel **token**
4. Paste into `.env`:

```env
TUNNEL_TOKEN=eyJhIjoixxxxx...
```

5. In the same wizard, add public hostnames:

| Hostname | Service |
|---|---|
| `simonbuilds.pro.et` | `http://caddy:80` |
| `www.simonbuilds.pro.et` | `http://caddy:80` |
| `api.simonbuilds.pro.et` | `http://caddy:80` |

   Because cloudflared runs **inside** the compose network, the service URL is `http://caddy:80` (not `http://localhost:8080`).

6. Start the tunnel container:

```powershell
docker compose --profile tunnel up -d cloudflared
```

### Option B — credentials file (from Ubuntu WSL)

```bash
# inside WSL Ubuntu
sudo apt-get update && sudo apt-get install -y cloudflared

cloudflared tunnel login
# browser opens → pick zone simonbuilds.pro.et

cloudflared tunnel create coffee-logic
# note the tunnel ID from the output

cloudflared tunnel route dns coffee-logic simonbuilds.pro.et
cloudflared tunnel route dns coffee-logic api.simonbuilds.pro.et
cloudflared tunnel route dns coffee-logic www.simonbuilds.pro.et
```

Copy the credentials JSON into the repo:

```bash
# adjust UUID filename to your tunnel id
cp ~/.cloudflared/<UUID>.json "/mnt/d/Coffe Logic/deploy/cloudflared/credentials.json"
```

Set in `.env`:

```env
TUNNEL_ID=<your-tunnel-uuid>
# leave TUNNEL_TOKEN empty
```

Then:

```powershell
docker compose --profile tunnel up -d cloudflared
```

## 3. DNS sanity check

In Cloudflare DNS, CNAME/A records for the hostnames should be **proxied (orange cloud)** and managed by the tunnel (CNAME to `<tunnel-id>.cfargotunnel.com` is normal).

## 4. Day-2 commands

```powershell
# status
docker compose ps

# logs
docker compose logs -f api web caddy cloudflared

# rebuild after code changes
docker compose up -d --build api web caddy

# DB shell
docker compose exec postgres psql -U coffee -d coffee_logic

# stop everything (keeps DB volume)
docker compose --profile tunnel down
```

## Ports on this machine

| Port | What |
|---|---|
| 7000 | Postgres (host) |
| 6379 | Redis (host) |
| 8080 | Caddy (host, local debug only) |
| — | API/web stay on the compose network (avoid clashing with local `pnpm dev` on 3000/3001) |

## Notes

- `.env` `DATABASE_URL` for local Windows tooling still points at `localhost:7000`. Inside Docker the API uses `postgres:5432`.
- Payment webhooks must use `https://api.simonbuilds.pro.et/...` (already set as `API_PUBLIC_URL`).
- Next.js bakes `NEXT_PUBLIC_API_BASE_URL` at **build** time — rebuild `web` if that URL changes.
- WSL Apache currently occupies port 80 inside the distro; that is fine — public HTTP(S) arrives via Cloudflare, not via WSL Apache.
