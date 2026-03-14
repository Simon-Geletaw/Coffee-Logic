'use client';

import { useEffect, useState } from 'react';
import { deleteProduct, getProducts } from '@/features/products/api';
import type { Product } from '@/features/products/types';
import { AdminShell } from '@/features/ui/admin-shell';
import { AdminSessionGate } from '@/features/auth/components/admin-session-gate';

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
    <AdminSessionGate requiredRole="admin">
      <AdminShell
        currentPath="/delete-products"
        title="Delete Products"
        subtitle="Remove products safely from the catalog."
      >
        <section className="panel fade-up p-5 md:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">Select Product to Delete</h2>
          <p className="mt-1 text-sm text-slate-600">Choose one product card, then confirm deletion.</p>
        </div>

        {loading && <p className="text-sm text-slate-600">Loading products...</p>}
        {error && <p className="status-alert">{error}</p>}
        {successMessage && <p className="status-ok mb-4">{successMessage}</p>}

        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedId(product.id)}
                className={`rounded-2xl border p-5 text-left transition ${
                  selectedId === product.id
                    ? 'border-rose-300 bg-rose-50'
                    : 'border-slate-200 bg-white hover:border-rose-300'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{product.name}</h3>
                  <span className="chip">{product.roast}</span>
                </div>
                <p className="text-xs text-slate-500">ID: {product.id}</p>
              </button>
            ))}

            {products.length === 0 && <div className="panel-soft p-6 text-sm text-slate-600 md:col-span-2 xl:col-span-3">No products available to delete.</div>}
          </div>
        )}

        <div className="mt-6">
          <button type="button" onClick={handleDelete} disabled={!selectedId || deleting} className="btn-danger inline-flex w-fit items-center">
            {deleting ? 'Deleting...' : 'Delete Selected Product'}
          </button>
        </div>
        </section>
      </AdminShell>
    </AdminSessionGate>
  );
}
