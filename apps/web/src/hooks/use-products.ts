import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, deleteProduct, updateProduct } from '@/lib/api';
import type { ProductInput } from '@/lib/validators';

export function useProductsQuery(queryKeyPrefix: string, apiFilters: Record<string, string>) {
  return useQuery({
    queryKey: [queryKeyPrefix, apiFilters],
    queryFn: () => getProducts(apiFilters),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProductMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductInput) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}

export function useDeleteProductMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}

export function useUpdateProductMutation(queryKeyPrefix: string, productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductInput) => updateProduct(productId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}
