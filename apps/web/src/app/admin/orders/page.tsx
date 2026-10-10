'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminShell } from '@/components/admin-shell';
import { AuthGuard } from '@/components/auth-guard';
import { ErrorBoundary } from '@/components/error-boundary';
import { TableSkeleton } from '@/components/skeleton';
import { getAdminOrders } from '@/lib/api';
import { formatMoney } from '@/lib/money';

const statuses = ['', 'pending', 'paid', 'failed', 'refunded', 'cart'];
const providers = ['', 'chapa', 'stripe'];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState('');
  const [paymentProvider, setPaymentProvider] = useState('');
  const orders = useQuery({
    queryKey: ['admin', 'orders', { status, paymentProvider }],
    queryFn: () => getAdminOrders({ status, paymentProvider }),
  });

  return (
    <AuthGuard>
      <AdminShell title="Orders" subtitle="Review order and payment status from the provider-verified order record.">
        <ErrorBoundary>
          <section className="panel p-5">
            <div className="flex flex-wrap gap-3">
              <label className="text-xs text-[var(--muted)]">
                Status
                <select className="input mt-1 block" value={status} onChange={(event) => setStatus(event.target.value)}>
                  {statuses.map((value) => <option key={value} value={value}>{value || 'All statuses'}</option>)}
                </select>
              </label>
              <label className="text-xs text-[var(--muted)]">
                Payment provider
                <select className="input mt-1 block" value={paymentProvider} onChange={(event) => setPaymentProvider(event.target.value)}>
                  {providers.map((value) => <option key={value} value={value}>{value || 'All providers'}</option>)}
                </select>
              </label>
            </div>
          </section>
          <section className="panel p-5">
            {orders.isPending ? <TableSkeleton cols={5} /> : orders.isError ? (
              <p className="text-sm text-[var(--danger)]">{orders.error.message}</p>
            ) : orders.data.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No orders match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Created</th></tr></thead>
                  <tbody>
                    {orders.data.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.id.slice(0, 8).toUpperCase()}</strong><br /><span className="text-xs text-[var(--muted)]">{order.status}</span></td>
                        <td>{order.contactName || order.contactEmail || 'Guest'}</td>
                        <td>{formatMoney(order.totalCents, order.currency)}</td>
                        <td><span className="badge badge-muted">{order.paymentProvider || '—'}</span></td>
                        <td>{new Date(order.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </ErrorBoundary>
      </AdminShell>
    </AuthGuard>
  );
}
