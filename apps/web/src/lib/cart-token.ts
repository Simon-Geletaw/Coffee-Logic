'use client';

/**
 * The anonymous cart handle.
 *
 * The cart itself lives in Postgres as an Order row with status 'cart'. This
 * opaque token is the only thing that ties a browser to that row — the API
 * mints it on the first add-to-cart and looks the cart up by it thereafter.
 *
 * It is stored in localStorage (not sessionStorage, so a cart survives a tab
 * close) and sent as the `x-cart-token` header. It is not an account
 * credential: it grants access to one anonymous cart and nothing else.
 */

export const CART_TOKEN_KEY = 'coffee_logic_cart_token';

/** Notifies open tabs in this window when the token appears or is cleared. */
const CART_TOKEN_EVENT = 'coffee-logic:cart-token';

export function getCartToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CART_TOKEN_KEY);
  } catch {
    // Private browsing or blocked site data — the shopper simply gets a fresh
    // cart on every request rather than a crash.
    return null;
  }
}

export function saveCartToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(CART_TOKEN_KEY) === token) return;
    window.localStorage.setItem(CART_TOKEN_KEY, token);
    window.dispatchEvent(new Event(CART_TOKEN_EVENT));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function clearCartToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CART_TOKEN_KEY);
    window.dispatchEvent(new Event(CART_TOKEN_EVENT));
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Subscribe to token changes, including those made in another tab. */
export function onCartTokenChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CART_TOKEN_KEY) listener();
  };

  window.addEventListener(CART_TOKEN_EVENT, listener);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(CART_TOKEN_EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}
