'use client';

import { useEffect, useState } from 'react';
import { getProducts } from '@/features/products/api';
import type { Product } from '@/features/products/types';
import { AdminSessionGate } from '@/features/auth/components/admin-session-gate';
import Link from 'next/link';
import { AdminLayout } from '@/features/ui/admin-layout';
import { DataTable } from '@/features/ui/data-table';
import { IconPlus, IconTag, IconUsers } from '@/features/ui/icons';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getProducts({});
        setProducts(data);
      } catch (err) {
        setProducts([]);
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <AdminSessionGate requiredRole="admin">
      <AdminLayout
        title="Dashboard"
        subtitle="Quick overview and shortcuts."
        actions={
          <>
            <Link href="/users?new=1" className="btn-secondary inline-flex items-center gap-2 px-4 py-2">
              <IconUsers className="h-4 w-4" />
              New user
            </Link>
            <Link href="/products?new=1" className="btn-primary inline-flex items-center gap-2">
              <IconPlus className="h-4 w-4" />
              New product
            </Link>
          </>
        }
      >
        <section className="fade-up grid gap-4 lg:grid-cols-3">
          <article className="panel p-5 md:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
                <IconTag className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-slate-600">Active products</p>
                <p className="mt-1 text-3xl font-semibold text-slate-900">{loading ? '…' : products.length}</p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/products" className="btn-secondary inline-flex px-4 py-2">
                View products
              </Link>
            </div>
          </article>

          <article className="panel p-5 md:p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">Products preview</h2>
            <p className="mt-1 text-sm text-slate-600">First 5 products, sorted by name.</p>

            {error ? (
              <div className="mt-4 status-alert">
                <p className="font-semibold">Failed to load products</p>
                <p className="mt-1">{error}</p>
              </div>
            ) : null}

            <div className="mt-4">
              <DataTable
                loading={loading}
                colCount={3}
                empty={
                  !loading && !error && products.length === 0 ? (
                    <div className="text-sm text-slate-600">No products available yet.</div>
                  ) : undefined
                }
                header={
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Name</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Roast</th>
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Origin</th>
                    </tr>
                  </thead>
                }
              >
                {products.slice(0, 5).map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{product.name}</td>
                    <td className="px-4 py-3">
                      <span className="chip">{product.roast || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{product.origin || '-'}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </article>
        </section>
      </AdminLayout>
    </AdminSessionGate>
  );
}
