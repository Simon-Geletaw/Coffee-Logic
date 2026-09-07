'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import CartSummary from '@/components/cart/cart-summary';
import Ornament from '@/app/(storefront)/sections/ornament';
import { useCart, useCreateCheckoutSession } from '@/hooks/use-cart';
import { useToast } from '@/components/toast';
import { formatMoney } from '@/lib/money';
import { checkoutSchema, type CheckoutInput } from '@/lib/validators';
import type { PaymentProvider } from '@/lib/types';

/**
 * Which hosted payment page a currency goes to. Mirrors the API's registry;
 * the server still rejects a mismatch, this only keeps the UI honest.
 */
const PROVIDERS: Array<{
  value: PaymentProvider;
  label: string;
  hint: string;
  currencies: string[];
}> = [
  {
    value: 'chapa',
    label: 'Chapa',
    hint: 'Telebirr, CBE Birr and Ethiopian cards',
    currencies: ['ETB'],
  },
  {
    value: 'stripe',
    label: 'Stripe',
    hint: 'International credit and debit cards, Apple Pay, Google Pay',
    currencies: ['USD'],
  },
];

const fieldClass =
  'w-full border border-[#E4DBC9] bg-white/60 px-4 py-3 text-sm text-[#2E2A20] outline-none transition-colors placeholder:text-[#A79C86] focus:border-[#B08A3E] disabled:opacity-60';
const labelClass = 'text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8A7F6A]';
const errorClass = 'text-[10px] uppercase tracking-[0.16em] text-[#A6402C]';

function newIdempotencyKey(): string {
  // crypto.randomUUID is available in every browser Next 16 supports.
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CheckoutClient() {
  const { toast } = useToast();
  const { cart, isLoading, isPaymentPending } = useCart();
  const openSession = useCreateCheckoutSession();

  // One key per checkout attempt. It is regenerated only after a definitive
  // failure, so a flaky network on "Place order" replays the same session.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const available = useMemo(
    () => PROVIDERS.filter((p) => (cart.currency ? p.currencies.includes(cart.currency) : false)),
    [cart.currency],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      shippingAddress: '',
      paymentProvider: 'chapa',
    },
  });

  const selectedProvider = useWatch({ control, name: 'paymentProvider' });

  // Keep the selection valid for the cart's currency (e.g. a USD cart must
  // not submit "chapa" just because it was the default).
  useEffect(() => {
    if (available.length === 0) return;
    if (!available.some((p) => p.value === selectedProvider)) {
      setValue('paymentProvider', available[0].value, { shouldValidate: true });
    }
  }, [available, selectedProvider, setValue]);

  const isEmpty = cart.items.length === 0;
  const isSubmitting = openSession.isPending || openSession.isSuccess;

  if (isLoading && isEmpty) {
    return (
      <main id="main-content" className="min-h-screen bg-cream-soft pt-32 md:pt-40" aria-busy="true">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 text-[#8A7F6A] sm:px-6 md:px-8">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.24em]">Loading your cart…</span>
        </div>
      </main>
    );
  }

  if (isEmpty) {
    return (
      <EmptyState
        title="There is nothing to check out."
        text="Add a coffee to your cart and come back."
      />
    );
  }

  if (isPaymentPending) {
    return (
      <EmptyState
        title="A payment is already in progress."
        text="Finish it on the payment page, or go back to your cart to check its status."
        cta={{ href: '/cart', label: 'Back to cart' }}
      />
    );
  }

  const onSubmit = handleSubmit((values) => {
    openSession.mutate(
      {
        payload: { ...values, contactPhone: values.contactPhone || undefined },
        idempotencyKey,
      },
      {
        onSuccess: (session) => {
          // Hand off to the provider's hosted page. `assign` keeps this page
          // in history so the browser Back button returns to the cart flow.
          window.location.assign(session.redirectUrl);
        },
        onError: (error) => {
          // Stock, price and shipping are all re-checked server-side at this
          // moment; show the server's reason verbatim and allow a fresh try.
          setIdempotencyKey(newIdempotencyKey());
          toast(
            'error',
            'Could not start the payment',
            error instanceof Error ? error.message : undefined,
          );
        },
      },
    );
  });

  return (
    <main id="main-content" className="bg-cream-soft pb-24 pt-32 md:pt-40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <header className="flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#3B3A2C]">
            Checkout
          </p>
          <h1 className="featured-heading mt-4">Where should it go?</h1>
          <Ornament className="mt-6" />
        </header>

        <form onSubmit={onSubmit} className="mt-14 grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
          <div className="space-y-8">
            <fieldset className="space-y-5" disabled={isSubmitting}>
              <legend className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2E2A20]">
                Contact
              </legend>

              <label className="block space-y-2">
                <span className={labelClass}>Full name</span>
                <input className={fieldClass} placeholder="Selam Tadesse" autoComplete="name" {...register('contactName')} />
                {errors.contactName && <span className={errorClass}>{errors.contactName.message}</span>}
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className={labelClass}>Email</span>
                  <input className={fieldClass} type="email" placeholder="you@example.com" autoComplete="email" {...register('contactEmail')} />
                  {errors.contactEmail && <span className={errorClass}>{errors.contactEmail.message}</span>}
                </label>

                <label className="block space-y-2">
                  <span className={labelClass}>Phone (optional)</span>
                  <input className={fieldClass} type="tel" placeholder="+251 …" autoComplete="tel" {...register('contactPhone')} />
                  {errors.contactPhone && <span className={errorClass}>{errors.contactPhone.message}</span>}
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-5" disabled={isSubmitting}>
              <legend className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2E2A20]">
                Delivery
              </legend>

              <label className="block space-y-2">
                <span className={labelClass}>Shipping address</span>
                <textarea
                  className={`${fieldClass} min-h-28 resize-y`}
                  placeholder="Street, building, city, and any landmark that helps the courier find you."
                  autoComplete="street-address"
                  {...register('shippingAddress')}
                />
                {errors.shippingAddress && <span className={errorClass}>{errors.shippingAddress.message}</span>}
              </label>
            </fieldset>

            <fieldset className="space-y-4" disabled={isSubmitting}>
              <legend className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2E2A20]">
                Payment
              </legend>

              {available.length === 0 ? (
                <p className="text-sm leading-7 text-[#A6402C]">
                  No payment method is available for {cart.currency} yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {available.map((provider) => {
                    const isSelected = selectedProvider === provider.value;
                    return (
                      <button
                        key={provider.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setValue('paymentProvider', provider.value, { shouldValidate: true })}
                        className={`border p-5 text-left transition-colors ${
                          isSelected
                            ? 'border-[#B08A3E] bg-[#B08A3E]/12'
                            : 'border-[#E4DBC9] bg-white/50 hover:border-[#D3C4A6]'
                        }`}
                      >
                        <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-[#2E2A20]">
                          {provider.label}
                        </span>
                        <span className="mt-2 block text-[11px] leading-6 text-[#8A7F6A]">{provider.hint}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="flex items-start gap-2 text-[10px] leading-5 tracking-[0.06em] text-[#A79C86]">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#B08A3E]" aria-hidden />
                You&apos;ll pay {formatMoney(cart.totalCents, cart.currency)} on{' '}
                {available.find((p) => p.value === selectedProvider)?.label ?? 'the provider'}&apos;s secure
                page. We never see your card details. Your coffee is held for 30 minutes while you pay.
              </p>
            </fieldset>
          </div>

          <CartSummary
            cart={cart}
            title="Your order"
            className="h-fit lg:sticky lg:top-28"
            action={
              <button
                type="submit"
                disabled={isSubmitting || available.length === 0}
                className="flex w-full items-center justify-center gap-2.5 border border-[#B08A3E] bg-[#B08A3E] px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1B1710] transition-colors hover:bg-[#C29B4B] disabled:cursor-not-allowed disabled:border-[#D8CDB6] disabled:bg-[#D8CDB6] disabled:text-[#6E6857]"
              >
                {isSubmitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
                {openSession.isSuccess
                  ? 'Redirecting…'
                  : openSession.isPending
                    ? 'Preparing payment…'
                    : 'Continue to payment'}
              </button>
            }
          />
        </form>
      </div>
    </main>
  );
}

function EmptyState({
  title,
  text,
  cta = { href: '/shop', label: 'Back to the shop' },
}: {
  title: string;
  text: string;
  cta?: { href: string; label: string };
}) {
  return (
    <main id="main-content" className="flex min-h-screen items-center bg-cream-soft">
      <div className="mx-auto w-full max-w-xl px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">{title}</p>
        <p className="mt-4 text-sm leading-7 text-[#5A5346]">{text}</p>
        <Link
          href={cta.href}
          className="mt-8 inline-flex items-center gap-2 border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
        >
          <ArrowLeft size={14} aria-hidden />
          {cta.label}
        </Link>
      </div>
    </main>
  );
}
