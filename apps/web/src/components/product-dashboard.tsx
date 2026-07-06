'use client';

import { useMemo, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useProductsQuery, useCreateProductMutation, useDeleteProductMutation } from '@/hooks/use-products';
import { ProductTable } from '@/components/products/product-table';
import { ProductFilters, type ProductFiltersState, emptyFilters } from '@/components/products/product-filters';
import { ProductAddForm, type ProductDraft } from '@/components/products/product-add-form';
import { Pagination } from '@/components/pagination';
import { ProductEditDrawer } from '@/components/product-edit-modal';
import { useToast } from '@/components/toast';

const PAGE_SIZE = 10;

function buildApiFilters(filters: ProductFiltersState): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v.length > 0),
  ) as Record<string, string>;
}

type ProductDashboardProps = {
  queryKeyPrefix: string;
  canManage?: boolean;
};

export function ProductDashboard({ queryKeyPrefix, canManage = false }: ProductDashboardProps) {
  const { toast } = useToast();

  const [filters, setFilters] = useState<ProductFiltersState>(emptyFilters);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);

  const apiFilters = useMemo(() => buildApiFilters(filters), [filters]);

  // Hook integrations
  const productsQuery = useProductsQuery(queryKeyPrefix, apiFilters);
  const createMutation = useCreateProductMutation(queryKeyPrefix);
  const deleteMutation = useDeleteProductMutation(queryKeyPrefix);

  const data = productsQuery.data ?? [];

  // Pagination config
  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = useMemo(
    () => data.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [data, safePage],
  );

  const handleFilterChange = useCallback((key: keyof ProductFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleCreateProduct = (draft: ProductDraft) => {
    createMutation.mutate(draft, {
      onSuccess: () => {
        setShowAddForm(false);
        toast('success', 'Product added', 'The new product has been created.');
      },
      onError: (err: unknown) => {
        toast('error', 'Create failed', err instanceof Error ? err.message : 'Unknown error');
      },
    });
  };

  const handleDeleteProduct = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast('success', 'Product removed', 'The product has been deleted.'),
      onError: (err) => toast('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error'),
    });
  };

  return (
    <>
      {editingProduct && (
        <ProductEditDrawer
          product={editingProduct}
          queryKeyPrefix={queryKeyPrefix}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* ── Filters & Add Product Section ── */}
      <section className="panel p-5 fade-up">
        <div className="section-header">
          <div>
            <h3 className="section-title">Filter Products</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
              Filters are sent directly to the API
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowAddForm((s) => !s)}
            >
              <Plus size={14} />
              {showAddForm ? 'Cancel' : 'Add Product'}
            </button>
          )}
        </div>

        <ProductFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onClear={() => { setFilters(emptyFilters); setPage(1); }}
        />

        {canManage && showAddForm && (
          <ProductAddForm
            isPending={createMutation.isPending}
            onCancel={() => setShowAddForm(false)}
            onSubmit={handleCreateProduct}
          />
        )}
      </section>

      {/* ── Products Table Section ── */}
      <section className="panel p-5 fade-up">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 className="section-title">Products</h3>
            {!productsQuery.isPending && (
              <span className="badge badge-muted">{data.length}</span>
            )}
          </div>
          {productsQuery.isFetching && !productsQuery.isPending && (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Refreshing…</span>
          )}
        </div>

        {productsQuery.isError && (
          <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            {productsQuery.error instanceof Error ? productsQuery.error.message : 'Failed to load products.'}
          </div>
        )}

        <div className="table-container">
          <ProductTable
            data={pageData}
            isPending={productsQuery.isPending}
            canManage={canManage}
            isFilterEmpty={Object.values(apiFilters).length === 0}
            onEdit={setEditingProduct}
            onDelete={handleDeleteProduct}
            isDeleting={deleteMutation.isPending}
          />
        </div>

        {!productsQuery.isPending && data.length > PAGE_SIZE && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={data.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </section>
    </>
  );
}
