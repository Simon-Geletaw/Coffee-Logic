import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Unit/component tests for the storefront. Playwright owns end-to-end; this
 * config deliberately excludes its folder so the two never overlap.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror tsconfig's "@/..." → "src/..." so imports look identical in tests.
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'e2e', '.next-*'],
    css: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/components/cart/**', 'src/components/shop/**'],
    },
  },
});
