'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BatchPayload } from '@/lib/types';
import { useBatchesQuery, useCreateBatchMutation, useDeleteBatchMutation } from '@/hooks/use-batches';
import { BatchTable } from '@/components/batches/batch-table';
import { useToast } from '@/components/toast';

type BatchDashboardProps = {
  queryKeyPrefix: string;
};

export function BatchDashboard({ queryKeyPrefix }: BatchDashboardProps) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);

  const batchesQuery = useBatchesQuery(queryKeyPrefix);
  const createMutation = useCreateBatchMutation();
  const deleteMutation = useDeleteBatchMutation();

  const data = batchesQuery.data ?? [];

  const handleCreate = (draft: BatchPayload) => {
    createMutation.mutate(draft, {
      onSuccess: () => {
        setShowAddForm(false);
        toast('success', 'Batch added', 'The new batch has been created.');
      },
      onError: (err: unknown) => {
        toast('error', 'Create failed', err instanceof Error ? err.message : 'Unknown error');
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast('success', 'Batch removed', 'The batch has been deleted.'),
      onError: (err) => toast('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error'),
    });
  };

  return (
    <>
      {/* ── Add Batch Section ── */}
      <section className="panel p-5 fade-up">
        <div className="section-header">
          <div>
            <h3 className="section-title">Batches</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
              Manage roasting batches for your coffee products
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddForm((s) => !s)}>
            <Plus size={14} />
            {showAddForm ? 'Cancel' : 'Add Batch'}
          </button>
        </div>

        {showAddForm && (
          <BatchAddForm
            isPending={createMutation.isPending}
            onCancel={() => setShowAddForm(false)}
            onSubmit={handleCreate}
          />
        )}
      </section>

      {/* ── Batches Table Section ── */}
      <section className="panel p-5 fade-up">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 className="section-title">All Batches</h3>
            {!batchesQuery.isPending && (
              <span className="badge badge-muted">{data.length}</span>
            )}
          </div>
          {batchesQuery.isFetching && !batchesQuery.isPending && (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Refreshing…</span>
          )}
        </div>

        {batchesQuery.isError && (
          <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            {batchesQuery.error instanceof Error ? batchesQuery.error.message : 'Failed to load batches.'}
          </div>
        )}

        <div className="table-container">
          <BatchTable
            data={data}
            isPending={batchesQuery.isPending}
            onDelete={handleDelete}
            isDeleting={deleteMutation.isPending}
          />
        </div>
      </section>
    </>
  );
}

function BatchAddForm({ isPending, onCancel, onSubmit }: { isPending: boolean; onCancel: () => void; onSubmit: (draft: BatchPayload) => void }) {
  const [draft, setDraft] = useState<BatchPayload>({
    productId: '',
    batchCode: '',
    roastDate: '',
    expiresAt: '',
  });

  const handleSubmit = () => {
    onSubmit({
      productId: draft.productId.trim(),
      batchCode: draft.batchCode.trim(),
      roastDate: draft.roastDate,
      expiresAt: draft.expiresAt || undefined,
    });
    setDraft({ productId: '', batchCode: '', roastDate: '', expiresAt: '' });
  };

  const isValid = draft.productId && draft.batchCode.trim() && draft.roastDate;

  return (
    <div className="mt-4 pt-4 fade-up" style={{ borderTop: '1px solid var(--line)' }}>
      <p className="section-title mb-3">New Batch</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <input
          value={draft.productId}
          onChange={(e) => setDraft((prev) => ({ ...prev, productId: e.target.value }))}
          className="field"
          placeholder="Product ID *"
          required
          autoComplete="off"
        />
        <input
          value={draft.batchCode}
          onChange={(e) => setDraft((prev) => ({ ...prev, batchCode: e.target.value }))}
          className="field"
          placeholder="Batch code * (e.g. ETH-0630)"
          required
          autoComplete="off"
        />
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Roast date *</span>
          <input
            type="date"
            value={draft.roastDate}
            onChange={(e) => setDraft((prev) => ({ ...prev, roastDate: e.target.value }))}
            className="field"
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Expires at</span>
          <input
            type="date"
            value={draft.expiresAt}
            onChange={(e) => setDraft((prev) => ({ ...prev, expiresAt: e.target.value }))}
            className="field"
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
                Add Batch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
