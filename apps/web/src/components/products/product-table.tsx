import { useState, useRef, useCallback } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type { Product } from '@/lib/types';
import { TableSkeleton } from '@/components/skeleton';

type ProductTableProps = {
  data: Product[];
  isPending: boolean;
  canManage: boolean;
  isFilterEmpty: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
};

// Inline Two-Step Delete Button Component
function DeleteButton({ productId, isPending, onConfirm }: { productId: string, isPending: boolean, onConfirm: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startConfirm = useCallback(() => {
    setConfirming(true);
    timerRef.current = setTimeout(() => setConfirming(false), 3000);
  }, []);

  const cancel = useCallback(() => {
    setConfirming(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const confirm = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onConfirm(productId);
    setConfirming(false);
  }, [productId, onConfirm]);

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          type="button"
          className="btn btn-danger-solid btn-sm btn-confirm-danger"
          onClick={confirm}
          disabled={isPending}
        >
          <Trash2 size={12} /> Delete
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={cancel}>
          <X size={13} />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-danger btn-sm btn-icon"
      onClick={startConfirm}
      disabled={isPending}
    >
      <Trash2 size={13} />
    </button>
  );
}

export function ProductTable({ data, isPending, canManage, isFilterEmpty, onEdit, onDelete, isDeleting }: ProductTableProps) {
  if (isPending) {
    return <TableSkeleton rows={5} cols={6} hasActions={canManage} />;
  }

  return (
    <table className="data-table" aria-label="Products table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Roast</th>
          <th>Grind</th>
          <th>Origin</th>
          <th>Caffeine</th>
          <th>Process</th>
          {canManage && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={canManage ? 7 : 6}
              style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem', fontSize: '0.875rem' }}
            >
              {!isFilterEmpty
                ? 'No products match your filters.'
                : 'No products found. Add your first product above.'}
            </td>
          </tr>
        ) : (
          data.map((product) => (
            <tr key={product.id}>
              <td style={{ fontWeight: 600 }}>{product.name || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              <td>{product.roastLevel || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              <td>{product.grind || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              <td>{product.origin || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              <td>
                {product.caffeine ? (
                  <span className={`badge ${product.caffeine.toLowerCase().includes('decaf') ? 'badge-muted' : 'badge-accent'}`}>
                    {product.caffeine}
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>—</span>
                )}
              </td>
              <td>{product.process || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              {canManage && (
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => onEdit(product)}
                      aria-label={`Edit ${product.name ?? 'product'}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <DeleteButton
                      productId={product.id}
                      isPending={isDeleting}
                      onConfirm={onDelete}
                    />
                  </div>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
