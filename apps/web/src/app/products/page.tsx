'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminSessionGate } from '@/features/auth/components/admin-session-gate';
import { createProduct, deleteProduct, getProducts, type ProductListFilters, updateProduct } from '@/features/products/api';
import { ROAST_OPTIONS } from '@/features/products/constants';
import { emptyProductForm, type Product, type ProductForm } from '@/features/products/types';
import { downloadCsv } from '@/features/utils/csv';
import { ActionMenu } from '@/features/ui/action-menu';
import { AdminLayout } from '@/features/ui/admin-layout';
import { ConfirmDialog } from '@/features/ui/confirm-dialog';
import { DataTable } from '@/features/ui/data-table';
import { Drawer } from '@/features/ui/drawer';
import { IconDownload, IconPlus, IconSearch } from '@/features/ui/icons';
import { useToast } from '@/features/ui/toast';

const trimOrEmpty = (value: string) => value.trim();

const useDebouncedValue = <T,>(value: T, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
};

type EditDraft = ProductForm;
type DirtyMap = Record<keyof EditDraft, boolean>;

const emptyDirty: DirtyMap = {
  name: false,
  roastLevel: false,
  grind: false,
  origin: false,
  process: false,
  caffeine: false,
  description: false,
};

export default function ProductsPage() {
  const { pushToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    name: '',
    roastLevel: '',
    grind: '',
    origin: '',
    process: '',
    caffeine: '',
  });

  const debouncedName = useDebouncedValue(filters.name, 350);

  const appliedFilters = useMemo<ProductListFilters>(
    () => ({
      name: trimOrEmpty(debouncedName),
      roastLevel: trimOrEmpty(filters.roastLevel),
      grind: trimOrEmpty(filters.grind),
      origin: trimOrEmpty(filters.origin),
      process: trimOrEmpty(filters.process),
      caffeine: trimOrEmpty(filters.caffeine),
    }),
    [debouncedName, filters.caffeine, filters.grind, filters.origin, filters.process, filters.roastLevel],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [selected, setSelected] = useState<Product | null>(null);

  const [createForm, setCreateForm] = useState<ProductForm>(emptyProductForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState('');

  const [editDraft, setEditDraft] = useState<EditDraft>(emptyProductForm);
  const [editDirty, setEditDirty] = useState<DirtyMap>(emptyDirty);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);

  const grindOptions = useMemo(() => Array.from(new Set(products.map((p) => p.grind).filter(Boolean))).sort(), [products]);
  const originOptions = useMemo(() => Array.from(new Set(products.map((p) => p.origin).filter(Boolean))).sort(), [products]);
  const processOptions = useMemo(() => Array.from(new Set(products.map((p) => p.process).filter(Boolean))).sort(), [products]);
  const caffeineOptions = useMemo(() => Array.from(new Set(products.map((p) => p.caffeine).filter(Boolean))).sort(), [products]);

  const fetchProducts = async (nextFilters: ProductListFilters) => {
    setLoading(true);
    setError('');
    try {
      const data = await getProducts(nextFilters);
      setProducts(data);
    } catch (err) {
      setProducts([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      setDrawerMode('create');
      setDrawerOpen(true);
    }
  }, []);

  const openCreate = () => {
    setCreateForm(emptyProductForm);
    setCreateError('');
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const openEdit = (product: Product) => {
    setSelected(product);
    setEditDraft({
      name: product.name ?? '',
      roastLevel: product.roast ?? '',
      grind: product.grind ?? '',
      origin: product.origin ?? '',
      process: product.process ?? '',
      caffeine: product.caffeine ?? '',
      description: '',
    });
    setEditDirty(emptyDirty);
    setEditError('');
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const resetFilters = () => {
    setFilters({
      name: '',
      roastLevel: '',
      grind: '',
      origin: '',
      process: '',
      caffeine: '',
    });
  };

  const onSubmitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError('');

    if (!createForm.name.trim()) {
      setCreateError('Product name is required.');
      return;
    }

    setCreateBusy(true);
    try {
      await createProduct(createForm);
      pushToast({ kind: 'success', title: 'Product created', message: createForm.name.trim() });
      setDrawerOpen(false);
      setCreateForm(emptyProductForm);
      await fetchProducts(appliedFilters);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create product.');
    } finally {
      setCreateBusy(false);
    }
  };

  const onSubmitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditError('');

    if (!selected) {
      setEditError('No product selected.');
      return;
    }

    if (editDirty.name && !editDraft.name.trim()) {
      setEditError('Product name cannot be empty.');
      return;
    }

    const patch: Partial<ProductForm> = {};
    (Object.keys(editDirty) as Array<keyof DirtyMap>).forEach((key) => {
      if (!editDirty[key]) return;
      patch[key] = editDraft[key];
    });

    if (Object.keys(patch).length === 0) {
      pushToast({ kind: 'info', title: 'No changes', message: 'Nothing to save.' });
      setDrawerOpen(false);
      return;
    }

    setEditBusy(true);
    try {
      await updateProduct(selected.id, patch);
      pushToast({ kind: 'success', title: 'Product updated', message: selected.name });
      setDrawerOpen(false);
      await fetchProducts(appliedFilters);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update product.');
    } finally {
      setEditBusy(false);
    }
  };

  const requestArchive = (product: Product) => {
    setArchiveTarget(product);
    setConfirmOpen(true);
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setConfirmBusy(true);
    try {
      await deleteProduct(archiveTarget.id);
      pushToast({ kind: 'success', title: 'Product archived', message: archiveTarget.name });
      setConfirmOpen(false);
      setArchiveTarget(null);
      await fetchProducts(appliedFilters);
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Archive failed',
        message: err instanceof Error ? err.message : 'Failed to archive product.',
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  const exportCsv = () => {
    const filename = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(
      filename,
      ['id', 'name', 'roast', 'grind', 'origin', 'process', 'caffeine'],
      products.map((p) => [p.id, p.name, p.roast, p.grind, p.origin, p.process, p.caffeine]),
    );
  };

  const filterBar = (
    <div className="panel-soft grid gap-3 p-4 md:grid-cols-[1.2fr_repeat(2,0.9fr)] lg:grid-cols-[1.3fr_repeat(5,0.8fr)_auto]">
      <label className="grid gap-2 text-sm text-slate-700">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Search</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch className="h-4 w-4" />
          </span>
          <input
            value={filters.name}
            onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
            className="field pl-10"
            placeholder="Search by name"
          />
        </div>
      </label>

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Roast</span>
        <select
          className="field"
          value={filters.roastLevel}
          onChange={(event) => setFilters((prev) => ({ ...prev, roastLevel: event.target.value }))}
        >
          <option value="">All</option>
          {ROAST_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option[0].toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Grind</span>
        <input
          value={filters.grind}
          onChange={(event) => setFilters((prev) => ({ ...prev, grind: event.target.value }))}
          className="field"
          placeholder="whole bean"
          list="grind-options"
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Origin</span>
        <input
          value={filters.origin}
          onChange={(event) => setFilters((prev) => ({ ...prev, origin: event.target.value }))}
          className="field"
          placeholder="Ethiopia"
          list="origin-options"
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Process</span>
        <input
          value={filters.process}
          onChange={(event) => setFilters((prev) => ({ ...prev, process: event.target.value }))}
          className="field"
          placeholder="washed"
          list="process-options"
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-700">
        <span className="text-xs uppercase tracking-[0.18em] text-slate-500">Caffeine</span>
        <input
          value={filters.caffeine}
          onChange={(event) => setFilters((prev) => ({ ...prev, caffeine: event.target.value }))}
          className="field"
          placeholder="regular"
          list="caffeine-options"
        />
      </label>

      <div className="flex items-end">
        <button type="button" className="btn-secondary w-full px-4 py-2" onClick={resetFilters}>
          Reset
        </button>
      </div>

      <datalist id="grind-options">
        {grindOptions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="origin-options">
        {originOptions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="process-options">
        {processOptions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <datalist id="caffeine-options">
        {caffeineOptions.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
    </div>
  );

  const actions = (
    <>
      <button type="button" className="btn-secondary inline-flex items-center gap-2 px-4 py-2" onClick={exportCsv}>
        <IconDownload className="h-4 w-4" />
        Export CSV
      </button>
      <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
        <IconPlus className="h-4 w-4" />
        New product
      </button>
    </>
  );

  const emptyState = (
    <div className="grid gap-2 text-center text-sm text-slate-600">
      <p className="font-semibold text-slate-900">No products found</p>
      <p>Try clearing filters or create a new product.</p>
      <div className="mt-2 flex justify-center">
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openCreate}>
          <IconPlus className="h-4 w-4" />
          New product
        </button>
      </div>
    </div>
  );

  return (
    <AdminSessionGate requiredRole="admin">
      <AdminLayout
        title="Products"
        subtitle="Search, filter, create, edit, and archive products."
        actions={actions}
        searchSlot={filterBar}
      >
        {error ? (
          <section className="status-alert">
            <p className="font-semibold">Failed to load products</p>
            <p className="mt-1">{error}</p>
            <div className="mt-4">
              <button type="button" className="btn-secondary px-4 py-2" onClick={() => fetchProducts(appliedFilters)}>
                Retry
              </button>
            </div>
          </section>
        ) : null}

        <section className="panel fade-up p-5 md:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">Product list</h2>
              <p className="mt-1 text-sm text-slate-600">
                {loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'} loaded`}
              </p>
            </div>
          </div>

          <DataTable
            loading={loading}
            empty={!loading && !error && products.length === 0 ? emptyState : undefined}
            colCount={7}
            header={
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Roast</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grind</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Origin</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Process</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Caffeine</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
            }
          >
            {products.map((product) => (
              <tr key={product.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">ID: {product.id}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="chip">{product.roast || '-'}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{product.grind || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{product.origin || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{product.process || '-'}</td>
                <td className="px-4 py-3 text-slate-700">{product.caffeine || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <ActionMenu
                    items={[
                      { label: 'Edit', onSelect: () => openEdit(product) },
                      { label: 'Archive', tone: 'danger', onSelect: () => requestArchive(product) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </DataTable>
        </section>

        <Drawer
          open={drawerOpen}
          title={drawerMode === 'create' ? 'New product' : 'Edit product'}
          description={
            drawerMode === 'create'
              ? 'Create a product visible to storefront customers.'
              : 'Patch updates only send fields you change. Description is not loaded from the list endpoint.'
          }
          onClose={() => setDrawerOpen(false)}
          footer={
            drawerMode === 'create' ? (
              <div className="flex items-center justify-between gap-3">
                {createError ? <p className="text-sm font-semibold text-rose-700">{createError}</p> : <span />}
                <button type="submit" form="create-product-form" className="btn-primary" disabled={createBusy}>
                  {createBusy ? 'Saving…' : 'Create'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                {editError ? <p className="text-sm font-semibold text-rose-700">{editError}</p> : <span />}
                <button type="submit" form="edit-product-form" className="btn-primary" disabled={editBusy}>
                  {editBusy ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )
          }
        >
          {drawerMode === 'create' ? (
            <form id="create-product-form" className="grid gap-4" onSubmit={onSubmitCreate}>
              <label className="grid gap-2 text-sm text-slate-700">
                Coffee name
                <input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="field"
                  placeholder="Midnight Bloom Espresso"
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  Roast level
                  <input
                    value={createForm.roastLevel}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, roastLevel: event.target.value }))}
                    className="field"
                    placeholder="light / medium / dark"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Grind
                  <input
                    value={createForm.grind}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, grind: event.target.value }))}
                    className="field"
                    placeholder="whole bean"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Origin
                  <input
                    value={createForm.origin}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, origin: event.target.value }))}
                    className="field"
                    placeholder="Ethiopia"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Process
                  <input
                    value={createForm.process}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, process: event.target.value }))}
                    className="field"
                    placeholder="washed"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Caffeine
                  <input
                    value={createForm.caffeine}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, caffeine: event.target.value }))}
                    className="field"
                    placeholder="regular"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm text-slate-700">
                Flavor story
                <textarea
                  value={createForm.description}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="field min-h-28"
                  placeholder="Velvety cocoa, toasted hazelnut, sweet citrus finish"
                />
              </label>
            </form>
          ) : (
            <form id="edit-product-form" className="grid gap-4" onSubmit={onSubmitEdit}>
              <label className="grid gap-2 text-sm text-slate-700">
                Coffee name
                <input
                  value={editDraft.name}
                  onChange={(event) => {
                    setEditDirty((prev) => ({ ...prev, name: true }));
                    setEditDraft((prev) => ({ ...prev, name: event.target.value }));
                  }}
                  className="field"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                  Roast level
                  <input
                    value={editDraft.roastLevel}
                    onChange={(event) => {
                      setEditDirty((prev) => ({ ...prev, roastLevel: true }));
                      setEditDraft((prev) => ({ ...prev, roastLevel: event.target.value }));
                    }}
                    className="field"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Grind
                  <input
                    value={editDraft.grind}
                    onChange={(event) => {
                      setEditDirty((prev) => ({ ...prev, grind: true }));
                      setEditDraft((prev) => ({ ...prev, grind: event.target.value }));
                    }}
                    className="field"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Origin
                  <input
                    value={editDraft.origin}
                    onChange={(event) => {
                      setEditDirty((prev) => ({ ...prev, origin: true }));
                      setEditDraft((prev) => ({ ...prev, origin: event.target.value }));
                    }}
                    className="field"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Process
                  <input
                    value={editDraft.process}
                    onChange={(event) => {
                      setEditDirty((prev) => ({ ...prev, process: true }));
                      setEditDraft((prev) => ({ ...prev, process: event.target.value }));
                    }}
                    className="field"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                  Caffeine
                  <input
                    value={editDraft.caffeine}
                    onChange={(event) => {
                      setEditDirty((prev) => ({ ...prev, caffeine: true }));
                      setEditDraft((prev) => ({ ...prev, caffeine: event.target.value }));
                    }}
                    className="field"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm text-slate-700">
                Description (optional)
                <textarea
                  value={editDraft.description}
                  onChange={(event) => {
                    setEditDirty((prev) => ({ ...prev, description: true }));
                    setEditDraft((prev) => ({ ...prev, description: event.target.value }));
                  }}
                  className="field min-h-28"
                  placeholder="Only sent if you change it."
                />
              </label>
            </form>
          )}
        </Drawer>

        <ConfirmDialog
          open={confirmOpen}
          title="Archive product?"
          description={`This removes the product from active listings. You can’t undo this without database access.${archiveTarget?.name ? `\n\nProduct: ${archiveTarget.name}` : ''}`}
          confirmLabel="Archive"
          confirmTone="danger"
          busy={confirmBusy}
          onConfirm={confirmArchive}
          onClose={() => {
            if (confirmBusy) return;
            setConfirmOpen(false);
            setArchiveTarget(null);
          }}
        />
      </AdminLayout>
    </AdminSessionGate>
  );
}
