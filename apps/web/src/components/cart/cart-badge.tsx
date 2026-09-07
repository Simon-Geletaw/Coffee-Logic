'use client';

import { useCartCount } from '@/hooks/use-cart';

/**
 * Live item count for the header cart icon.
 *
 * Renders nothing when the cart is empty, and nothing at all on the server —
 * the count depends on localStorage, so showing it only after hydration avoids
 * a mismatch between the server HTML and the first client render.
 */
export default function CartBadge() {
  const count = useCartCount();

  if (count <= 0) return null;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-[#B08A3E] px-1 text-[9px] font-semibold leading-[17px] tabular-nums text-[#1B1710]"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
