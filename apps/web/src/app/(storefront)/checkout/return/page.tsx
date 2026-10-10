import { Suspense } from 'react';
import ReturnClient from './return-client';

/**
 * Chapa lands the shopper here after the hosted payment page
 * (?tx_ref=...&status=...). The client verifies the transaction with our API
 * and shows the outcome.
 */
export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <main
          id="main-content"
          className="flex min-h-screen items-center justify-center bg-cream-soft pt-32 md:pt-40"
        >
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#8A7F6A]">
            Checking your payment…
          </p>
        </main>
      }
    >
      <ReturnClient />
    </Suspense>
  );
}