import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInventory, createInventory, adjustInventory, deleteInventory } from '@/lib/api';
import type { InventoryPayload, InventoryAdjustPayload } from '@/lib/types';

/**
 * Fetches all inventory records with batch + product info.
 */
export function useInventoryQuery(queryKeyPrefix: string) {
  return useQuery({
    queryKey: [queryKeyPrefix],
    queryFn: getInventory,
    placeholderData: (prev) => prev,
  });
}

/**
 * Creates inventory for a batch.
 * Invalidates the inventory list on success.
 */
export function useCreateInventoryMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryPayload) => createInventory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}

/**
 * Adjusts stock quantities (onHand / reserved) for an inventory record.
 * Invalidates the inventory list on success.
 */
export function useAdjustInventoryMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InventoryAdjustPayload }) =>
      adjustInventory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}

/**
 * Soft-deletes an inventory record.
 * Invalidates the inventory list on success.
 */
export function useDeleteInventoryMutation(queryKeyPrefix: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKeyPrefix] });
    },
  });
}
