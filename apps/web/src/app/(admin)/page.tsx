'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { ProductDashboard } from '@/components/product-dashboard';
import { getHealth, getProducts, getUsers } from '@/lib/api';

export default function DashboardPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, retry: 1 });
  const products = useQuery({ queryKey: ['products', 'dashboard'], queryFn: () => getProducts('') });
  const users = useQuery({ queryKey: ['users', 'dashboard'], queryFn: getUsers });

  return (
    <AuthGuard>
      <AdminShell title="Dashboard" subtitle="Operational summary and security-sensitive status.">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="panel p-5">
            <p className="text-sm text-[color:var(--muted)]">API Health</p>
            <p className="mt-2 text-2xl font-bold">{health.data?.status ?? (health.isPending ? 'Checking...' : 'Unavailable')}</p>
          </article>
          <article className="panel p-5">
            <p className="text-sm text-[color:var(--muted)]">Products</p>
            <p className="mt-2 text-2xl font-bold">{products.data?.length ?? 0}</p>
          </article>
          <article className="panel p-5">
            <p className="text-sm text-[color:var(--muted)]">Users</p>
            <p className="mt-2 text-2xl font-bold">{users.data?.length ?? 0}</p>
          </article>
        </section>

        <ProductDashboard queryKeyPrefix="dashboard-products" />
      </AdminShell>
    </AuthGuard>
  );
}
