'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import Ornament from '@/app/(storefront)/sections/ornament';
import { cartKeys, useCheckoutStatus } from '@/hooks/use-cart';
import { clearCartToken } from '@/lib/cart-token';
import { formatMoney } from '@/lib/money';

/**
 * Where the provider sends the shopper back. It never decides anything: it
 * polls the API, which owns the truth (webhook or direct provider check).
 *
 * States: pending (poll) → paid (celebrate, then to the order page)
 *         → failed (explain, offer retry) → timeout (reassure, link to order).
 */
export default function ReturnClient() {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params.get('order');

  const { data, isError, error, exhausted } = useCheckoutStatus(orderId);
  const status = data?.status;

  // Paid: the server nulled the cart token; drop ours so the badge resets,
  // refresh the cart cache, and move on to the receipt.
  useEffect(() => {
    if (status !== 'paid' || !orderId) return;
    clearCartToken();
    queryClient.setQueryData(cartKeys.all, undefined);
    const timer = setTimeout(() => router.replace(`/orders/${orderId}`), 1_800);
    return () => clearTimeout(timer);
  }, [status, orderId, router, queryClient]);

  if (!orderId) {
    return (
      <Shell icon={<AlertTriangle size={34} strokeWidth={1.4} className="text-[#A6402C]" />} eyebrow="Checkout">
        <h1 className="featured-heading mt-4">We lost track of that order.</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#5A5346]">
          The return link is missing its order reference. Your cart is safe.
        </p>
        <Cta href="/cart">Back to cart</Cta>
      </Shell>
    );
  }

  if (isError) {
    return (
      <Shell icon={<AlertTriangle size={34} strokeWidth={1.4} className="text-[#A6402C]" />} eyebrow="Checkout">
        <h1 className="featured-heading mt-4">We couldn&apos;t check your payment.</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#5A5346]">
          {error instanceof Error ? error.message : 'Please try again in a moment.'}
        </p>
        <Cta href={`/orders/${orderId}`}>View order</Cta>
      </Shell>
    );
  }

  if (data?.status === 'paid') {
    return (
      <Shell icon={<CheckCircle2 size={34} strokeWidth={1.4} className="text-[#B08A3E]" />} eyebrow="Payment received">
        <h1 className="featured-heading mt-4">Thank you.</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#5A5346]">
          {formatMoney(data.totalCents, data.currency)} received. Taking you to your order…
        </p>
      </Shell>
    );
  }

  if (data?.status === 'failed') {
    return (
      <Shell icon={<AlertTriangle size={34} strokeWidth={1.4} className="text-[#A6402C]" />} eyebrow="Payment not completed">
        <h1 className="featured-heading mt-4">That didn&apos;t go through.</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#5A5346]">
          {data.failureReason ?? 'The payment was not completed.'} Nothing was charged and your cart is
          exactly as you left it.
        </p>
        <Cta href="/checkout">Try again</Cta>
      </Shell>
    );
  }

  // Still pending. The hook stops polling after ~90 s; past that, reassure
  // rather than spin — the webhook or the sweeper will finish the job.
  const stalled = exhausted;

  return (
    <Shell
      icon={
        stalled ? (
          <Clock size={34} strokeWidth={1.4} className="text-[#8A7F6A]" />
        ) : (
          <Loader2 size={34} strokeWidth={1.4} className="animate-spin text-[#B08A3E]" />
        )
      }
      eyebrow="Confirming payment"
    >
      <h1 className="featured-heading mt-4">{stalled ? 'Still confirming.' : 'One moment.'}</h1>
      <p className="mt-3 max-w-md text-sm leading-7 text-[#5A5346]">
        {stalled
          ? "Your payment provider hasn't confirmed yet. If you were charged, your order will update automatically — you can safely close this page and check back."
          : "We're waiting for your payment provider to confirm. This usually takes a few seconds."}
      </p>
      {stalled && <Cta href={`/orders/${orderId}`}>Check order status</Cta>}
    </Shell>
  );
}

function Shell({ icon, eyebrow, children }: { icon: React.ReactNode; eyebrow: string; children: React.ReactNode }) {
  return (
    <main id="main-content" className="flex min-h-screen items-center bg-cream-soft">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center px-6 text-center" aria-live="polite">
        <span aria-hidden>{icon}</span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#3B3A2C]">{eyebrow}</p>
        {children}
        <Ornament className="mt-6" />
      </div>
    </main>
  );
}

function Cta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-8 inline-flex border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
    >
      {children}
    </Link>
  );
}
