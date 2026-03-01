'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getProducts, updateProduct as updateProductRequest } from '@/features/products/api';
import { AdminNav } from '@/features/products/components/admin-nav';
import { ROAST_OPTIONS } from '@/features/products/constants';
import { emptyProductForm, mapProductToForm, type Product, type ProductForm } from '@/features/products/types';

export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roast, setRoast] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProducts(roast);
        setProducts(data);
      } catch (err) {
        setProducts([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [roast]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  useEffect(() => {
    if (!selectedProduct) {
      setForm(emptyProductForm);
      return;
    }

    setForm(mapProductToForm(selectedProduct));
    setSaveMessage('');
    setSaveError('');
  }, [selectedProduct]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveMessage('');
    setSaveError('');

    if (!selectedProductId) {
      setSaveError('Select a product first.');
      return;
    }

    if (!form.name.trim()) {
      setSaveError('Product name is required.');
      return;
    }

    setSaving(true);

    try {
      const updated = await updateProductRequest(selectedProductId, form);
      setProducts((prev) =>
        prev.map((product) =>
          product.id === selectedProductId
            ? {
                ...product,
                name: updated.name ?? form.name,
                roast: updated.roastLevel ?? form.roastLevel,
                grind: updated.grind ?? form.grind,
                origin: updated.origin ?? form.origin,
                process: updated.process ?? form.process,
                caffeine: updated.caffeine ?? form.caffeine,
              }
            : product,
        ),
      );
      setSaveMessage('Product updated successfully.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10 lg:px-12">
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coffee Logic</p>
            <h1 className="text-lg font-semibold text-white md:text-xl">Admin Panel - Manage Products</h1>
          </div>
          <AdminNav currentPath="/manage-products" />
        </header>

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white md:text-2xl">Select Coffee to Edit</h2>
              <p className="mt-1 text-sm text-slate-400">Tap a product and update fields in the form below.</p>
            </div>
            <div className="w-full sm:w-56">
              <label htmlFor="roast" className="mb-2 block text-xs uppercase tracking-wide text-slate-400">
                Roast
              </label>
              <select
                id="roast"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                value={roast}
                onChange={(event) => setRoast(event.target.value)}
              >
                <option value="">All</option>
                {ROAST_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option[0].toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && <p className="text-sm text-slate-300">Loading products...</p>}
          {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

          {!loading && !error && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProductId(product.id)}
                  className={`rounded-2xl border bg-slate-900 p-5 text-left transition hover:border-slate-700 ${
                    selectedProductId === product.id ? 'border-slate-500' : 'border-slate-800'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="line-clamp-1 text-base font-semibold text-white">{product.name}</h3>
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {product.roast}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">ID: {product.id}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-7">
          <h2 className="mb-4 text-xl font-semibold text-white md:text-2xl">Edit Product</h2>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-300">
                Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="Product name"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Roast Level
                <input
                  value={form.roastLevel}
                  onChange={(event) => setForm((prev) => ({ ...prev, roastLevel: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="light / medium / dark"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Grind
                <input
                  value={form.grind}
                  onChange={(event) => setForm((prev) => ({ ...prev, grind: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="grind"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Origin
                <input
                  value={form.origin}
                  onChange={(event) => setForm((prev) => ({ ...prev, origin: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="origin"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Process
                <input
                  value={form.process}
                  onChange={(event) => setForm((prev) => ({ ...prev, process: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="process"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Caffeine
                <input
                  value={form.caffeine}
                  onChange={(event) => setForm((prev) => ({ ...prev, caffeine: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="caffeine"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-slate-300">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-28 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                placeholder="description"
              />
            </label>

            {saveError && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{saveError}</p>
            )}
            {saveMessage && (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{saveMessage}</p>
            )}

            <button
              type="submit"
              disabled={saving || !selectedProductId}
              className="inline-flex w-fit items-center rounded-xl border border-slate-700 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Updating...' : 'Update Product'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
