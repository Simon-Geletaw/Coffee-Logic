'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVariant,
  deleteVariant,
  getVariants,
  updateVariant,
} from '@/lib/api';
import type { VariantPayload, VariantUpdatePayload } from '@/lib/types';

export function useVariantsQuery(queryKeyPrefix: string, productId?: string) {
  return useQuery({
    queryKey: [queryKeyPrefix, productId ?? 'all'],
    queryFn: () => getVariants(productId),
    placeholderData: (prev) => prev,
  });
}

export function useCreateVariantMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VariantPayload) => createVariant(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}

export function useUpdateVariantMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VariantUpdatePayload }) =>
      updateVariant(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}

export function useDeleteVariantMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVariant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}
