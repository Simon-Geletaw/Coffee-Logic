import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, deleteProduct, updateProduct } from '@/lib/api';
import type { ProductInput } from '@/lib/validators';

export function useProductsQuery(queryKeyPrefix: string, apiFilters: Record<string, string>) {
  const serialized = JSON.stringify(apiFilters);
  const [debounced, setDebounced] = useState(serialized);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(serialized), 300);
    return () => clearTimeout(timer);
  }, [serialized]);
  const filters = JSON.parse(debounced) as Record<string, string>;
  return useQuery({
    queryKey: ['admin', 'products', queryKeyPrefix, filters],
    queryFn: () => getProducts(filters),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductInput) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useUpdateProductMutation(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductInput) => updateProduct(productId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
