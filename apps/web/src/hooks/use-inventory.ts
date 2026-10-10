import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInventory, createInventory, adjustInventory, deleteInventory } from '@/lib/api';
import type { InventoryPayload, InventoryAdjustPayload } from '@/lib/types';

/**
 * Fetches all inventory records with batch + product info.
 */
export function useInventoryQuery(queryKeyPrefix: string) {
  return useQuery({
    queryKey: ['admin', 'inventory', queryKeyPrefix],
    queryFn: getInventory,
    placeholderData: (prev) => prev,
  });
}

/**
 * Creates inventory for a batch.
 * Invalidates the inventory list on success.
 */
export function useCreateInventoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryPayload) => createInventory(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

/**
 * Adjusts stock quantities (onHand / reserved) for an inventory record.
 * Invalidates the inventory list on success.
 */
export function useAdjustInventoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InventoryAdjustPayload }) =>
      adjustInventory(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}

/**
 * Soft-deletes an inventory record.
 * Invalidates the inventory list on success.
 */
export function useDeleteInventoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInventory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    },
  });
}
