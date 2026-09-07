import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CART_TOKEN_KEY,
  clearCartToken,
  getCartToken,
  onCartTokenChange,
  saveCartToken,
} from './cart-token';

describe('cart token storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts empty', () => {
    expect(getCartToken()).toBeNull();
  });

  it('round-trips a token through localStorage', () => {
    saveCartToken('abc');
    expect(getCartToken()).toBe('abc');
    expect(window.localStorage.getItem(CART_TOKEN_KEY)).toBe('abc');
  });

  it('clears the token', () => {
    saveCartToken('abc');
    clearCartToken();
    expect(getCartToken()).toBeNull();
  });

  it('notifies subscribers on save and clear, but not on a no-op save', () => {
    const listener = vi.fn();
    const unsubscribe = onCartTokenChange(listener);

    saveCartToken('abc');
    saveCartToken('abc'); // same value → no event
    clearCartToken();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();

    saveCartToken('def');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('reacts to changes made in another tab via the storage event', () => {
    const listener = vi.fn();
    const unsubscribe = onCartTokenChange(listener);

    window.dispatchEvent(new StorageEvent('storage', { key: CART_TOKEN_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }));

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('degrades to "no cart" when storage throws (private mode, blocked site data)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => saveCartToken('abc')).not.toThrow();
    expect(getCartToken()).toBeNull();
  });
});
