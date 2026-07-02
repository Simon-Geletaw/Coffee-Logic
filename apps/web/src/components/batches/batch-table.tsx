import { useState, useRef, useCallback } from 'react';
import { Trash2, X } from 'lucide-react';
import type { Batch } from '@/lib/types';
import { TableSkeleton } from '@/components/skeleton';

type BatchTableProps = {
  data: Batch[];
  isPending: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
};

function DeleteButton({ batchId, isPending, onConfirm }: { batchId: string; isPending: boolean; onConfirm: (id: string) => void }) {
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
    onConfirm(batchId);
    setConfirming(false);
  }, [batchId, onConfirm]);

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button type="button" className="btn btn-danger-solid btn-sm btn-confirm-danger" onClick={confirm} disabled={isPending}>
          <Trash2 size={12} /> Delete
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={cancel}>
          <X size={13} />
        </button>
      </span>
    );
  }

  return (
    <button type="button" className="btn btn-danger btn-sm btn-icon" onClick={startConfirm} disabled={isPending}>
      <Trash2 size={13} />
    </button>
  );
}

export function BatchTable({ data, isPending, onDelete, isDeleting }: BatchTableProps) {
  if (isPending) {
    return <TableSkeleton rows={5} cols={5} hasActions />;
  }

  return (
    <table className="data-table" aria-label="Batches table">
      <thead>
        <tr>
          <th>Batch Code</th>
          <th>Product</th>
          <th>Roast Date</th>
          <th>Expires At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem', fontSize: '0.875rem' }}>
              No batches found. Add your first batch above.
            </td>
          </tr>
        ) : (
          data.map((batch) => (
            <tr key={batch.id}>
              <td style={{ fontWeight: 600 }}>{batch.batchCode}</td>
              <td>{batch.product?.name ?? <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              <td>{new Date(batch.roastDate).toLocaleDateString()}</td>
              <td>
                {batch.expiresAt ? (
                  new Date(batch.expiresAt).toLocaleDateString()
                ) : (
                  <span style={{ color: 'var(--muted)' }}>—</span>
                )}
              </td>
              <td>
                <DeleteButton batchId={batch.id} isPending={isDeleting} onConfirm={onDelete} />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
