'use client';

import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { ProductDashboard } from '@/components/product-dashboard';
import { ErrorBoundary } from '@/components/error-boundary';

export default function ProductsPage() {
  return (
    <AuthGuard>
      <AdminShell
        title="Products"
        subtitle="View all available products and filter them using admin API endpoint query params."
      >
        <ErrorBoundary>
          <ProductDashboard queryKeyPrefix="products-page" canManage />
        </ErrorBoundary>
      </AdminShell>
    </AuthGuard>
  );
}
