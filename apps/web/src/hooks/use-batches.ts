import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBatches, createBatch, deleteBatch } from '@/lib/api';
import type { BatchPayload } from '@/lib/types';

export function useBatchesQuery(queryKeyPrefix: string) {
  return useQuery({
    queryKey: [queryKeyPrefix],
    queryFn: getBatches,
    placeholderData: (prev) => prev,
  });
}

export function useCreateBatchMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BatchPayload) => createBatch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}

export function useDeleteBatchMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}
