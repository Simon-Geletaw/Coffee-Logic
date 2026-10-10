#!/bin/sh
set -e

cd /app/api
export DATABASE_URL="${DATABASE_URL:?DATABASE_URL is required}"

echo "[api] Waiting for database..."
node <<'NODE'
const { Client } = require('pg');
const url = process.env.DATABASE_URL;
const max = Number(process.env.PG_WAIT_ATTEMPTS || 60);
const delay = Number(process.env.PG_WAIT_DELAY_MS || 2000);
(async () => {
  for (let i = 1; i <= max; i++) {
    const c = new Client({ connectionString: url });
    try {
      await c.connect();
      await c.end();
      console.log('[api] Database is ready');
      process.exit(0);
    } catch (e) {
      try { await c.end(); } catch {}
      console.log('[api] DB not ready (' + i + '/' + max + '): ' + e.message);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error('[api] Database never became ready');
  process.exit(1);
})();
NODE

echo "[api] Running migrations..."
npx prisma migrate deploy --schema /app/prisma/schema.prisma

if [ "${SKIP_SEED:-false}" != "true" ]; then
  if [ -f /app/prisma/seed.sql ] || [ -f /app/api/prisma/seed.sql ]; then
    SEED_SQL="/app/prisma/seed.sql"
    [ -f /app/api/prisma/seed.sql ] && SEED_SQL="/app/api/prisma/seed.sql"
    echo "[api] Seeding database from ${SEED_SQL} (idempotent)..."
    node -e "
const fs = require('fs');
const { Client } = require('pg');
const sql = fs.readFileSync(process.argv[1], 'utf8');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query(sql))
  .then(() => { console.log('[api] Seed complete'); return c.end(); })
  .catch(async (e) => { console.error('[api] Seed failed:', e.message); await c.end().catch(()=>{}); process.exit(1); });
" "$SEED_SQL"
  else
    echo "[api] No seed.sql found — skipping seed"
  fi
fi

echo "[api] Starting NestJS on port ${PORT:-3001}..."
exec node dist/main
