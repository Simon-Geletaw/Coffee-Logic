'use client';

import { useQuery } from '@tanstack/react-query';
import { getCatalogFacets, getCatalogProduct, getCatalogProducts } from '@/lib/api';
import type { CatalogQuery } from '@/lib/types';

export const catalogKeys = {
  all: ['catalog'] as const,
  list: (query: CatalogQuery) => ['catalog', 'list', query] as const,
  detail: (id: string) => ['catalog', 'detail', id] as const,
  facets: ['catalog', 'facets'] as const,
};

export function useCatalogProducts(query: CatalogQuery = {}) {
  return useQuery({
    queryKey: catalogKeys.list(query),
    queryFn: () => getCatalogProducts(query),
    // Keep the previous grid on screen while a filter change re-fetches, so
    // the shop does not flash empty between keystrokes.
    placeholderData: (prev) => prev,
  });
}

export function useCatalogProduct(id: string) {
  return useQuery({
    queryKey: catalogKeys.detail(id),
    queryFn: () => getCatalogProduct(id),
    enabled: Boolean(id),
  });
}

export function useCatalogFacets() {
  return useQuery({
    queryKey: catalogKeys.facets,
    queryFn: getCatalogFacets,
    // The set of roasts and origins changes far more slowly than stock.
    staleTime: 5 * 60_000,
  });
}
