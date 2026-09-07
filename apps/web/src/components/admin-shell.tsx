'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Package, Users, Coffee, Layers, Warehouse } from 'lucide-react';
import { clearSession, getSession } from '@/lib/session';

type AdminShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const nav = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', Icon: Package },
  { href: '/admin/batches', label: 'Batches', Icon: Layers },
  { href: '/admin/inventory', label: 'Inventory', Icon: Warehouse },
  { href: '/admin/users', label: 'Users', Icon: Users },
];

const ROLE_BADGE_COLORS: Record<string, string> = {
  admin: 'badge-accent',
  manager: 'badge-success',
  operator: 'badge-muted',
  viewer: 'badge-muted',
};

export function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();
  const role = session?.user.role ?? 'guest';

  return (
    <main className="grid gap-5 md:grid-cols-[15rem_1fr]">
      {/* ── Sidebar ── */}
      <aside
        className="panel md:sticky md:top-5 md:h-[calc(100vh-2.5rem)]"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
          overflow: 'hidden',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: 'linear-gradient(145deg, #96512a, var(--accent))',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 1px 4px rgba(122,62,25,0.35)',
            }}
          >
            <Coffee size={17} style={{ color: '#fff8f2' }} aria-hidden />
          </div>
          <div>
            <p
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                lineHeight: 1,
              }}
            >
              Coffee Logic
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
              Admin Console
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Admin navigation" style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {nav.map(({ href, label, Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx('nav-link', isActive && 'active')}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={15} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User card */}
        <div
          style={{
            borderRadius: '0.6rem',
            border: '1px solid var(--line)',
            background: 'var(--surface-hover)',
            padding: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Signed in as
              </p>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginTop: '0.2rem', wordBreak: 'break-all', lineHeight: 1.3 }}>
                {session?.user.email ?? 'Unknown'}
              </p>
            </div>
            <span className={`badge ${ROLE_BADGE_COLORS[role] ?? 'badge-muted'}`} style={{ flexShrink: 0 }}>
              {role}
            </span>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          className="btn btn-danger"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => { clearSession(); router.replace('/login'); }}
          id="logout-btn"
        >
          <LogOut size={14} aria-hidden />
          Sign Out
        </button>
      </aside>

      {/* ── Main Content ── */}
      <section style={{ minWidth: 0 }}>
        {/* Page header */}
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h1
              style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {actions}
            </div>
          ) : null}
        </header>

        {/* Page content */}
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {children}
        </div>
      </section>
    </main>
  );
}
