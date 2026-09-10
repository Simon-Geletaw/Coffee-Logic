'use client';

import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import CartLine from '@/components/cart/cart-line';
import CartSummary from '@/components/cart/cart-summary';
import Ornament from '@/app/(storefront)/sections/ornament';
import { useCart, useClearCart } from '@/hooks/use-cart';
import { useToast } from '@/components/toast';

export default function CartClient() {
  const { cart, isLoading, isError, error, refetch } = useCart();
  const clearCart = useClearCart();
  const { toast } = useToast();

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

  return (
    <main id="main-content" className="bg-cream-soft pb-24 pt-32 md:pt-40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <header className="flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#3B3A2C]">
            Your Cart
          </p>
          <h1 className="featured-heading mt-4">
            {isEmpty ? 'Nothing here yet.' : 'Ready when you are.'}
          </h1>
          <Ornament className="mt-6" />
        </header>

        {isError && (
          <div className="mt-12 border border-[#D9BFA6] bg-[#F6EBDD] p-6 text-center">
            <p className="text-sm leading-7 text-[#6B4A2A]">
              {error instanceof Error
                ? error.message
                : 'We could not load your cart.'}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 border border-[#B08A3E] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
            >
              Try again
            </button>
          </div>
        )}

        {isEmpty ? (
          <div className="mt-14 flex flex-col items-center text-center">
            <p className="max-w-sm text-sm leading-7 text-[#5A5346]">
              Your cart is empty. Pick an origin you like and it will show up
              here — nothing is charged until you check out.
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex items-center gap-2.5 border border-[#B08A3E] bg-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1B1710] transition-colors hover:bg-[#C29B4B]"
            >
              Browse the coffees
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="mt-14 grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
            <section aria-label="Cart items">
              <div className="flex items-center justify-between border-b border-[#E4DBC9] pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8A7F6A]">
                  {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
                </p>
                <button
                  type="button"
                  disabled={clearCart.isPending}
                  onClick={() =>
                    clearCart.mutate(undefined, {
                      onError: (mutationError) =>
                        toast(
                          'error',
                          'Could not empty the cart',
                          mutationError instanceof Error
                            ? mutationError.message
                            : undefined,
                        ),
                    })
                  }
                  className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8A7F6A] transition-colors hover:text-[#8A2E1E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {clearCart.isPending ? 'Emptying…' : 'Empty cart'}
                </button>
              </div>

              <ul>
                {cart.items.map((item) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    currency={cart.currency}
                  />
                ))}
              </ul>

              <Link
                href="/shop"
                className="mt-8 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#8A7F6A] transition-colors hover:text-[#2E2A20]"
              >
                Keep shopping
              </Link>
            </section>

            <CartSummary
              cart={cart}
              className="h-fit lg:sticky lg:top-28"
              action={
                <Link
                  href="/checkout"
                  className="flex w-full items-center justify-center gap-2.5 border border-[#B08A3E] bg-[#B08A3E] px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1B1710] transition-colors hover:bg-[#C29B4B]"
                >
                  Checkout
                  <ArrowRight size={14} aria-hidden />
                </Link>
              }
            />
          </div>
        )}
      </div>
    </main>
  );
}
