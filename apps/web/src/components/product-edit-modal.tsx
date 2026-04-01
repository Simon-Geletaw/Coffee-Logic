'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Package, Loader2 } from 'lucide-react';
import { updateProduct } from '@/lib/api';
import { productSchema, type ProductInput } from '@/lib/validators';
import type { Product } from '@/lib/types';
import { useToast } from '@/components/toast';

type ProductEditDrawerProps = {
  product: Product;
  queryKeyPrefix: string;
  onClose: () => void;
};

const FIELDS: Array<{
  key: keyof ProductInput;
  label: string;
  placeholder: string;
  span?: boolean;
  isTextarea?: boolean;
}> = [
  { key: 'name', label: 'Product Name', placeholder: 'e.g. Ethiopian Yirgacheffe', span: true },
  { key: 'roastLevel', label: 'Roast Level', placeholder: 'e.g. Light, Medium, Dark' },
  { key: 'grind', label: 'Grind Size', placeholder: 'e.g. Whole Bean, Fine, Coarse' },
  { key: 'origin', label: 'Origin', placeholder: 'e.g. Ethiopia, Colombia' },
  { key: 'caffeine', label: 'Caffeine', placeholder: 'e.g. Regular, Decaf' },
  { key: 'process', label: 'Process Method', placeholder: 'e.g. Washed, Natural' },
  { key: 'description', label: 'Description', placeholder: 'Short product description…', span: true, isTextarea: true },
];

export function ProductEditDrawer({ product, queryKeyPrefix, onClose }: ProductEditDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product.name ?? '',
      roastLevel: product.roastLevel ?? '',
      grind: product.grind ?? '',
      origin: product.origin ?? '',
      caffeine: product.caffeine ?? '',
      process: product.process ?? '',
      description: product.description ?? '',
    },
  });

  // Reset form when a different product is opened
  useEffect(() => {
    reset({
      name: product.name ?? '',
      roastLevel: product.roastLevel ?? '',
      grind: product.grind ?? '',
      origin: product.origin ?? '',
      caffeine: product.caffeine ?? '',
      process: product.process ?? '',
      description: product.description ?? '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const updateMutation = useMutation({
    mutationFn: (payload: ProductInput) => updateProduct(product.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
      toast('success', 'Product updated', `"${product.name ?? 'Product'}" has been saved.`);
      onClose();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update product.';
      toast('error', 'Update failed', message);
    },
  });

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !updateMutation.isPending) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, updateMutation.isPending]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-overlay"
        onClick={() => !updateMutation.isPending && onClose()}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        id="product-edit-drawer"
      >
        {/* Header */}
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--accent-light)',
                border: '1px solid rgba(122,62,25,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Package size={17} style={{ color: 'var(--accent)' }} aria-hidden />
            </div>
            <div>
              <p className="drawer-title" id="drawer-title">Edit Product</p>
              <p className="drawer-subtitle" style={{ marginTop: 2 }}>
                {product.name ?? 'Unnamed product'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            disabled={updateMutation.isPending}
            aria-label="Close drawer"
            id="drawer-close-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form
          id="product-edit-form"
          className="drawer-body"
          onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
          noValidate
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {FIELDS.map(({ key, label, placeholder, span, isTextarea }) => (
              <div key={key} style={{ gridColumn: span ? '1 / -1' : undefined }}>
                <label className="field-label" htmlFor={`edit-${key}`}>
                  {label}
                </label>
                {isTextarea ? (
                  <textarea
                    id={`edit-${key}`}
                    className={`field${errors[key] ? ' field-error' : ''}`}
                    placeholder={placeholder}
                    rows={3}
                    style={{ resize: 'vertical', minHeight: 80 }}
                    {...register(key)}
                  />
                ) : (
                  <input
                    id={`edit-${key}`}
                    type="text"
                    className={`field${errors[key] ? ' field-error' : ''}`}
                    placeholder={placeholder}
                    autoComplete="off"
                    {...register(key)}
                  />
                )}
                {errors[key] ? (
                  <p className="form-error" role="alert">
                    {errors[key]!.message}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {updateMutation.isError ? (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.6rem',
                background: 'var(--danger-light)',
                border: '1px solid rgba(183,55,47,0.25)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
              }}
              role="alert"
            >
              {updateMutation.error instanceof Error
                ? updateMutation.error.message
                : 'Something went wrong. Please try again.'}
            </div>
          ) : null}
        </form>

        {/* Footer */}
        <div className="drawer-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={updateMutation.isPending}
            id="drawer-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-edit-form"
            className="btn btn-primary"
            disabled={updateMutation.isPending || !isDirty}
            id="drawer-save-btn"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 size={14} style={{ animation: 'auth-spin 0.6s linear infinite' }} />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
