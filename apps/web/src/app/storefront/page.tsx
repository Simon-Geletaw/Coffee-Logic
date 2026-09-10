import { redirect } from 'next/navigation';

/**
 * Legacy URL kept for backwards compatibility.
 * The storefront now lives at `/` — this path simply forwards to it.
 */
export default function StorefrontRedirectPage() {
  redirect('/');
}
