'use client';
import { useEffect, useState } from 'react';
import { deleteProduct, getProducts } from '@/features/products/api';
import { AdminNav } from '@/features/products/components/admin-nav';
import type { Product } from '@/features/products/types';

export default function DeleteProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProducts();
        setProducts(data);
      } catch (fetchError) {
        setProducts([]);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleDelete = async () => {
    if (!selectedId) return;

    setDeleting(true);
    setError('');
    setSuccessMessage('');

    try {
      await deleteProduct(selectedId);
      setProducts((prev) => prev.filter((product) => product.id !== selectedId));
      setSelectedId('');
      setSuccessMessage('Product deleted successfully.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10 lg:px-12">
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coffee Logic</p>
            <h1 className="text-lg font-semibold text-white md:text-xl">Admin Panel - Delete Products</h1>
          </div>
          <AdminNav currentPath="/delete-products" />
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-white md:text-2xl">Select Product to Delete</h2>
            <p className="mt-1 text-sm text-slate-400">Pick a product, then click delete to remove it permanently.</p>
          </div>

          {loading && <p className="text-sm text-slate-300">Loading products...</p>}
          {error && <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
          {successMessage && (
            <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </p>
          )}

          {!loading && !error && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedId(product.id)}
                  className={`rounded-2xl border bg-slate-900 p-5 text-left transition hover:border-slate-700 ${
                    selectedId === product.id ? 'border-rose-500' : 'border-slate-800'
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

              {products.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                  No products available to delete.
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!selectedId || deleting}
              className="inline-flex w-fit items-center rounded-xl border border-rose-600 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Deleting...' : 'Delete Selected Product'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}