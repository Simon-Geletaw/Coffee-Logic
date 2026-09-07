'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { Loader2, Trash2 } from 'lucide-react';
import ProductImage from '@/components/shop/product-image';
import QuantityStepper from '@/components/cart/quantity-stepper';
import { useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { useToast } from '@/components/toast';
import { formatMoney, formatWeight } from '@/lib/money';
import type { CartItem } from '@/lib/types';

type Props = {
  item: CartItem;
  currency: string | null;
  /** Read-only rendering for the order confirmation screen. */
  editable?: boolean;
  className?: string;
};

/**
 * One line of the cart. Owns its own quantity/remove mutations so each row
 * shows its own pending state instead of freezing the whole cart.
 */
export default function CartLine({
  item,
  currency,
  editable = true,
  className,
}: Props) {
  const { toast } = useToast();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const isBusy = updateItem.isPending || removeItem.isPending;

  const onError = (title: string) => (error: unknown) => {
    toast(
      'error',
      title,
      error instanceof Error ? error.message : undefined,
    );
  };

  const subtitle = [item.product.origin, item.product.roastLevel]
    .filter(Boolean)
    .join(' · ');

  return (
    <li
      className={clsx(
        'flex gap-5 border-b border-[#E4DBC9] py-6 transition-opacity',
        isBusy && 'opacity-60',
        className,
      )}
    >
      <Link
        href={`/shop/${item.product.id}`}
        className="relative size-24 shrink-0 border border-[#E4DBC9] bg-white/40 sm:size-28"
      >
        <ProductImage
          name={item.product.name}
          imageUrl={item.product.imageUrl}
          sizes="112px"
          className="object-contain p-2"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <Link
              href={`/shop/${item.product.id}`}
              className="text-xs font-semibold uppercase tracking-[0.26em] text-[#2E2A20] transition-colors hover:text-[#8A6420]"
            >
              {item.product.name}
            </Link>
            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[#8A7F6A]">
              {formatWeight(item.weightGrams)}
              {subtitle && ` · ${subtitle}`}
            </p>
          </div>

          <p className="font-[family-name:var(--font-display)] text-xl text-[#2E2A20]">
            {formatMoney(item.lineTotalCents, currency)}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          {editable ? (
            <QuantityStepper
              quantity={item.quantity}
              disabled={isBusy}
              label={`${item.product.name} quantity`}
              onChange={(quantity) =>
                updateItem.mutate(
                  { itemId: item.id, quantity },
                  { onError: onError('Could not update quantity') },
                )
              }
            />
          ) : (
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#8A7F6A]">
              Qty {item.quantity}
            </p>
          )}

          <div className="flex items-center gap-4">
            {/* Unit price only earns its space when the line has several units. */}
            {item.quantity > 1 && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#A79C86]">
                {formatMoney(item.unitPriceCents, currency)} each
              </span>
            )}

            {editable && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  removeItem.mutate(item.id, {
                    onError: onError('Could not remove item'),
                  })
                }
                className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#8A7F6A] transition-colors hover:text-[#8A2E1E] disabled:cursor-not-allowed"
              >
                {removeItem.isPending ? (
                  <Loader2 size={12} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 size={12} aria-hidden />
                )}
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
