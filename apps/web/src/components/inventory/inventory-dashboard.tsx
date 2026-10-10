'use client';

import { useState, useMemo } from 'react';
import { Plus, Save } from 'lucide-react';
import type { Inventory, InventoryPayload, InventoryAdjustPayload } from '@/lib/types';
import { useInventoryQuery, useCreateInventoryMutation, useAdjustInventoryMutation, useDeleteInventoryMutation } from '@/hooks/use-inventory';
import { useBatchesQuery } from '@/hooks/use-batches';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { useToast } from '@/components/toast';

type InventoryDashboardProps = {
  queryKeyPrefix: string;
};

export function InventoryDashboard({ queryKeyPrefix }: InventoryDashboardProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<Inventory | null>(null);

  const inventoryQuery = useInventoryQuery(queryKeyPrefix);
  const batchesQuery = useBatchesQuery('batches-for-inventory');
  const createMutation = useCreateInventoryMutation();
  const adjustMutation = useAdjustInventoryMutation();
  const deleteMutation = useDeleteInventoryMutation();

  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);
  const batches = useMemo(() => batchesQuery.data ?? [], [batchesQuery.data]);

  // Compute which batches do NOT have an inventory record yet
  const batchIdsWithInventory = useMemo(
    () => new Set(inventory.map((i) => i.batchId)),
    [inventory],
  );
  const batchesWithoutInventory = useMemo(
    () => batches.filter((b) => !batchIdsWithInventory.has(b.id)),
    [batches, batchIdsWithInventory],
  );

  const handleCreate = (draft: InventoryPayload) => {
    createMutation.mutate(draft, {
      onSuccess: () => {
        setShowAddForm(false);
        toast('success', 'Inventory added', 'Stock record has been created.');
      },
      onError: (err: unknown) => {
        toast('error', 'Create failed', err instanceof Error ? err.message : 'Unknown error');
      },
    });
  };

  const handleAdjust = (id: string, payload: InventoryAdjustPayload) => {
    adjustMutation.mutate({ id, payload }, {
      onSuccess: () => {
        setAdjustingItem(null);
        toast('success', 'Stock adjusted', 'Inventory quantities have been updated.');
      },
      onError: (err: unknown) => {
        toast('error', 'Adjust failed', err instanceof Error ? err.message : 'Unknown error');
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast('success', 'Inventory removed', 'The inventory record has been deleted.'),
      onError: (err) => toast('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error'),
    });
  };

  return (
    <>
      {/* Adjust Stock Panel (inline, above the table when active) */}
      {adjustingItem && (
        <InventoryAdjustPanel
          inventory={adjustingItem}
          isPending={adjustMutation.isPending}
          onSave={handleAdjust}
          onCancel={() => setAdjustingItem(null)}
        />
      )}

      {/* Add Inventory Section */}
      <section className="panel p-5 fade-up">
        <div className="section-header">
          <div>
            <h3 className="section-title">Inventory</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
              Track stock levels for each roasting batch
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddForm((s) => !s)}>
            <Plus size={14} />
            {showAddForm ? 'Cancel' : 'Add Inventory'}
          </button>
        </div>

        {showAddForm && (
          <InventoryAddForm
            batches={batchesWithoutInventory}
            isPending={createMutation.isPending}
            isLoadingBatches={batchesQuery.isPending}
            onCancel={() => setShowAddForm(false)}
            onSubmit={handleCreate}
          />
        )}
      </section>

      {/* Inventory Table Section */}
      <section className="panel p-5 fade-up">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 className="section-title">All Inventory</h3>
            {!inventoryQuery.isPending && (
              <span className="badge badge-muted">{inventory.length}</span>
            )}
          </div>
          {inventoryQuery.isFetching && !inventoryQuery.isPending && (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Refreshing…</span>
          )}
        </div>

        {inventoryQuery.isError && (
          <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            {inventoryQuery.error instanceof Error ? inventoryQuery.error.message : 'Failed to load inventory.'}
          </div>
        )}

        <div className="table-container">
          <InventoryTable
            data={inventory}
            isPending={inventoryQuery.isPending}
            onAdjust={setAdjustingItem}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </section>
    </>
  );
}

/**
 * Add inventory form — lets the user pick a batch (dropdown) and enter initial stock.
 * Only shows batches that don't already have inventory records.
 */
function InventoryAddForm({
  batches,
  isPending,
  isLoadingBatches,
  onCancel,
  onSubmit,
}: {
  batches: { id: string; batchCode: string; product?: { name: string } }[];
  isPending: boolean;
  isLoadingBatches: boolean;
  onCancel: () => void;
  onSubmit: (draft: InventoryPayload) => void;
}) {
  const [batchId, setBatchId] = useState('');
  const [onHand, setOnHand] = useState('');

  const isValid = batchId && onHand.trim() && parseInt(onHand, 10) >= 0;

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ batchId, onHand: parseInt(onHand, 10) });
    setBatchId('');
    setOnHand('');
  };

  return (
    <div className="mt-4 pt-4 fade-up" style={{ borderTop: '1px solid var(--line)' }}>
      <p className="section-title mb-3">New Inventory Record</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Select batch *</span>
          <select
            className="field"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            disabled={isLoadingBatches}
            style={{ minHeight: 38 }}
          >
            <option value="">
              {isLoadingBatches ? 'Loading batches…' : '— Choose a batch —'}
            </option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batchCode} — {batch.product?.name ?? 'Unknown product'}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>On-hand quantity *</span>
          <input
            type="number"
            min={0}
            value={onHand}
            onChange={(e) => setOnHand(e.target.value)}
            className="field"
            placeholder="e.g. 100"
            required
            autoComplete="off"
          />
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={!isValid || isPending} onClick={handleSubmit}>
            {isPending ? (
              <>
                <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,248,242,0.4)', borderTopColor: '#fff8f2', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Adding…
              </>
            ) : (
              <>
                <Plus size={14} />
                Add Inventory
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline adjust panel — lets the user update onHand and/or reserved quantities.
 * Shows the current values and recalculates available = onHand - reserved visually.
 */
function InventoryAdjustPanel({
  inventory,
  isPending,
  onSave,
  onCancel,
}: {
  inventory: Inventory;
  isPending: boolean;
  onSave: (id: string, payload: InventoryAdjustPayload) => void;
  onCancel: () => void;
}) {
  const [onHand, setOnHand] = useState(String(inventory.onHand));
  const [reserved, setReserved] = useState(String(inventory.reserved));

  const parsedOnHand = parseInt(onHand, 10);
  const parsedReserved = parseInt(reserved, 10);
  const calculatedAvailable = isNaN(parsedOnHand) || isNaN(parsedReserved) ? 0 : parsedOnHand - parsedReserved;
  const isInvalid = calculatedAvailable < 0;

  const handleSave = () => {
    const payload: InventoryAdjustPayload = {};
    const newOnHand = parseInt(onHand, 10);
    const newReserved = parseInt(reserved, 10);

    if (!isNaN(newOnHand) && newOnHand !== inventory.onHand) payload.onHand = newOnHand;
    if (!isNaN(newReserved) && newReserved !== inventory.reserved) payload.reserved = newReserved;

    if (Object.keys(payload).length === 0) {
      onCancel();
      return;
    }

    onSave(inventory.id, payload);
  };

  const batchLabel = inventory.batch
    ? `${inventory.batch.batchCode} — ${inventory.batch.product.name}`
    : 'Inventory';

  return (
    <section className="panel p-5 fade-up" style={{ borderLeft: '3px solid var(--accent)' }}>
      <div className="section-header">
        <div>
          <h3 className="section-title">Adjust Stock: {batchLabel}</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
            Update quantities. Available will be recalculated as onHand - reserved.
          </p>
        </div>
      </div>
      <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>On Hand</span>
          <input type="number" min={0} value={onHand} onChange={(e) => setOnHand(e.target.value)} className="field" autoComplete="off" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Reserved</span>
          <input type="number" min={0} value={reserved} onChange={(e) => setReserved(e.target.value)} className="field" autoComplete="off" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Available</span>
          <div className="field" style={{ display: 'flex', alignItems: 'center', minHeight: 38, background: isInvalid ? 'var(--danger-light)' : undefined }}>
            <span className={`badge ${calculatedAvailable <= 0 ? 'badge-danger' : calculatedAvailable <= 20 ? 'badge-warning' : 'badge-success'}`}>
              {calculatedAvailable}
            </span>
            {isInvalid && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                Reserved exceeds on hand!
              </span>
            )}
          </div>
        </label>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={isInvalid || isPending || (isNaN(parsedOnHand) && isNaN(parsedReserved))} onClick={handleSave}>
            {isPending ? (
              <>
                <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,248,242,0.4)', borderTopColor: '#fff8f2', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Saving…
              </>
            ) : (
              <>
                <Save size={14} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
