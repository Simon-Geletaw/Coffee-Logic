'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useState } from 'react';
import ProductImage from '@/components/shop/product-image';
import VariantPicker from '@/components/shop/variant-picker';
import AddToCartButton from '@/components/shop/add-to-cart-button';
import Ornament from '@/app/(storefront)/sections/ornament';
import { formatMoney } from '@/lib/money';
import type { CatalogProduct } from '@/lib/types';

type Props = {
  product: CatalogProduct;
  /** Hide the buy controls where the card is used purely as a link. */
  showAddToCart?: boolean;
  priority?: boolean;
  className?: string;
};

/**
 * One coffee in the shop grid. Prop-driven and self-contained: it owns only
 * which size is selected, and delegates the purchase to AddToCartButton.
 */
export default function ProductCard({
  product,
  showAddToCart = true,
  priority = false,
  className,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    product.variants[0]?.id ?? null,
  );

  const selected =
    product.variants.find((variant) => variant.id === selectedId) ??
    product.variants[0] ??
    null;

  const subtitle = [product.origin, product.roastLevel]
    .filter(Boolean)
    .join(' · ');

  return (
    <article
      className={clsx(
        'group flex h-full flex-col items-center border border-[#E4DBC9] bg-white/40 px-6 pb-8 pt-9 text-center transition-all duration-300',
        'hover:border-[#D3C4A6] hover:shadow-[0_18px_36px_rgba(63,48,22,0.10)]',
        className,
      )}
    >
      <Link
        href={`/shop/${product.id}`}
        className="flex w-full flex-col items-center"
      >
        <div className="relative flex h-56 w-full items-center justify-center sm:h-60">
          <ProductImage
            name={product.name}
            imageUrl={product.imageUrl}
            priority={priority}
            sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 90vw"
            className="object-contain drop-shadow-[0_18px_22px_rgba(60,45,20,0.18)] transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>

        <h3 className="mt-7 text-sm font-semibold uppercase tracking-[0.3em] text-[#2E2A20]">
          {product.name}
        </h3>
        {subtitle && (
          <p className="mt-2.5 text-[10px] font-medium uppercase tracking-[0.28em] text-[#8A7F6A]">
            {subtitle}
          </p>
        )}
        <Ornament className="mt-4" />
      </Link>

      {selected && (
        <p className="mt-4 font-[family-name:var(--font-display)] text-2xl text-[#2E2A20]">
          {formatMoney(selected.priceCents, selected.currency)}
        </p>
      )}

      {/* Pushes the controls to the card's base so a grid row stays aligned
          however long the names run. */}
      <div className="mt-auto w-full pt-5">
        <VariantPicker
          variants={product.variants}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          size="compact"
          label={`${product.name} size`}
        />

        {showAddToCart && (
          <AddToCartButton
            variant={selected}
            productName={product.name}
            className="mt-5 w-full"
          />
        )}
      </div>
    </article>
  );
}
