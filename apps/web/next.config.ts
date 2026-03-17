import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const distDir = process.env.COFFEE_LOGIC_NEXT_DIST_DIR ?? '.next-web';

const baseConfig: NextConfig = {
  // Keep build artifacts scoped to this app in a pnpm workspace.
  // The dev script can override this to a unique folder to avoid deletes on startup.
  distDir,
};

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  if (!isDev) return baseConfig;

  return {
    ...baseConfig,
    experimental: {
      // Next dev acquires an exclusive lockfile in `distDir` by default. Some Windows
      // environments (including restricted shells/sandboxes) fail to create the lock,
      // causing dev startup to abort with "An IO error occurred while attempting to
      // create and acquire the lockfile".
      lockDistDir: false,

      // Disable Next's MCP server integration for local dev. It creates log files in `distDir`
      // before the dev server runs its cleanup step, which can trigger EPERM unlink failures
      // in restricted environments.
      mcpServer: false,
    },
  };
}
