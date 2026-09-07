'use client';

import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';
import { useNow } from '@/hooks/use-now';
import type { Cart } from '@/lib/types';

/**
 * Explains a non-editable cart. Rendered above the lines on /cart.
 *
 *  pending → a provider session is open; lines are locked until it settles
 *  failed  → last attempt did not complete; lines are editable, retry offered
 */
export default function CartStatusBanner({ cart }: { cart: Cart }) {
  const now = useNow();

  if (cart.status === 'pending') {
    const expires = cart.paymentExpiresAt ? Date.parse(cart.paymentExpiresAt) : null;
    const minutesLeft =
      expires !== null && now !== null ? Math.max(0, Math.ceil((expires - now) / 60_000)) : null;

    return (
      <div role="status" className="flex gap-4 border border-[#D9C9A6] bg-[#F7F0DF] p-5">
        <Clock size={18} className="mt-0.5 shrink-0 text-[#8A6420]" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6E5518]">Payment in progress</p>
          <p className="mt-2 text-sm leading-7 text-[#5A5346]">
            Your coffee is held while you pay
            {minutesLeft !== null && minutesLeft > 0 ? ` — about ${minutesLeft} min left` : ''}. Quantities
            are locked until the payment completes or the hold expires.
          </p>
          {cart.id && (
            <Link
              href={`/checkout/return?order=${cart.id}`}
              className="mt-3 inline-flex text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6420] underline-offset-4 hover:underline"
            >
              Check payment status
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (cart.status === 'failed') {
    return (
      <div role="alert" className="flex gap-4 border border-[#E0B8AD] bg-[#FBEEEA] p-5">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#A6402C]" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A6402C]">Payment not completed</p>
          <p className="mt-2 text-sm leading-7 text-[#5A5346]">
            {cart.failureReason ?? 'Your last payment attempt did not complete.'} Nothing was charged. You can
            change your cart or try again.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
