import { Search, X } from 'lucide-react';

export type ProductFiltersState = {
  name: string;
  roastLevel: string;
  grind: string;
  origin: string;
  caffeine: string;
  process: string;
};

export const emptyFilters: ProductFiltersState = {
  name: '',
  roastLevel: '',
  grind: '',
  origin: '',
  caffeine: '',
  process: '',
};

type ProductFiltersProps = {
  filters: ProductFiltersState;
  onFilterChange: (key: keyof ProductFiltersState, value: string) => void;
  onClear: () => void;
};

export function ProductFilters({ filters, onFilterChange, onClear }: ProductFiltersProps) {
  const isFilterActive = Object.values(filters).some((v) => v.trim().length > 0);

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
      <label className="relative" style={{ gridColumn: 'span 2' }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '0.65rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            pointerEvents: 'none',
          }}
          aria-hidden
        />
        <input
          value={filters.name}
          onChange={(e) => onFilterChange('name', e.target.value)}
          className="field-search"
          placeholder="Search by name…"
          type="search"
          autoComplete="off"
        />
      </label>

      {(
        [
          { key: 'roastLevel', placeholder: 'Roast level', options: ['Light', 'Medium', 'Dark'] },
          { key: 'grind', placeholder: 'Grind size', options: ['Whole Bean', 'Espresso', 'Fine', 'Medium', 'Coarse'] },
          { key: 'origin', placeholder: 'Origin' },
          { key: 'caffeine', placeholder: 'Caffeine', options: ['Regular', 'Decaf', 'Half-Caf'] },
          { key: 'process', placeholder: 'Process', options: ['Washed', 'Natural', 'Honey', 'Anaerobic'] },
        ] as Array<{ key: keyof ProductFiltersState; placeholder: string; options?: string[] }>
      ).map(({ key, placeholder, options }) =>
        options ? (
          <select
            key={key}
            value={filters[key]}
            onChange={(e) => onFilterChange(key, e.target.value)}
            className="field"
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            key={key}
            value={filters[key]}
            onChange={(e) => onFilterChange(key, e.target.value)}
            className="field"
            placeholder={placeholder}
            autoComplete="off"
          />
        ),
      )}

      {isFilterActive && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
          <X size={13} />
          Clear
        </button>
      )}
    </div>
  );
}
