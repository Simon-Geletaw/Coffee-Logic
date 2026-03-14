'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getProducts, updateProduct as updateProductRequest } from '@/features/products/api';
import { ROAST_OPTIONS } from '@/features/products/constants';
import { emptyProductForm, mapProductToForm, type Product, type ProductForm } from '@/features/products/types';
import { AdminShell } from '@/features/ui/admin-shell';
import { AdminSessionGate } from '@/features/auth/components/admin-session-gate';

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
    <AdminSessionGate requiredRole="admin">
      <AdminShell
        currentPath="/manage-products"
        title="Manage Products"
        subtitle="Update existing product records and keep your catalog accurate."
      >
        <section className="panel fade-up mb-6 p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">Select Product</h2>
            <p className="mt-1 text-sm text-slate-600">Choose a product and edit its fields below.</p>
          </div>

          <div className="w-full sm:w-56">
            <label htmlFor="roast" className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-500">
              Roast
            </label>
            <select id="roast" className="field" value={roast} onChange={(event) => setRoast(event.target.value)}>
              <option value="">All</option>
              {ROAST_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option[0].toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="text-sm text-slate-600">Loading products...</p>}
        {error && <p className="status-alert">{error}</p>}

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProductId(product.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedProductId === product.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{product.name}</h3>
                  <span className="chip">{product.roast}</span>
                </div>
                <p className="text-xs text-slate-500">ID: {product.id}</p>
              </button>
            ))}
          </div>
        )}
        </section>

        <section className="panel fade-up p-6 md:p-7">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 md:text-2xl">Edit Product Details</h2>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-700">
              Coffee Name
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="field"
                placeholder="Product name"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Roast Level
              <input
                value={form.roastLevel}
                onChange={(event) => setForm((prev) => ({ ...prev, roastLevel: event.target.value }))}
                className="field"
                placeholder="light / medium / dark"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Grind
              <input
                value={form.grind}
                onChange={(event) => setForm((prev) => ({ ...prev, grind: event.target.value }))}
                className="field"
                placeholder="grind"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Origin
              <input
                value={form.origin}
                onChange={(event) => setForm((prev) => ({ ...prev, origin: event.target.value }))}
                className="field"
                placeholder="origin"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Process
              <input
                value={form.process}
                onChange={(event) => setForm((prev) => ({ ...prev, process: event.target.value }))}
                className="field"
                placeholder="process"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-700">
              Caffeine
              <input
                value={form.caffeine}
                onChange={(event) => setForm((prev) => ({ ...prev, caffeine: event.target.value }))}
                className="field"
                placeholder="caffeine"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm text-slate-700">
            Description
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="field min-h-28"
              placeholder="description"
            />
          </label>

          {saveError && <p className="status-alert">{saveError}</p>}
          {saveMessage && <p className="status-ok">{saveMessage}</p>}

          <button type="submit" disabled={saving || !selectedProductId} className="btn-primary inline-flex w-fit items-center">
            {saving ? 'Updating...' : 'Update Product'}
          </button>
        </form>
        </section>
      </AdminShell>
    </AdminSessionGate>
  );
}
