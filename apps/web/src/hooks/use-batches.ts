import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBatches, createBatch, deleteBatch } from '@/lib/api';
import type { BatchPayload } from '@/lib/types';

export function useBatchesQuery(queryKeyPrefix: string) {
  return useQuery({
    queryKey: ['admin', 'batches', queryKeyPrefix],
    queryFn: getBatches,
    placeholderData: (prev) => prev,
  });
}

export function useCreateBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BatchPayload) => createBatch(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

export function useDeleteBatchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBatch(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
