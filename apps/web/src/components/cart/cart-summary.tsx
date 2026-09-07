'use client';

import clsx from 'clsx';
import { formatMoney } from '@/lib/money';
import type { Cart } from '@/lib/types';

type Props = {
  cart: Cart;
  /** Rendered under the totals — the checkout button, or a submit button. */
  action?: React.ReactNode;
  /** Extra rows (shipping, tax) once those exist. */
  extraRows?: Array<{ label: string; value: string; muted?: boolean }>;
  title?: string;
  className?: string;
};

/**
 * Order totals panel. Shared by the cart page and the checkout page so the
 * numbers a shopper sees never drift between the two screens.
 *
 * Every figure comes from the server-computed cart — nothing is recalculated
 * in the browser.
 */
export default function CartSummary({
  cart,
  action,
  extraRows = [],
  title = 'Order summary',
  className,
}: Props) {
  const itemLabel = cart.itemCount === 1 ? 'item' : 'items';

  return (
    <aside
      className={clsx(
        'border border-[#E4DBC9] bg-white/50 p-6 sm:p-7',
        className,
      )}
    >
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8A7F6A]">
        {title}
      </h2>

      <dl className="mt-6 space-y-3.5 text-xs text-[#5A5346]">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="uppercase tracking-[0.16em]">
            Subtotal ({cart.itemCount} {itemLabel})
          </dt>
          <dd className="tabular-nums text-[#2E2A20]">
            {formatMoney(cart.totalCents, cart.currency)}
          </dd>
        </div>

        {extraRows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4"
          >
            <dt className="uppercase tracking-[0.16em]">{row.label}</dt>
            <dd className={clsx('tabular-nums', row.muted && 'text-[#A79C86]')}>
              {row.value}
            </dd>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-4 border-t border-[#E4DBC9] pt-4">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#2E2A20]">
            Total
          </dt>
          <dd className="font-[family-name:var(--font-display)] text-2xl tabular-nums text-[#2E2A20]">
            {formatMoney(cart.totalCents, cart.currency)}
          </dd>
        </div>
      </dl>

      {action && <div className="mt-7">{action}</div>}

      <p className="mt-5 text-[10px] leading-5 tracking-[0.06em] text-[#A79C86]">
        Shipping is calculated after checkout. Prices are confirmed against
        current stock when the order is placed.
      </p>
    </aside>
  );
}
