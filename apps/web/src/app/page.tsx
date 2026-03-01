'use client';

import { useEffect, useState } from 'react';
import { AdminNav } from '@/features/products/components/admin-nav';
import { ROAST_OPTIONS } from '@/features/products/constants';
import { getProducts } from '@/features/products/api';
import type { Product } from '@/features/products/types';

export default function Home() {
  const [healthStatus, setHealthStatus] = useState('loading...');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [roast, setRoast] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/health`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Health API failed: ${response.status}`);
        }
        const health = await response.json();
        setHealthStatus(health.status ?? 'unknown');
      } catch {
        setHealthStatus('unavailable');
      }
    };

    fetchHealth();
  }, []);

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

  useEffect(() => {
    if (!products.length) {
      setSelectedProductId(null);
      return;
    }

    if (selectedProductId !== null && !products.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(null);
    }
  }, [products, selectedProductId]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;

  const healthBadgeStyles =
    healthStatus === 'ok'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
      : healthStatus === 'loading...'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
        : 'border-rose-400/30 bg-rose-500/10 text-rose-300';

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-8 md:px-10 lg:px-12">
        <header className="mb-10 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coffee Logic</p>
              <h1 className="text-lg font-semibold text-white md:text-xl">Coffee Admin Panel</h1>
            </div>
            <AdminNav currentPath="/" />
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${healthBadgeStyles}`}
          >
            API {healthStatus}
          </span>
        </header>

        <section className="mb-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <article className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-6 md:p-8">
            <p className="mb-3 inline-flex rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
              Freshly roasted beans
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-white md:text-4xl">
              Build beautiful coffee moments from a real catalog
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
              Browse live product data from your backend, filter by roast profile, and keep an eye on API health in one clean interface.
            </p>
          </article>

          <aside className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div>
              <p className="text-sm text-slate-400">Products Loaded</p>
              <p className="mt-1 text-3xl font-semibold text-white">{products.length}</p>
            </div>
            <div className="h-px w-full bg-slate-800" />
            <div>
              <p className="text-sm text-slate-400">Active Filter</p>
              <p className="mt-1 text-lg font-medium text-slate-200">{roast || 'all roasts'}</p>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white md:text-2xl">Coffee Collection</h3>
              <p className="mt-1 text-sm text-slate-400">Filter inventory by roast level and tap a coffee card to see full details.</p>
            </div>

            <div className="w-full sm:w-56">
              <label htmlFor="roast" className="mb-2 block text-xs uppercase tracking-wide text-slate-400">
                Roast
              </label>
              <select
                id="roast"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-offset-2 transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500"
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

          {loading && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-slate-900"
                />
              ))}
            </div>
          )}

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
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h4 className="line-clamp-1 text-base font-semibold text-white md:text-lg">{product.name}</h4>
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {product.roast}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">Single origin coffee selected for balanced flavor and clean finish.</p>
                </button>
              ))}

              {products.length === 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                  No products found for this roast. Try another filter.
                </div>
              )}
            </div>
          )}

          {selectedProduct && (
            <article className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 p-5">
              <h4 className="mb-4 text-lg font-semibold text-white">Selected Coffee Details</h4>
              <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">ID</dt>
                  <dd className="mt-1 font-medium text-slate-100">{selectedProduct.id}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
                  <dd className="mt-1 font-medium text-slate-100">{selectedProduct.name || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Roast</dt>
                  <dd className="mt-1 font-medium text-slate-100">{selectedProduct.roast || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Grind</dt>
                  <dd className="mt-1 font-medium text-slate-100">{selectedProduct.grind || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Origin</dt>
                  <dd className="mt-1 font-medium text-slate-100">{selectedProduct.origin || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Process</dt>
                  <dd className="mt-1 font-medium text-slate-100">{selectedProduct.process || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Caffeine</dt>
                  <dd className="mt-1 font-medium text-slate-100">{selectedProduct.caffeine || '-'}</dd>
                </div>
              </dl>
            </article>
          )}
        </section>
      </div>
    </main>
  );
}

