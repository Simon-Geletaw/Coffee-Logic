'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CartSummary from '@/components/cart/cart-summary';
import Ornament from '@/app/(storefront)/sections/ornament';
import { useCart, useCheckout } from '@/hooks/use-cart';
import { useToast } from '@/components/toast';
import { checkoutSchema, type CheckoutInput } from '@/lib/validators';

/**
 * Payment is not wired up yet — the shopper picks a provider and the order is
 * saved as `pending` with that choice recorded. Chapa and Stripe integrations
 * read `Order.paymentProvider` when they land.
 */
const PROVIDERS = [
  {
    value: 'chapa' as const,
    label: 'Chapa',
    hint: 'Telebirr, CBE Birr and Ethiopian cards',
  },
  {
    value: 'stripe' as const,
    label: 'Stripe',
    hint: 'International credit and debit cards',
  },
];

const fieldClass =
  'w-full border border-[#E4DBC9] bg-white/60 px-4 py-3 text-sm text-[#2E2A20] outline-none transition-colors placeholder:text-[#A79C86] focus:border-[#B08A3E]';
const labelClass =
  'text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8A7F6A]';
const errorClass = 'text-[10px] uppercase tracking-[0.16em] text-[#A6402C]';

export default function CheckoutClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { cart, isLoading } = useCart();
  const placeOrder = useCheckout();

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

  // useWatch subscribes to a single field; the form's watch() function cannot
  // be memoized safely by the React compiler.
  const selectedProvider = useWatch({ control, name: 'paymentProvider' });
  const isEmpty = cart.items.length === 0;

  if (isLoading && isEmpty) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-cream-soft pt-32 md:pt-40"
        aria-busy="true"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 text-[#8A7F6A] sm:px-6 md:px-8">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          <span className="text-[10px] uppercase tracking-[0.24em]">
            Loading your cart…
          </span>
        </div>
      </main>
    );
  }

  if (isEmpty) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center bg-cream-soft"
      >
        <div className="mx-auto w-full max-w-xl px-6 text-center">
          <p className="font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
            There is nothing to check out.
          </p>
          <p className="mt-4 text-sm leading-7 text-[#5A5346]">
            Add a coffee to your cart and come back.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex items-center gap-2 border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
          >
            <ArrowLeft size={14} aria-hidden />
            Back to the shop
          </Link>
        </div>
      </main>
    );
  }

  const onSubmit = handleSubmit((values) => {
    placeOrder.mutate(
      {
        ...values,
        contactPhone: values.contactPhone || undefined,
      },
      {
        onSuccess: (order) => {
          toast('success', 'Order placed', `Reference ${order.orderId.slice(0, 8)}`);
          router.push(`/orders/${order.orderId}`);
        },
        onError: (error) => {
          // Stock and price are re-checked at checkout, so this is where a
          // sold-out coffee surfaces. Show the server's reason verbatim.
          toast(
            'error',
            'Could not place your order',
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

        <form
          onSubmit={onSubmit}
          className="mt-14 grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16"
        >
          <div className="space-y-8">
            <fieldset className="space-y-5" disabled={placeOrder.isPending}>
              <legend className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2E2A20]">
                Contact
              </legend>

              <label className="block space-y-2">
                <span className={labelClass}>Full name</span>
                <input
                  className={fieldClass}
                  placeholder="Selam Tadesse"
                  autoComplete="name"
                  {...register('contactName')}
                />
                {errors.contactName && (
                  <span className={errorClass}>{errors.contactName.message}</span>
                )}
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className={labelClass}>Email</span>
                  <input
                    className={fieldClass}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...register('contactEmail')}
                  />
                  {errors.contactEmail && (
                    <span className={errorClass}>
                      {errors.contactEmail.message}
                    </span>
                  )}
                </label>

                <label className="block space-y-2">
                  <span className={labelClass}>Phone (optional)</span>
                  <input
                    className={fieldClass}
                    type="tel"
                    placeholder="+251 …"
                    autoComplete="tel"
                    {...register('contactPhone')}
                  />
                  {errors.contactPhone && (
                    <span className={errorClass}>
                      {errors.contactPhone.message}
                    </span>
                  )}
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-5" disabled={placeOrder.isPending}>
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
                {errors.shippingAddress && (
                  <span className={errorClass}>
                    {errors.shippingAddress.message}
                  </span>
                )}
              </label>
            </fieldset>

            <fieldset className="space-y-4" disabled={placeOrder.isPending}>
              <legend className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#2E2A20]">
                Payment
              </legend>

              <div className="grid gap-3 sm:grid-cols-2">
                {PROVIDERS.map((provider) => {
                  const isSelected = selectedProvider === provider.value;
                  return (
                    <button
                      key={provider.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() =>
                        setValue('paymentProvider', provider.value, {
                          shouldValidate: true,
                        })
                      }
                      className={`border p-5 text-left transition-colors ${
                        isSelected
                          ? 'border-[#B08A3E] bg-[#B08A3E]/12'
                          : 'border-[#E4DBC9] bg-white/50 hover:border-[#D3C4A6]'
                      }`}
                    >
                      <span className="block text-xs font-semibold uppercase tracking-[0.24em] text-[#2E2A20]">
                        {provider.label}
                      </span>
                      <span className="mt-2 block text-[11px] leading-6 text-[#8A7F6A]">
                        {provider.hint}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] leading-5 tracking-[0.06em] text-[#A79C86]">
                Your order is recorded now and held as pending. Payment is
                collected separately — we will email you the payment link.
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
                disabled={placeOrder.isPending}
                className="flex w-full items-center justify-center gap-2.5 border border-[#B08A3E] bg-[#B08A3E] px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1B1710] transition-colors hover:bg-[#C29B4B] disabled:cursor-not-allowed disabled:border-[#D8CDB6] disabled:bg-[#D8CDB6] disabled:text-[#6E6857]"
              >
                {placeOrder.isPending && (
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                )}
                {placeOrder.isPending ? 'Placing order…' : 'Place order'}
              </button>
            }
          />
        </form>
      </div>
    </main>
  );
}
