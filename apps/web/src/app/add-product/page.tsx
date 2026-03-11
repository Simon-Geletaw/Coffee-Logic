'use client';

import { FormEvent, useState } from 'react';
import { createProduct } from '@/features/products/api';
import { emptyProductForm, type ProductForm } from '@/features/products/types';
import { AdminShell } from '@/features/ui/admin-shell';

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
    <AdminShell
      currentPath="/add-product"
      title="Launch New Coffee Product"
      subtitle="Add an attractive product profile with roast, process, and tasting details."
    >
      <section className="panel fade-up p-6 md:p-7">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-200">
              Coffee Name
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="field"
              placeholder="Midnight Bloom Espresso"
                required
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Roast Level
              <input
                value={form.roastLevel}
                onChange={(event) => setForm((prev) => ({ ...prev, roastLevel: event.target.value }))}
                className="field"
                placeholder="light / medium / dark"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Grind
              <input
                value={form.grind}
                onChange={(event) => setForm((prev) => ({ ...prev, grind: event.target.value }))}
                className="field"
                placeholder="whole bean"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Origin
              <input
                value={form.origin}
                onChange={(event) => setForm((prev) => ({ ...prev, origin: event.target.value }))}
                className="field"
                placeholder="Ethiopia"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Process
              <input
                value={form.process}
                onChange={(event) => setForm((prev) => ({ ...prev, process: event.target.value }))}
                className="field"
                placeholder="washed"
              />
            </label>

            <label className="grid gap-2 text-sm text-slate-200">
              Caffeine
              <input
                value={form.caffeine}
                onChange={(event) => setForm((prev) => ({ ...prev, caffeine: event.target.value }))}
                className="field"
                placeholder="regular"
              />
            </label>
          </div>

            <label className="grid gap-2 text-sm text-slate-200">
              Flavor Story
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="field min-h-28"
              placeholder="Velvety cocoa, toasted hazelnut, and sweet citrus finish"
            />
          </label>

          {errorMessage && <p className="status-alert">{errorMessage}</p>}
          {successMessage && <p className="status-ok">{successMessage}</p>}

          <button type="submit" disabled={submitting} className="btn-primary inline-flex w-fit items-center">
            {submitting ? 'Saving...' : 'Save Product'}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
