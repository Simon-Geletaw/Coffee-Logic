'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/shop/product-grid';
import ShopFilters, { FILTER_KEYS } from '@/components/shop/shop-filters';
import Ornament from '@/app/(storefront)/sections/ornament';
import { useCatalogFacets, useCatalogProducts } from '@/hooks/use-catalog';
import type { CatalogQuery } from '@/lib/types';

/** Query params the shop reads; anything else in the URL is left untouched. */
const QUERY_KEYS = [...FILTER_KEYS, 'name', 'currency'] as const;

export default function ShopClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters live in the URL, so a filtered shop is shareable, survives a
  // refresh, and works with the back button for free.
  const query = useMemo<CatalogQuery>(() => {
    const next: CatalogQuery = {};
    for (const key of QUERY_KEYS) {
      const value = searchParams.get(key);
      if (value) next[key] = value;
    }
    return next;
  }, [searchParams]);

  const setQuery = useCallback(
    (next: CatalogQuery) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const key of QUERY_KEYS) {
        const value = next[key];
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const suffix = params.toString();
      router.replace(suffix ? `/shop?${suffix}` : '/shop', { scroll: false });
    },
    [router, searchParams],
  );

  const products = useCatalogProducts(query);
  const facets = useCatalogFacets();

  const hasFilters = Object.values(query).some(Boolean);

  return (
    <main id="main-content" className="bg-cream-soft pb-24 pt-32 md:pt-40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <header className="flex flex-col items-center text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#3B3A2C]">
            The Shop
          </p>
          <h1 className="featured-heading mt-4">
            Ethiopian coffee, roasted to order.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-[#5A5346]">
            Every bag is roasted in Addis and shipped within days. Choose your
            origin, your roast and the size that fits your week.
          </p>
          <Ornament className="mt-6" />
        </header>

        <ShopFilters
          className="mt-12"
          facets={facets.data}
          value={query}
          onChange={setQuery}
          isLoading={products.isFetching}
        />

        {products.isError ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="font-[family-name:var(--font-display)] text-3xl text-[#2E2A20]">
              We couldn&apos;t load the shop.
            </p>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[#5A5346]">
              {products.error instanceof Error
                ? products.error.message
                : 'Something went wrong reaching the roastery.'}
            </p>
            <button
              type="button"
              onClick={() => void products.refetch()}
              className="mt-7 border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-[#8A7F6A]">
              {products.isLoading
                ? 'Loading the collection…'
                : `${products.data?.length ?? 0} ${
                    (products.data?.length ?? 0) === 1 ? 'coffee' : 'coffees'
                  }`}
            </p>

            <ProductGrid
              className="mt-8"
              products={products.data ?? []}
              isLoading={products.isLoading}
              emptyState={
                <div className="mt-14 flex flex-col items-center text-center">
                  <p className="font-[family-name:var(--font-display)] text-3xl text-[#2E2A20]">
                    {hasFilters
                      ? 'No coffees match those filters.'
                      : 'The shelves are empty right now.'}
                  </p>
                  <p className="mt-3 max-w-sm text-sm leading-7 text-[#5A5346]">
                    {hasFilters
                      ? 'Try widening your search — or clear the filters to see the full collection.'
                      : 'New roasts are on their way. In the meantime, come and find us in Addis.'}
                  </p>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={() => setQuery({})}
                      className="mt-7 border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <Link
                      href="/#cafes"
                      className="mt-7 border border-[#B08A3E] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6E5518] transition-colors hover:bg-[#B08A3E]/12"
                    >
                      Visit a café
                    </Link>
                  )}
                </div>
              }
            />
          </>
        )}
      </div>
    </main>
  );
}
