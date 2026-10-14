export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';

/**
 * Public origin of the storefront, sent with checkout so payment providers
 * return the shopper here (not a stale hard-coded domain). When unset, the
 * caller falls back to `window.location.origin`.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ?? '';

export const SESSION_KEY = 'coffee_logic_admin_session';
