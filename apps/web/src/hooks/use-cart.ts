'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useSyncExternalStore } from 'react';
import {
  addCartItem,
  checkout,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '@/lib/api';
import { getCartToken, onCartTokenChange } from '@/lib/cart-token';
import type { AddCartItemPayload, Cart, CheckoutPayload } from '@/lib/types';

export const cartKeys = {
  all: ['cart'] as const,
};

const EMPTY_CART: Cart = {
  id: null,
  status: 'cart',
  currency: null,
  totalCents: 0,
  itemCount: 0,
  items: [],
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

  return {
    ...query,
    cart: hasToken ? (query.data ?? EMPTY_CART) : EMPTY_CART,
  };
}

/** Item count for the header badge. Zero until a cart exists. */
export function useCartCount(): number {
  const { cart } = useCart();
  return cart.itemCount;
}

function useCartMutation<TArgs>(
  mutationFn: (args: TArgs) => Promise<Cart>,
) {
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

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => checkout(payload),
    onSuccess: () => {
      // The cart became an order and its token is gone.
      queryClient.setQueryData(cartKeys.all, EMPTY_CART);
    },
  });
}
