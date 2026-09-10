'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Package, Users, RefreshCw } from 'lucide-react';
import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { ProductDashboard } from '@/components/product-dashboard';
import { CardSkeleton } from '@/components/skeleton';
import { ErrorBoundary } from '@/components/error-boundary';
import { getHealth, getProducts, getUsers } from '@/lib/api';

/* â”€â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
type StatCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  loading?: boolean;
};

function StatCard({ label, value, sub, icon, loading }: StatCardProps) {
  if (loading) return <CardSkeleton />;
  return (
    <article className="stat-card fade-up" aria-label={label}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <p className="stat-label">{label}</p>
        <div style={{ color: 'var(--muted)', opacity: 0.6 }} aria-hidden>{icon}</div>
      </div>
      <p className="stat-value">{value}</p>
      {sub ? <p className="stat-sub">{sub}</p> : null}
    </article>
  );
}

/* â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function DashboardPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, retry: 1 });

  // Limit dashboard products to first 50 counts for summary â€” don't render full list
  const products = useQuery({
    queryKey: ['products', 'dashboard-count'],
    queryFn: () => getProducts({}),
    // Only select the count so this query is lightweight on re-render
    select: (data) => ({ count: data.length }),
  });

  const users = useQuery({
    queryKey: ['users', 'dashboard-count'],
    queryFn: getUsers,
    select: (data) => ({ count: data.length }),
  });

  const isHealthy =
    !health.isPending && health.data?.status?.toLowerCase() === 'ok';

  const healthStatus = health.isPending
    ? 'â€¦'
    : health.isError
      ? 'Unavailable'
      : health.data?.status ?? 'Unknown';

  return (
    <AuthGuard>
      <AdminShell
        title="Dashboard"
        subtitle="Operational overview of Coffee Logic."
      >
        <ErrorBoundary>
          {/* â”€â”€ Stat Cards â”€â”€ */}
          <section
            style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
            aria-label="Key metrics"
          >
            <StatCard
              label="API Health"
              value={healthStatus}
              sub={isHealthy ? 'All systems operational' : health.isPending ? 'Checkingâ€¦' : 'One or more services down'}
              icon={<Activity size={18} />}
              loading={health.isPending}
            />
            <StatCard
              label="Products"
              value={products.isPending ? 'â€¦' : products.data?.count ?? 0}
              sub="Total in catalogue"
              icon={<Package size={18} />}
              loading={products.isPending}
            />
            <StatCard
              label="Users"
              value={users.isPending ? 'â€¦' : users.data?.count ?? 0}
              sub="Registered accounts"
              icon={<Users size={18} />}
              loading={users.isPending}
            />
          </section>

          {/* â”€â”€ Recent Products (read-only preview) â”€â”€ */}
          <section className="panel p-5 fade-up mt-5">
            <div className="section-header">
              <div>
                <h2 className="section-title">Product Catalogue Preview</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
                  Read-only. Go to <a href="/admin/products" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Products</a> to manage.
                </p>
              </div>
              {health.isFetching ? (
                <RefreshCw size={14} style={{ color: 'var(--muted)', animation: 'auth-spin 1s linear infinite' }} />
              ) : null}
            </div>
            <ProductDashboard queryKeyPrefix="dashboard-products" canManage={false} />
          </section>
        </ErrorBoundary>

        <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>
      </AdminShell>
    </AuthGuard>
  );
}
