'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  addCartItem,
  clearCart,
  createCheckoutSession,
  getCart,
  getCheckoutStatus,
  removeCartItem,
  updateCartItem,
} from '@/lib/api';
import { getCartToken, onCartTokenChange } from '@/lib/cart-token';
import type { AddCartItemPayload, Cart, CheckoutPayload } from '@/lib/types';

export const cartKeys = {
  all: ['cart'] as const,
  status: (orderId: string) => ['checkout-status', orderId] as const,
};

export const EMPTY_CART: Cart = {
  id: null,
  status: 'cart',
  currency: null,
  subtotalCents: 0,
  shippingCents: 0,
  totalCents: 0,
  totalWeightGrams: 0,
  itemCount: 0,
  items: [],
  paymentProvider: null,
  paymentExpiresAt: null,
  failureReason: null,
  updatedAt: null,
};

/**
 * Whether this browser currently holds a cart token. Read through
 * useSyncExternalStore so a token minted in another tab (or by the first
 * add-to-cart on this page) re-renders the badge without a refresh.
 */
export function useHasCartToken(): boolean {
  return useSyncExternalStore(
    onCartTokenChange,
    () => getCartToken() !== null,
    // The server cannot see localStorage; assume no cart until hydration.
    () => false,
  );
}

export function useCart() {
  const hasToken = useHasCartToken();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: cartKeys.all,
    queryFn: getCart,
    // No token means there is provably no cart yet — skip the round trip and
    // let the empty placeholder render immediately.
    enabled: hasToken,
    placeholderData: (prev) => prev,
  });

  // The first add-to-cart mints a token; refetch once it appears so every
  // mounted cart consumer (badge, cart page) picks the new cart up.
  useEffect(() => {
    if (hasToken) {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
    } else {
      queryClient.setQueryData(cartKeys.all, EMPTY_CART);
    }
  }, [hasToken, queryClient]);

  const cart = hasToken ? (query.data ?? EMPTY_CART) : EMPTY_CART;

  return {
    ...query,
    cart,
    /** Lines can be changed only while no payment session holds them. */
    isEditable: cart.status === 'cart' || cart.status === 'failed',
    isPaymentPending: cart.status === 'pending',
  };
}

/** Item count for the header badge. Zero until a cart exists. */
export function useCartCount(): number {
  const { cart } = useCart();
  return cart.itemCount;
}

function useCartMutation<TArgs>(mutationFn: (args: TArgs) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // Every cart endpoint returns the whole cart, so seed the cache from the
    // response instead of a second GET.
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.all, cart),
  });
}

export function useAddToCart() {
  return useCartMutation((payload: AddCartItemPayload) => addCartItem(payload));
}

export function useUpdateCartItem() {
  return useCartMutation(({ itemId, quantity }: { itemId: string; quantity: number }) =>
    updateCartItem(itemId, quantity),
  );
}

export function useRemoveCartItem() {
  return useCartMutation((itemId: string) => removeCartItem(itemId));
}

export function useClearCart() {
  return useCartMutation(() => clearCart());
}

/**
 * Opens a provider session. The idempotency key is generated once per
 * checkout *attempt* by the caller, so a retry of the same click replays
 * rather than double-charges.
 */
export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: CheckoutPayload;
      idempotencyKey: string;
    }) => createCheckoutSession(payload, idempotencyKey),
    // The cart is now `pending`; make sure nothing renders it as editable.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKeys.all }),
  });
}

/**
 * Polls /checkout/status until the order leaves `pending`. Stops on its own
 * after `maxPolls` so a lost webhook cannot spin the page forever.
 */
export function useCheckoutStatus(
  orderId: string | null,
  options?: { intervalMs?: number; maxPolls?: number },
) {
  const intervalMs = options?.intervalMs ?? 2_000;
  const maxPolls = options?.maxPolls ?? 45; // ≈ 90 s
  // Flipped from inside the interval callback (not render) when we give up.
  const [exhausted, setExhausted] = useState(false);

  const query = useQuery({
    queryKey: cartKeys.status(orderId ?? ''),
    queryFn: () => getCheckoutStatus(orderId as string),
    enabled: Boolean(orderId),
    refetchInterval: (current) => {
      const status = current.state.data?.status;
      if (status && status !== 'pending') return false;
      if (current.state.dataUpdateCount >= maxPolls) {
        setExhausted(true);
        return false;
      }
      return intervalMs;
    },
    refetchOnWindowFocus: true,
    retry: 2,
  });

  return { ...query, exhausted };
}
