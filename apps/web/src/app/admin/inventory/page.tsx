'use client';

import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { InventoryDashboard } from '@/components/inventory/inventory-dashboard';
import { ErrorBoundary } from '@/components/error-boundary';

export default function InventoryPage() {
  return (
    <AuthGuard>
      <AdminShell title="Inventory" subtitle="Track stock levels for each roasting batch.">
        <ErrorBoundary>
          <InventoryDashboard queryKeyPrefix="inventory-page" />
        </ErrorBoundary>
      </AdminShell>
    </AuthGuard>
  );
}
