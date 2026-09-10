'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import CartLine from '@/components/cart/cart-line';
import Ornament from '@/app/(storefront)/sections/ornament';
import { getOrder } from '@/lib/api';
import { formatMoney } from '@/lib/money';

const PROVIDER_LABELS: Record<string, string> = {
  chapa: 'Chapa',
  stripe: 'Stripe',
};

export default function OrderClient({ orderId }: { orderId: string }) {
  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrder(orderId),
    enabled: Boolean(orderId),
  });

  if (isLoading) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-cream-soft pt-32 md:pt-40"
        aria-busy="true"
      >
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 text-[#8A7F6A] sm:px-6 md:px-8">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.24em]">
            Loading your order…
          </span>
        </div>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center bg-cream-soft"
      >
        <div className="mx-auto w-full max-w-xl px-6 text-center">
          <p className="font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
            We couldn&apos;t find that order.
          </p>
          <p className="mt-4 text-sm leading-7 text-[#5A5346]">
            {error instanceof Error
              ? error.message
              : 'Check the link in your confirmation email.'}
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
          >
            Back to the shop
          </Link>
        </div>
      </main>
    );
  }

  const details = [
    { label: 'Order reference', value: order.id?.slice(0, 8).toUpperCase() },
    { label: 'Status', value: order.status },
    {
      label: 'Payment',
      value: order.paymentProvider
        ? (PROVIDER_LABELS[order.paymentProvider] ?? order.paymentProvider)
        : '—',
    },
    { label: 'Total', value: formatMoney(order.totalCents, order.currency) },
  ].filter((row) => Boolean(row.value));

  return (
    <main id="main-content" className="bg-cream-soft pb-24 pt-32 md:pt-40">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 md:px-8">
        <header className="flex flex-col items-center text-center">
          <CheckCircle2
            size={34}
            strokeWidth={1.4}
            className="text-[#B08A3E]"
            aria-hidden
          />
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#3B3A2C]">
            Order received
          </p>
          <h1 className="featured-heading mt-4">Thank you.</h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-[#5A5346]">
            We&apos;ve recorded your order and will email{' '}
            {order.contactEmail ?? 'you'} with the payment link and delivery
            details.
          </p>
          <Ornament className="mt-6" />
        </header>

        <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-[#E4DBC9] py-8 sm:grid-cols-4">
          {details.map((row) => (
            <div key={row.label}>
              <dt className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#A79C86]">
                {row.label}
              </dt>
              <dd className="mt-1.5 text-xs uppercase tracking-[0.1em] text-[#2E2A20]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <section aria-label="Order items" className="mt-10">
          <ul>
            {order.items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                currency={order.currency}
                editable={false}
              />
            ))}
          </ul>
        </section>

        {order.shippingAddress && (
          <section className="mt-10">
            <h2 className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#A79C86]">
              Delivering to
            </h2>
            <p className="mt-2 max-w-md whitespace-pre-line text-sm leading-7 text-[#5A5346]">
              {order.contactName}
              {'\n'}
              {order.shippingAddress}
            </p>
          </section>
        )}

        <Link
          href="/shop"
          className="mt-12 inline-flex border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
        >
          Keep shopping
        </Link>
      </div>
    </main>
  );
}
