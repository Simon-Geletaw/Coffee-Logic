'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/components/toast';
import { useProductsQuery } from '@/hooks/use-products';
import {
  useCreateVariantMutation,
  useDeleteVariantMutation,
  useUpdateVariantMutation,
  useVariantsQuery,
} from '@/hooks/use-variants';
import { formatMoney, formatWeight, SUPPORTED_CURRENCIES } from '@/lib/money';
import { variantSchema, type VariantInput } from '@/lib/validators';

type Props = { queryKeyPrefix: string };

/**
 * Variants are what make a product purchasable: a product with no variant has
 * no price and never appears in the shop. This screen is where sizes and
 * prices are created.
 *
 * Prices are entered in major units (245.00) and converted to the integer
 * minor units the API stores, so the admin never has to think in cents.
 */
export function VariantDashboard({ queryKeyPrefix }: Props) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [productFilter, setProductFilter] = useState('');

  const productsQuery = useProductsQuery('products-for-variants', {});
  const variantsQuery = useVariantsQuery(
    queryKeyPrefix,
    productFilter || undefined,
  );
  const createMutation = useCreateVariantMutation();
  const updateMutation = useUpdateVariantMutation();
  const deleteMutation = useDeleteVariantMutation();

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const variants = variantsQuery.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VariantInput>({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      productId: '',
      weightGrams: 250,
      price: 0,
      currency: 'ETB',
      sku: '',
    },
  });

  const onError = (title: string) => (error: unknown) =>
    toast(
      'error',
      title,
      error instanceof Error ? error.message : 'Unknown error',
    );

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      {
        productId: values.productId,
        weightGrams: values.weightGrams,
        // Round rather than truncate so 245.005 does not silently lose a cent.
        priceCents: Math.round(values.price * 100),
        currency: values.currency,
        sku: values.sku || undefined,
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          reset();
          toast('success', 'Variant added', 'The size is now on sale.');
        },
        onError: onError('Create failed'),
      },
    );
  });

  return (
    <section className="panel p-5 fade-up">
      <div className="section-header">
        <div>
          <h3 className="section-title">Product variants</h3>
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--muted)',
              marginTop: '0.15rem',
            }}
          >
            Sizes and prices. A product without an active variant will not
            appear in the shop.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="field"
            value={productFilter}
            onChange={(event) => setProductFilter(event.target.value)}
            aria-label="Filter by product"
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="btn"
            onClick={() => setShowAddForm((open) => !open)}
          >
            <Plus size={14} /> {showAddForm ? 'Cancel' : 'Add variant'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 md:grid-cols-5"
          style={{ marginTop: '1rem' }}
        >
          <label className="grid gap-1 text-sm">
            Product
            <select className="field" {...register('productId')}>
              <option value="">Select…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            {errors.productId && (
              <small style={{ color: 'var(--danger, #d66)' }}>
                {errors.productId.message}
              </small>
            )}
          </label>

          <label className="grid gap-1 text-sm">
            Weight (g)
            <input
              className="field"
              type="number"
              min={1}
              step={1}
              {...register('weightGrams', { valueAsNumber: true })}
            />
            {errors.weightGrams && (
              <small style={{ color: 'var(--danger, #d66)' }}>
                {errors.weightGrams.message}
              </small>
            )}
          </label>

          <label className="grid gap-1 text-sm">
            Price
            <input
              className="field"
              type="number"
              min={0}
              step="0.01"
              placeholder="245.00"
              {...register('price', { valueAsNumber: true })}
            />
            {errors.price && (
              <small style={{ color: 'var(--danger, #d66)' }}>
                {errors.price.message}
              </small>
            )}
          </label>

          <label className="grid gap-1 text-sm">
            Currency
            <select className="field" {...register('currency')}>
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            SKU (optional)
            <input className="field" placeholder="MEL-SID-250" {...register('sku')} />
          </label>

          <button
            type="submit"
            className="btn"
            disabled={createMutation.isPending}
            style={{ alignSelf: 'end' }}
          >
            {createMutation.isPending ? 'Saving…' : 'Save variant'}
          </button>
        </form>
      )}

      <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Price</th>
              <th>SKU</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {variantsQuery.isLoading && (
              <tr>
                <td colSpan={6}>Loading variants…</td>
              </tr>
            )}

            {!variantsQuery.isLoading && variants.length === 0 && (
              <tr>
                <td colSpan={6}>
                  No variants yet. Add one so the coffee can be bought.
                </td>
              </tr>
            )}

            {variants.map((variant) => (
              <tr key={variant.id} style={{ opacity: variant.isActive ? 1 : 0.55 }}>
                <td>{variant.product?.name ?? variant.productId}</td>
                <td>{formatWeight(variant.weightGrams)}</td>
                <td>{formatMoney(variant.priceCents, variant.currency)}</td>
                <td>{variant.sku ?? '—'}</td>
                <td>{variant.isActive ? 'On sale' : 'Retired'}</td>
                <td style={{ textAlign: 'right' }}>
                  {variant.isActive ? (
                    <button
                      type="button"
                      className="btn"
                      title="Retire this variant"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        deleteMutation.mutate(variant.id, {
                          onSuccess: () =>
                            toast(
                              'success',
                              'Variant retired',
                              'It no longer appears in the shop.',
                            ),
                          onError: onError('Delete failed'),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      title="Put this variant back on sale"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate(
                          { id: variant.id, payload: { isActive: true } },
                          {
                            onSuccess: () =>
                              toast('success', 'Variant restored', 'It is on sale again.'),
                            onError: onError('Restore failed'),
                          },
                        )
                      }
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
