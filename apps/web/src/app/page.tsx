'use client';

import { useEffect, useState } from 'react';
import { ROAST_OPTIONS } from '@/features/products/constants';
import { getProducts } from '@/features/products/api';
import type { Product } from '@/features/products/types';
import { AdminShell } from '@/features/ui/admin-shell';

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

  const healthBadgeClass =
    healthStatus === 'ok'
      ? 'status-ok'
      : healthStatus === 'loading...'
        ? 'rounded-lg border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200'
        : 'rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-200';

  return (
    <AdminShell
      currentPath="/"
      title="Coffee Intelligence Overview"
      subtitle="Track API health, scan your catalog, and review product details from a premium control room."
      badge={<span className={healthBadgeClass}>API {healthStatus}</span>}
    >
      <section className="fade-up mb-7 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <article className="panel p-6 md:p-7">
          <span className="chip">Signature Workspace</span>
          <h2 className="mt-4 text-3xl font-semibold text-slate-100 md:text-4xl">Attractive control center for coffee brands</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
            Keep product records current with live filters and rich detail previews. The layout is tuned for both desktop and mobile admin workflows.
          </p>
        </article>

        <aside className="panel-soft p-6">
          <div>
            <p className="text-sm text-slate-300/85">Products Loaded</p>
            <p className="mt-1 text-4xl font-semibold text-slate-100">{products.length}</p>
          </div>
          <div className="my-4 h-px bg-slate-500/35" />
          <div>
            <p className="text-sm text-slate-300/85">Active Roast Filter</p>
            <p className="mt-1 text-base font-semibold text-cyan-100">{roast || 'all roasts'}</p>
          </div>
        </aside>
      </section>

      <section className="panel fade-up p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-100 md:text-2xl">Inventory Collection</h3>
            <p className="mt-1 text-sm text-slate-300/80">Filter by roast profile and open any card for complete product details.</p>
          </div>

          <div className="w-full sm:w-60">
            <label htmlFor="roast" className="mb-2 block text-xs uppercase tracking-[0.18em] text-slate-300/70">
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

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-500/30 bg-slate-900/55" />
            ))}
          </div>
        )}

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
                    ? 'border-cyan-200/60 bg-cyan-100/10'
                    : 'border-slate-500/35 bg-slate-900/55 hover:border-cyan-300/45'
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="line-clamp-1 text-base font-semibold text-slate-100 md:text-lg">{product.name}</h4>
                  <span className="chip">{product.roast}</span>
                </div>
                <p className="text-sm text-slate-300/75">Single-origin profile curated for balanced flavor and aromatic finish.</p>
              </button>
            ))}

            {products.length === 0 && (
              <div className="panel-soft p-6 text-sm text-slate-300 md:col-span-2 xl:col-span-3">
                No products found for this filter.
              </div>
            )}
          </div>
        )}

        {selectedProduct && (
          <article className="panel-soft mt-5 p-5">
            <h4 className="text-lg font-semibold text-slate-100">Selected Product</h4>
            <dl className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">ID</dt>
                <dd className="mt-1 font-medium text-slate-100">{selectedProduct.id}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Name</dt>
                <dd className="mt-1 font-medium text-slate-100">{selectedProduct.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Roast</dt>
                <dd className="mt-1 font-medium text-slate-100">{selectedProduct.roast || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Grind</dt>
                <dd className="mt-1 font-medium text-slate-100">{selectedProduct.grind || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Origin</dt>
                <dd className="mt-1 font-medium text-slate-100">{selectedProduct.origin || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Process</dt>
                <dd className="mt-1 font-medium text-slate-100">{selectedProduct.process || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Caffeine</dt>
                <dd className="mt-1 font-medium text-slate-100">{selectedProduct.caffeine || '-'}</dd>
              </div>
            </dl>
          </article>
        )}
      </section>
    </AdminShell>
  );
}
