'use client';

import clsx from 'clsx';
import ProductCard from '@/components/shop/product-card';
import Reveal from '@/components/reveal';
import type { CatalogProduct } from '@/lib/types';

type Props = {
  products: CatalogProduct[];
  isLoading?: boolean;
  /** Rendered when the catalogue returns nothing for the active filters. */
  emptyState?: React.ReactNode;
  showAddToCart?: boolean;
  className?: string;
};

function CardPlaceholder() {
  return (
    <div className="flex h-full animate-pulse flex-col items-center border border-[#E4DBC9] bg-white/30 px-6 pb-8 pt-9">
      <div className="h-56 w-full bg-[#E4DBC9]/50 sm:h-60" />
      <div className="mt-7 h-3 w-2/3 bg-[#E4DBC9]/60" />
      <div className="mt-3 h-2.5 w-1/2 bg-[#E4DBC9]/40" />
      <div className="mt-auto w-full pt-8">
        <div className="h-10 w-full bg-[#E4DBC9]/40" />
      </div>
    </div>
  );
}

/** Responsive layout for a set of products. Presentational only. */
export default function ProductGrid({
  products,
  isLoading = false,
  emptyState,
  showAddToCart = true,
  className,
}: Props) {
  const gridClass = clsx(
    'grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 lg:gap-10',
    className,
  );

  // Only show skeletons on the first load; a filter change keeps the previous
  // results on screen (react-query placeholderData) rather than flashing.
  if (isLoading && products.length === 0) {
    return (
      <div className={gridClass} aria-busy="true">
        {Array.from({ length: 6 }, (_, index) => (
          <CardPlaceholder key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div className={gridClass}>
      {products.map((product, index) => (
        <Reveal
          key={product.id}
          delay={Math.min(index, 5) * 90}
          className="tilt-card"
        >
          <ProductCard
            product={product}
            showAddToCart={showAddToCart}
            priority={index < 3}
          />
        </Reveal>
      ))}
    </div>
  );
}
