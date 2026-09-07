'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import ProductImage from '@/components/shop/product-image';
import VariantPicker from '@/components/shop/variant-picker';
import AddToCartButton from '@/components/shop/add-to-cart-button';
import QuantityStepper from '@/components/cart/quantity-stepper';
import Ornament from '@/app/(storefront)/sections/ornament';
import { useCatalogProduct } from '@/hooks/use-catalog';
import { formatMoney } from '@/lib/money';

/** Attribute rows, rendered only for the fields this product actually has. */
const ATTRIBUTES = [
  { key: 'origin', label: 'Origin' },
  { key: 'roastLevel', label: 'Roast' },
  { key: 'process', label: 'Process' },
  { key: 'grind', label: 'Grind' },
  { key: 'caffeine', label: 'Caffeine' },
] as const;

export default function ProductClient({ productId }: { productId: string }) {
  const { data: product, isLoading, isError, error } = useCatalogProduct(productId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  if (isLoading) {
    return (
      <main
        id="main-content"
        className="bg-cream-soft pb-24 pt-32 md:pt-40"
        aria-busy="true"
      >
        <div className="mx-auto grid w-full max-w-6xl animate-pulse gap-12 px-4 sm:px-6 md:grid-cols-2 md:px-8">
          <div className="h-[420px] bg-[#E4DBC9]/50" />
          <div className="space-y-5 pt-6">
            <div className="h-3 w-32 bg-[#E4DBC9]/60" />
            <div className="h-10 w-3/4 bg-[#E4DBC9]/60" />
            <div className="h-24 w-full bg-[#E4DBC9]/40" />
            <div className="h-12 w-48 bg-[#E4DBC9]/40" />
          </div>
        </div>
      </main>
    );
  }

  if (isError || !product) {
    return (
      <main
        id="main-content"
        className="flex min-h-screen items-center bg-cream-soft"
      >
        <div className="mx-auto w-full max-w-xl px-6 text-center">
          <p className="font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
            We couldn&apos;t find that coffee.
          </p>
          <p className="mt-4 text-sm leading-7 text-[#5A5346]">
            {error instanceof Error
              ? error.message
              : 'It may have sold out or been retired from the collection.'}
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

  const selected =
    product.variants.find((variant) => variant.id === selectedId) ??
    product.variants[0] ??
    null;

  const attributes = ATTRIBUTES.filter(({ key }) => Boolean(product[key]));

  return (
    <main id="main-content" className="bg-cream-soft pb-24 pt-32 md:pt-40">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-[#8A7F6A] transition-colors hover:text-[#2E2A20]"
        >
          <ArrowLeft size={13} aria-hidden />
          All coffees
        </Link>

        <div className="mt-8 grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="relative h-[380px] border border-[#E4DBC9] bg-white/40 sm:h-[460px] md:h-[560px]">
            <ProductImage
              name={product.name}
              imageUrl={product.imageUrl}
              priority
              sizes="(min-width: 768px) 45vw, 90vw"
              className="object-contain p-10 drop-shadow-[0_22px_28px_rgba(60,45,20,0.18)]"
            />
          </div>

          <div className="flex flex-col">
            <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[#2E2A20] sm:text-5xl">
              {product.name}
            </h1>

            {product.origin && (
              <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.3em] text-[#8A7F6A]">
                {product.origin}
              </p>
            )}

            <Ornament className="mt-6" />

            {product.description && (
              <p className="mt-7 max-w-md text-sm leading-7 text-[#5A5346]">
                {product.description}
              </p>
            )}

            {selected ? (
              <>
                <p className="mt-8 font-[family-name:var(--font-display)] text-4xl text-[#2E2A20]">
                  {formatMoney(selected.priceCents, selected.currency)}
                </p>

                <VariantPicker
                  className="mt-6"
                  variants={product.variants}
                  selectedId={selected.id}
                  onSelect={setSelectedId}
                  size="full"
                  label={`${product.name} size`}
                />

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <QuantityStepper
                    quantity={quantity}
                    onChange={setQuantity}
                    label={`${product.name} quantity`}
                  />
                  <AddToCartButton
                    variant={selected}
                    productName={product.name}
                    quantity={quantity}
                    className="flex-1 sm:flex-none sm:px-10"
                    onAdded={() => setQuantity(1)}
                  />
                </div>

                {selected.sku && (
                  <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-[#A79C86]">
                    SKU {selected.sku}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-8 text-sm leading-7 text-[#5A5346]">
                This coffee has no sizes available to order right now.
              </p>
            )}

            {attributes.length > 0 && (
              <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 border-t border-[#E4DBC9] pt-8">
                {attributes.map(({ key, label }) => (
                  <div key={key}>
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.26em] text-[#A79C86]">
                      {label}
                    </dt>
                    <dd className="mt-1.5 text-xs tracking-[0.06em] text-[#2E2A20]">
                      {product[key]}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
