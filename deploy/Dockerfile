# Build context: repo root (D:\Coffe Logic)

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable \
 && corepack prepare pnpm@11.5.1 --activate

WORKDIR /repo


# ============================================================
# Dependencies
# ============================================================

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# Root postinstall runs prisma generate — schema must exist first
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN pnpm install --frozen-lockfile


# ============================================================
# API BUILD
# ============================================================

FROM deps AS api-build

ARG DATABASE_URL=postgresql://coffee:coffee@postgres:5432/coffee_logic

ENV DATABASE_URL=$DATABASE_URL

COPY apps/api ./apps/api

RUN pnpm -C apps/api exec prisma generate \
 && SRC=$(find /repo/node_modules/.pnpm -path '*/.prisma/client/index.d.ts' | head -1 | xargs dirname) \
 && for d in $(find /repo/node_modules/.pnpm -maxdepth 8 -type d -name .prisma); do \
      [ "$d/client" = "$SRC" ] || (rm -rf "$d/client" && cp -r "$SRC" "$d/client"); \
    done \
 && pnpm --filter api build \
 && cp -r /repo/apps/api/dist /tmp/api-dist \
 && mkdir -p /out/api \
 && cp /repo/apps/api/package.json /out/api/package.json \
 && cp -r /tmp/api-dist /out/api/dist \
 && test -f /out/api/dist/main.js \
 && mkdir -p /out/api/prisma \
 && cp /repo/prisma/seed.sql /out/api/prisma/seed.sql


# ============================================================
# WEB BUILD
# ============================================================

FROM deps AS web-build

ARG NEXT_PUBLIC_API_BASE_URL=/api

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NODE_ENV=production

COPY apps/web ./apps/web

RUN pnpm --filter web build \
 && mkdir -p /out/web \
 && cp -r /repo/apps/web/. /out/web/ \
 && rm -rf /out/web/node_modules /out/web/.next /out/web/.next-web \
 && cp -r /repo/node_modules /out/web/node_modules \
 && cp -r /repo/apps/web/.next /out/web/.next \
 && test -f /out/web/.next/BUILD_ID


# ============================================================
# API RUNNER
# ============================================================

FROM node:22-bookworm-slim AS api-runner

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=api-build /out/api ./api
COPY --from=api-build /repo/prisma ./prisma
COPY --from=api-build /repo/prisma.config.ts ./prisma.config.ts

WORKDIR /app/api

RUN npm install --omit=dev --ignore-scripts \
 && npm install --no-save --ignore-scripts prisma@6.19.3 \
 && npx prisma generate --schema /app/prisma/schema.prisma \
 && npm cache clean --force \
 && rm -rf /root/.npm

COPY apps/api/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/entrypoint.sh"]


# ============================================================
# WEB RUNNER
# ============================================================

FROM node:22-bookworm-slim AS web-runner

ENV NODE_ENV=production

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=web-build /out/web ./web

WORKDIR /app/web

EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]