'use client';

import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { ProductDashboard } from '@/components/product-dashboard';

export default function ProductsPage() {
  return (
    <AuthGuard>
      <AdminShell
        title="Products"
        subtitle="View all available products and filter them using admin API endpoint query params."
      >
        <ProductDashboard queryKeyPrefix="products-page" canManage />
      </AdminShell>
    </AuthGuard>
  );
}
