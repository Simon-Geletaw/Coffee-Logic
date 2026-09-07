'use client';

import { useEffect, useState } from 'react';

/**
 * The current time as React state, refreshed on an interval.
 *
 * Components must be pure, so `Date.now()` cannot be called during render
 * (the React compiler lint rejects it). This moves the clock read into an
 * effect: the first render sees `null` — callers render without the
 * time-dependent detail — and the value appears on the next tick.
 */
export function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    // Deferred so the state write is not synchronous inside the effect body.
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}
