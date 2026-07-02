import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ProductInput } from '@/lib/validators';

export type ProductDraft = Omit<ProductInput, never>;

export const emptyDraft: ProductDraft = {
  name: '',
  roastLevel: '',
  grind: '',
  origin: '',
  caffeine: '',
  process: '',
  description: '',
};

type ProductAddFormProps = {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (draft: ProductDraft) => void;
};

export function ProductAddForm({ isPending, onCancel, onSubmit }: ProductAddFormProps) {
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);

  const handleSubmit = () => {
    onSubmit({
      name: draft.name?.trim() ?? '',
      roastLevel: draft.roastLevel?.trim() || '',
      grind: draft.grind?.trim() || '',
      origin: draft.origin?.trim() || '',
      caffeine: draft.caffeine?.trim() || '',
      process: draft.process?.trim() || '',
      description: draft.description?.trim() || '',
    });
    setDraft(emptyDraft);
  };

  return (
    <div className="mt-4 pt-4 fade-up" style={{ borderTop: '1px solid var(--line)' }}>
      <p className="section-title mb-3">New Product</p>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {[
          { key: 'name', placeholder: 'Product name *', required: true, span: true },
          { key: 'roastLevel', placeholder: 'Roast level' },
          { key: 'grind', placeholder: 'Grind size' },
          { key: 'origin', placeholder: 'Origin' },
          { key: 'caffeine', placeholder: 'Caffeine' },
          { key: 'process', placeholder: 'Process method' },
          { key: 'description', placeholder: 'Description (optional)', span: true },
        ].map(({ key, placeholder, required, span }) => (
          <input
            key={key}
            value={draft[key as keyof ProductDraft] ?? ''}
            onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
            className="field"
            placeholder={placeholder}
            style={span ? { gridColumn: '1 / -1' } : undefined}
            required={required}
            autoComplete="off"
          />
        ))}

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!draft.name?.trim() || isPending}
            onClick={handleSubmit}
          >
            {isPending ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 12,
                    border: '2px solid rgba(255,248,242,0.4)',
                    borderTopColor: '#fff8f2',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                Adding…
              </>
            ) : (
              <>
                <Check size={14} />
                Add Product
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
