'use client';

import clsx from 'clsx';
import { Loader2, ShoppingBag } from 'lucide-react';
import { useAddToCart } from '@/hooks/use-cart';
import { useToast } from '@/components/toast';
import type { ProductVariant } from '@/lib/types';

type Props = {
  variant: ProductVariant | null;
  productName: string;
  quantity?: number;
  className?: string;
  label?: string;
  onAdded?: () => void;
};

/**
 * The single place add-to-cart happens. Owning the mutation here means the
 * card, the detail page and anything added later all get identical pending
 * state, error surfacing and cache updates.
 */
export default function AddToCartButton({
  variant,
  productName,
  quantity = 1,
  className,
  label = 'Add to cart',
  onAdded,
}: Props) {
  const { toast } = useToast();
  const addToCart = useAddToCart();

  const disabled = !variant || addToCart.isPending;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!variant) return;
        addToCart.mutate(
          { productVariantId: variant.id, quantity },
          {
            onSuccess: () => {
              toast('success', 'Added to cart', productName);
              onAdded?.();
            },
            onError: (error) => {
              // The API returns the real reason — out of stock, mixed
              // currency, inactive product — so show it rather than a generic.
              toast(
                'error',
                'Could not add to cart',
                error instanceof Error ? error.message : undefined,
              );
            },
          },
        );
      }}
      className={clsx(
        'inline-flex items-center justify-center gap-2.5 border border-[#B08A3E] bg-[#B08A3E] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1B1710] transition-colors duration-200',
        'hover:bg-[#C29B4B] disabled:cursor-not-allowed disabled:border-[#D8CDB6] disabled:bg-[#D8CDB6] disabled:text-[#6E6857]',
        className,
      )}
    >
      {addToCart.isPending ? (
        <Loader2 size={14} className="animate-spin" aria-hidden />
      ) : (
        <ShoppingBag size={14} strokeWidth={1.9} aria-hidden />
      )}
      {addToCart.isPending ? 'Adding…' : label}
    </button>
  );
}
