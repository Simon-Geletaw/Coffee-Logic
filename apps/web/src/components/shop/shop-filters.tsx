'use client';

import clsx from 'clsx';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SUPPORTED_CURRENCIES, currencyLabel } from '@/lib/money';
import type { CatalogFacets, CatalogQuery } from '@/lib/types';

/** The filter keys this bar controls, in the order they are rendered. */
export const FILTER_KEYS = [
  'origin',
  'roastLevel',
  'grind',
  'process',
] as const;

export type FilterKey = (typeof FILTER_KEYS)[number];

const FILTER_LABELS: Record<FilterKey, string> = {
  origin: 'Origin',
  roastLevel: 'Roast',
  grind: 'Grind',
  process: 'Process',
};

type Props = {
  facets?: CatalogFacets;
  value: CatalogQuery;
  onChange: (next: CatalogQuery) => void;
  isLoading?: boolean;
  className?: string;
};

/**
 * Filter bar for the shop. Fully controlled: it never holds filter state of
 * its own (the search box debounce aside), so the page can keep the filters in
 * the URL and every selection stays shareable and back-button friendly.
 *
 * Options come from the catalogue's own facets, so the bar only ever offers
 * values that will actually return results.
 */
export default function ShopFilters({
  facets,
  value,
  onChange,
  isLoading = false,
  className,
}: Props) {
  const [search, setSearch] = useState(value.name ?? '');

  // Keep the input in step when the query changes elsewhere (back button, or
  // "clear all") without fighting the shopper mid-keystroke. Adjusting state
  // during render rather than in an effect avoids a second render pass — the
  // pattern React documents for "reset state when a prop changes".
  const [lastSyncedName, setLastSyncedName] = useState(value.name ?? '');
  if ((value.name ?? '') !== lastSyncedName) {
    setLastSyncedName(value.name ?? '');
    setSearch(value.name ?? '');
  }

  // Debounce so typing does not fire a request per character.
  useEffect(() => {
    const current = value.name ?? '';
    if (search === current) return;

    const timer = setTimeout(() => {
      onChange({ ...value, name: search || undefined });
    }, 300);

    return () => clearTimeout(timer);
  }, [search, value, onChange]);

  const activeCount = Object.entries(value).filter(
    ([, entry]) => Boolean(entry),
  ).length;

  const setFilter = (key: keyof CatalogQuery, next: string | undefined) => {
    onChange({ ...value, [key]: next || undefined });
  };

  return (
    <div className={clsx('w-full', className)} aria-busy={isLoading}>
      <div className="flex flex-col gap-4 border-y border-[#E4DBC9] py-5 md:flex-row md:items-center md:justify-between">
        {/* Search */}
        <label className="flex w-full items-center gap-3 border border-[#E4DBC9] bg-white/50 px-4 py-2.5 md:max-w-xs">
          <Search size={15} className="shrink-0 text-[#8A7F6A]" aria-hidden />
          <span className="sr-only">Search coffees by name</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search coffees"
            className="w-full bg-transparent text-xs tracking-[0.08em] text-[#2E2A20] outline-none placeholder:text-[#A79C86]"
          />
        </label>

        {/* Attribute selects */}
        <div className="flex flex-wrap items-center gap-2.5">
          {FILTER_KEYS.map((key) => {
            const options = facets?.[key] ?? [];
            const isDisabled = options.length === 0;

            return (
              <label key={key} className="relative">
                <span className="sr-only">{FILTER_LABELS[key]}</span>
                <select
                  value={value[key] ?? ''}
                  disabled={isDisabled}
                  onChange={(event) => setFilter(key, event.target.value)}
                  className={clsx(
                    'appearance-none border bg-white/50 px-4 py-2.5 pr-9 text-[10px] font-medium uppercase tracking-[0.2em] outline-none transition-colors',
                    value[key]
                      ? 'border-[#B08A3E] text-[#6E5518]'
                      : 'border-[#E4DBC9] text-[#5A5346]',
                    isDisabled && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <option value="">{FILTER_LABELS[key]}</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-[#8A7F6A]"
                >
                  ▾
                </span>
              </label>
            );
          })}

          {/* Currency: prices are stored per variant, so this narrows the grid
              to the coffees priced in the shopper's currency. */}
          <label className="relative">
            <span className="sr-only">Currency</span>
            <select
              value={value.currency ?? ''}
              onChange={(event) => setFilter('currency', event.target.value)}
              className={clsx(
                'appearance-none border bg-white/50 px-4 py-2.5 pr-9 text-[10px] font-medium uppercase tracking-[0.2em] outline-none transition-colors',
                value.currency
                  ? 'border-[#B08A3E] text-[#6E5518]'
                  : 'border-[#E4DBC9] text-[#5A5346]',
              )}
            >
              <option value="">Currency</option>
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code} ({currencyLabel(code)})
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] text-[#8A7F6A]"
            >
              ▾
            </span>
          </label>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({})}
              className="inline-flex items-center gap-1.5 px-2 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#8A7F6A] transition-colors hover:text-[#2E2A20]"
            >
              <X size={12} aria-hidden />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
