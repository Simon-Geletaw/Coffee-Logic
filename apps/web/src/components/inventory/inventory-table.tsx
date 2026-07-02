import { useState, useRef, useCallback } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import type { Inventory } from '@/lib/types';
import { TableSkeleton } from '@/components/skeleton';

type InventoryTableProps = {
  data: Inventory[];
  isPending: boolean;
  onAdjust: (inventory: Inventory) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
};

/**
 * Returns a badge class based on how many units are available.
 * Green  = well-stocked (> 20)
 * Yellow = low stock (1-20)
 * Red    = out of stock (0)
 */
function stockBadgeClass(available: number): string {
  if (available <= 0) return 'badge-danger';
  if (available <= 20) return 'badge-warning';
  return 'badge-success';
}

function DeleteButton({ inventoryId, isPending, onConfirm }: { inventoryId: string; isPending: boolean; onConfirm: (id: string) => void }) {
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
    onConfirm(inventoryId);
    setConfirming(false);
  }, [inventoryId, onConfirm]);

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

export function InventoryTable({ data, isPending, onAdjust, onDelete, isDeleting }: InventoryTableProps) {
  if (isPending) {
    return <TableSkeleton rows={5} cols={6} hasActions />;
  }

  return (
    <table className="data-table" aria-label="Inventory table">
      <thead>
        <tr>
          <th>Batch Code</th>
          <th>Product</th>
          <th>On Hand</th>
          <th>Reserved</th>
          <th>Available</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem', fontSize: '0.875rem' }}>
              No inventory records found. Add inventory for a batch above.
            </td>
          </tr>
        ) : (
          data.map((item) => (
            <tr key={item.id}>
              <td style={{ fontWeight: 600 }}>{item.batch?.batchCode ?? <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              <td>{item.batch?.product.name ?? <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              <td>{item.onHand}</td>
              <td>{item.reserved}</td>
              <td>
                <span className={`badge ${stockBadgeClass(item.available)}`}>
                  {item.available}
                </span>
              </td>
              <td>
                <span className={`badge ${item.status ? 'badge-success' : 'badge-muted'}`}>
                  {item.status ? 'Active' : 'Deleted'}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => onAdjust(item)}
                    aria-label={`Adjust stock for ${item.batch?.batchCode ?? 'inventory'}`}
                  >
                    <Pencil size={13} />
                  </button>
                  <DeleteButton inventoryId={item.id} isPending={isDeleting} onConfirm={onDelete} />
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
