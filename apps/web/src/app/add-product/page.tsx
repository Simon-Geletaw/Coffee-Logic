'use client';

import { FormEvent, useState } from 'react';
import { createProduct } from '@/features/products/api';
import { AdminNav } from '@/features/products/components/admin-nav';
import { emptyProductForm, type ProductForm } from '@/features/products/types';

export default function AddProductPage() {
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!form.name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }

    setSubmitting(true);

    try {
      await createProduct(form);
      setForm(emptyProductForm);
      setSuccessMessage('Product created successfully.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-6 py-8 md:px-10 lg:px-12">
        <header className="mb-8 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coffee Logic</p>
            <h1 className="text-lg font-semibold text-white md:text-xl">Admin Panel - Add Product</h1>
          </div>
          <AdminNav currentPath="/add-product" />
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-7">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-300">
                Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="Ethiopian Yirgacheffe"
                  required
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
                  placeholder="whole bean"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-300">
                Origin
                <input
                  value={form.origin}
                  onChange={(event) => setForm((prev) => ({ ...prev, origin: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="Ethiopia"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-300">
                Process
                <input
                  value={form.process}
                  onChange={(event) => setForm((prev) => ({ ...prev, process: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="washed"
                />
              </label>

              <label className="grid gap-2 text-sm text-slate-300">
                Caffeine
                <input
                  value={form.caffeine}
                  onChange={(event) => setForm((prev) => ({ ...prev, caffeine: event.target.value }))}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                  placeholder="regular"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-slate-300">
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-28 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-slate-500"
                placeholder="Flavor notes and details"
              />
            </label>

            {errorMessage && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</p>
            )}

            {successMessage && (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{successMessage}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-fit items-center rounded-xl border border-slate-700 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Product'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
