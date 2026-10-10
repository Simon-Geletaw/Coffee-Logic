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
    queryKey: ['admin', 'variants', queryKeyPrefix, productId ?? 'all'],
    queryFn: () => getVariants(productId),
    placeholderData: (prev) => prev,
  });
}

export function useCreateVariantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VariantPayload) => createVariant(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useUpdateVariantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VariantUpdatePayload }) =>
      updateVariant(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useDeleteVariantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVariant(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
