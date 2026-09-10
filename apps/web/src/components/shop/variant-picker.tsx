'use client';

import clsx from 'clsx';
import { formatMoney, formatWeight } from '@/lib/money';
import type { ProductVariant } from '@/lib/types';

type Props = {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variantId: string) => void;
  /** `compact` suits the shop card, `full` the product detail page. */
  size?: 'compact' | 'full';
  label?: string;
  className?: string;
};

/**
 * Size/price selector. Purely controlled — the parent owns the selection, so
 * the same component serves the shop card and the detail page.
 */
export default function VariantPicker({
  variants,
  selectedId,
  onSelect,
  size = 'compact',
  label = 'Size',
  className,
}: Props) {
  if (variants.length === 0) return null;

  // A single size is not a choice; show it as a plain price line instead of a
  // radio group the shopper cannot act on.
  if (variants.length === 1) {
    const only = variants[0];
    return (
      <p
        className={clsx(
          'text-[10px] font-medium uppercase tracking-[0.28em] text-[#8A7F6A]',
          className,
        )}
      >
        {formatWeight(only.weightGrams)}
      </p>
    );
  }

  return (
    <div className={className}>
      <span className="sr-only" id={`variant-label-${variants[0].id}`}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`variant-label-${variants[0].id}`}
        className={clsx(
          'flex flex-wrap gap-2',
          size === 'compact' ? 'justify-center' : 'justify-start',
        )}
      >
        {variants.map((variant) => {
          const isSelected = variant.id === selectedId;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(variant.id)}
              className={clsx(
                'border transition-colors duration-200',
                size === 'compact'
                  ? 'px-3 py-1.5 text-[10px] tracking-[0.18em]'
                  : 'px-4 py-2.5 text-[11px] tracking-[0.16em]',
                'font-medium uppercase',
                isSelected
                  ? 'border-[#B08A3E] bg-[#B08A3E]/12 text-[#6E5518]'
                  : 'border-[#E4DBC9] text-[#5A5346] hover:border-[#D3C4A6]',
              )}
            >
              {formatWeight(variant.weightGrams)}
              {size === 'full' && (
                <span className="ml-2 text-[#8A7F6A]">
                  {formatMoney(variant.priceCents, variant.currency)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
