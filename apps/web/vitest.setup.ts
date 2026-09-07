// Adds DOM matchers (toBeInTheDocument, toBeDisabled, …) to Vitest's expect.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount whatever a test rendered so state never leaks between tests.
afterEach(() => {
  cleanup();
});
