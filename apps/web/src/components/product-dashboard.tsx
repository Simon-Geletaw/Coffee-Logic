'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { createProduct, deleteProduct, getProducts } from '@/lib/api';
import type { Product } from '@/lib/types';
import type { ProductInput } from '@/lib/validators';

type ProductDashboardProps = {
  queryKeyPrefix: string;
  canManage?: boolean;
};

type Filters = {
  name: string;
  roastLevel: string;
  grind: string;
  origin: string;
  caffeine: string;
  process: string;
};

type ProductDraft = {
  name: string;
  roastLevel: string;
  grind: string;
  origin: string;
  caffeine: string;
  process: string;
  description: string;
};

const emptyFilters: Filters = {
  name: '',
  roastLevel: '',
  grind: '',
  origin: '',
  caffeine: '',
  process: '',
};

const emptyProductDraft: ProductDraft = {
  name: '',
  roastLevel: '',
  grind: '',
  origin: '',
  caffeine: '',
  process: '',
  description: '',
};

export function ProductDashboard({ queryKeyPrefix, canManage = false }: ProductDashboardProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [newProduct, setNewProduct] = useState<ProductDraft>(emptyProductDraft);

  const normalizedFilters = useMemo(
    () => ({
      name: filters.name.trim(),
      roastLevel: filters.roastLevel.trim(),
      grind: filters.grind.trim(),
      origin: filters.origin.trim(),
      caffeine: filters.caffeine.trim(),
      process: filters.process.trim(),
    }),
    [filters],
  );

  const products = useQuery({
    queryKey: [queryKeyPrefix, normalizedFilters],
    queryFn: () => getProducts(normalizedFilters),
  });

  const visibleProducts = useMemo(() => {
    const rows = products.data ?? [];
    const nameFilter = normalizedFilters.name.toLowerCase();

    if (!nameFilter) {
      return rows;
    }

    return rows.filter((product) => (product.name ?? '').toLowerCase().includes(nameFilter));
  }, [products.data, normalizedFilters.name]);

  const createProductMutation = useMutation({
    mutationFn: (payload: ProductInput) => createProduct(payload),
    onSuccess: () => {
      setNewProduct(emptyProductDraft);
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });

  return (
    <>
      <section className="panel p-5">
        <h3 className="text-lg font-semibold">Product Filters</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
          <label className="relative lg:col-span-2">
            <Search size={15} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
            <input
              value={filters.name}
              onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
              className="field field-search"
              placeholder="Search product name"
            />
          </label>

          <input
            value={filters.roastLevel}
            onChange={(event) => setFilters((prev) => ({ ...prev, roastLevel: event.target.value }))}
            className="field"
            placeholder="Roast"
          />
          <input
            value={filters.grind}
            onChange={(event) => setFilters((prev) => ({ ...prev, grind: event.target.value }))}
            className="field"
            placeholder="Grind"
          />
          <input
            value={filters.origin}
            onChange={(event) => setFilters((prev) => ({ ...prev, origin: event.target.value }))}
            className="field"
            placeholder="Origin"
          />
          <input
            value={filters.caffeine}
            onChange={(event) => setFilters((prev) => ({ ...prev, caffeine: event.target.value }))}
            className="field"
            placeholder="Caffeine"
          />
          <input
            value={filters.process}
            onChange={(event) => setFilters((prev) => ({ ...prev, process: event.target.value }))}
            className="field md:col-span-2 lg:col-span-2"
            placeholder="Process"
          />
        </div>

        {canManage ? (
          <div className="mt-3 grid gap-2 border-t border-[color:var(--line)] pt-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              value={newProduct.name}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, name: event.target.value }))}
              className="field"
              placeholder="New product name"
            />
            <input
              value={newProduct.roastLevel}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, roastLevel: event.target.value }))}
              className="field"
              placeholder="Roast level"
            />
            <input
              value={newProduct.grind}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, grind: event.target.value }))}
              className="field"
              placeholder="Grind"
            />
            <input
              value={newProduct.origin}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, origin: event.target.value }))}
              className="field"
              placeholder="Origin"
            />
            <input
              value={newProduct.caffeine}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, caffeine: event.target.value }))}
              className="field"
              placeholder="Caffeine"
            />
            <input
              value={newProduct.process}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, process: event.target.value }))}
              className="field"
              placeholder="Process"
            />
            <input
              value={newProduct.description}
              onChange={(event) => setNewProduct((prev) => ({ ...prev, description: event.target.value }))}
              className="field md:col-span-2 lg:col-span-2"
              placeholder="Description"
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!newProduct.name.trim() || createProductMutation.isPending}
              onClick={() =>
                createProductMutation.mutate({
                  name: newProduct.name.trim(),
                  roastLevel: newProduct.roastLevel.trim(),
                  grind: newProduct.grind.trim(),
                  origin: newProduct.origin.trim(),
                  caffeine: newProduct.caffeine.trim(),
                  process: newProduct.process.trim(),
                  description: newProduct.description.trim(),
                })
              }
            >
              {createProductMutation.isPending ? 'Adding...' : 'Add Product'}
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel overflow-x-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Available Products</h3>
          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
            {products.isPending ? 'Loading' : `${visibleProducts.length} records`}
          </p>
        </div>

        {products.error ? (
          <p className="rounded-lg border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 px-3 py-2 text-sm text-[color:var(--danger)]">
            {products.error instanceof Error ? products.error.message : 'Failed to load products'}
          </p>
        ) : null}

        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="text-left text-[color:var(--muted)]">
              <th className="pb-2">Name</th>
              <th className="pb-2">Roast</th>
              <th className="pb-2">Grind</th>
              <th className="pb-2">Origin</th>
              <th className="pb-2">Caffeine</th>
              <th className="pb-2">Process</th>
              {canManage ? <th className="pb-2">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((product: Product) => (
              <tr key={product.id} className="border-t border-[color:var(--line)]">
                <td className="py-2 font-semibold">{product.name || '-'}</td>
                <td className="py-2">{product.roastLevel || '-'}</td>
                <td className="py-2">{product.grind || '-'}</td>
                <td className="py-2">{product.origin || '-'}</td>
                <td className="py-2">{product.caffeine || '-'}</td>
                <td className="py-2">{product.process || '-'}</td>
                {canManage ? (
                  <td className="py-2">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => deleteProductMutation.mutate(product.id)}
                      disabled={deleteProductMutation.isPending}
                    >
                      Remove
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
