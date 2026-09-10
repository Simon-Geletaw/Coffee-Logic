'use client';

import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { ErrorBoundary } from '@/components/error-boundary';
import { VariantDashboard } from '@/components/variants/variant-dashboard';

export default function VariantsPage() {
  return (
    <AuthGuard>
      <AdminShell
        title="Variants"
        subtitle="Set the sizes and prices each coffee is sold in."
      >
        <ErrorBoundary>
          <VariantDashboard queryKeyPrefix="variants-page" />
        </ErrorBoundary>
      </AdminShell>
    </AuthGuard>
  );
}
