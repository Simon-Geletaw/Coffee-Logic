import { Suspense } from 'react';
import ReturnClient from './return-client';

export const metadata = { title: 'Confirming payment — Melkora' };

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-soft" aria-busy="true" />}>
      <ReturnClient />
    </Suspense>
  );
}
