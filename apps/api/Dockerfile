# syntax=docker/dockerfile:1.7
# ── Build ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
WORKDIR /repo

# Lockfile-first for layer caching: deps only re-install when they change.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json prisma.config.ts ./
COPY apps/api/package.json apps/api/
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter api...

COPY apps/api ./apps/api
RUN pnpm -C apps/api exec prisma generate \
 && pnpm -C apps/api build \
 && pnpm --filter api deploy --prod --legacy /out

# ── Runtime ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate \
 && apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /out ./
COPY --from=build /repo/apps/api/dist ./dist
COPY prisma ./prisma
COPY prisma.config.ts ./
# The runtime image has its own @prisma/client; generate the engine for it.
RUN pnpm exec prisma generate && chown -R node:node /app

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
# Apply committed migrations, then serve. Never `migrate dev` here.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
