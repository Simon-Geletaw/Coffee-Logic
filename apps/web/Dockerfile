# syntax=docker/dockerfile:1.7
# ── Build ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter web...

COPY apps/web ./apps/web
# NEXT_PUBLIC_* is inlined at build time; pass the public API URL as a build arg.
ARG NEXT_PUBLIC_API_BASE_URL=https://api.example.com
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_STANDALONE=1 \
    COFFEE_LOGIC_NEXT_DIST_DIR=.next \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm -C apps/web build

# ── Runtime ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1

# Standalone output contains a minimal node_modules + server.js for the app.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
