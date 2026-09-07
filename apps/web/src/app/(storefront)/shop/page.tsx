import { Suspense } from 'react';
import ShopClient from './shop-client';

export const metadata = {
  title: 'Shop — Melkora',
  description:
    'Buy single-origin Ethiopian coffee — Sidamo, Yirgacheffe and Guji — roasted to order in Addis.',
};

export default function ShopPage() {
  return (
    // useSearchParams needs a Suspense boundary to keep the rest of the route
    // statically renderable.
    <Suspense
      fallback={<div className="min-h-screen bg-cream-soft" aria-busy="true" />}
    >
      <ShopClient />
    </Suspense>
  );
}
