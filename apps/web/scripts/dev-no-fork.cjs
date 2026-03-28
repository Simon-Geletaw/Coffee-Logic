/**
 * Next.js `next dev` starts a worker process via `child_process.fork()` and IPC.
 * Some Windows environments block spawning processes with IPC handles, causing:
 *   Error: spawn EPERM
 *
 * This script runs Next's internal dev server entrypoint in-process, avoiding IPC.
 */

const path = require('node:path');

function parseIntOr(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  // Ensure consistent dev semantics.
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  // Use a per-process distDir so Next doesn't need to delete previous build output on startup.
  // This is important in environments where unlink/rm is restricted (Windows EPERM unlink).
  if (!process.env.COFFEE_LOGIC_NEXT_DIST_DIR) {
    process.env.COFFEE_LOGIC_NEXT_DIST_DIR = `.next-web-dev-${process.pid}`;
  }

  const dir = process.cwd();

  const port = parseIntOr(process.env.PORT, 3000);
  const hostname = process.env.HOSTNAME || process.env.HOST || 'localhost';

  // We intentionally do NOT allow automatic port bumping.
  // If :3000 is taken, we want a hard error so the dev CORS origin stays stable.
  const allowRetry = false;

  let startServer;
  try {
    ({ startServer } = require('next/dist/server/lib/start-server'));
  } catch (error) {
    console.error('Failed to load Next.js start-server module.');
    console.error('Current working dir:', dir);
    console.error('Resolved file:', path.resolve(dir));
    throw error;
  }

  await startServer({
    dir,
    port,
    hostname,
    allowRetry,
    isDev: true,
    minimalMode: false,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
