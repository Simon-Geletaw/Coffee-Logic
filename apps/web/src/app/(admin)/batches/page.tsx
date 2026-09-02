'use client';

import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { BatchDashboard } from '@/components/batches/batch-dashboard';
import { ErrorBoundary } from '@/components/error-boundary';

export default function BatchesPage() {
  return (
    <AuthGuard>
      <AdminShell title="Batches" subtitle="Manage roasting batches linked to your coffee products.">
        <ErrorBoundary>
          <BatchDashboard queryKeyPrefix="batches-page" />
        </ErrorBoundary>
      </AdminShell>
    </AuthGuard>
  );
}
