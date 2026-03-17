'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SessionControls } from '@/features/auth/components/session-controls';
import { API_BASE_URL } from '@/features/products/constants';
import { IconGrid, IconMenu, IconTag, IconUsers, IconX } from './icons';

type NavItem = {
  href: string;
  label: string;
  Icon: (props: { className?: string }) => ReactNode;
};

type AdminLayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  searchSlot?: ReactNode;
  children: ReactNode;
};

type HealthStatus = 'loading' | 'ok' | 'unavailable';

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', Icon: IconGrid },
  { href: '/products', label: 'Products', Icon: IconTag },
  { href: '/users', label: 'Users', Icon: IconUsers },
];

const isActivePath = (pathname: string | null, href: string) => {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
};

function useApiHealth() {
  const [status, setStatus] = useState<HealthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    let retryMs = 7000;

    const tick = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Health failed: ${response.status}`);
        }
        const payload = (await response.json()) as { status?: string };
        if (!cancelled) {
          setStatus(payload.status === 'ok' ? 'ok' : 'unavailable');
          retryMs = 12000;
        }
      } catch {
        if (!cancelled) {
          setStatus('unavailable');
          retryMs = Math.min(60000, Math.round(retryMs * 1.6));
        }
      } finally {
        if (!cancelled) {
          window.setTimeout(tick, retryMs);
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

function HealthPill() {
  const status = useApiHealth();
  const className =
    status === 'ok'
      ? 'status-ok'
      : status === 'loading'
        ? 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700'
        : 'rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700';
  return <span className={className}>API {status === 'loading' ? 'loading...' : status}</span>;
}

function AdminSidebar({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <aside className="flex h-full flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Coffee Logic</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">Admin</p>
        </div>
      </div>

      <nav className="grid gap-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition ${
              isActivePath(pathname, item.href)
                ? 'border-blue-200 bg-blue-50 text-blue-900'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:text-blue-800'
            }`}
          >
            <span className="text-slate-600">
              <item.Icon className="h-5 w-5" />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-900">API</p>
        <p className="mt-2">
          Base URL: <span className="font-mono text-[11px]">{API_BASE_URL}</span>
        </p>
      </div>
    </aside>
  );
}

export function AdminLayout({ title, subtitle, actions, searchSlot, children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="mx-auto grid w-full max-w-[82rem] grid-cols-1 gap-5 px-4 py-6 md:grid-cols-[18rem_1fr] md:px-6">
        <div className="panel hidden h-[calc(100vh-3rem)] overflow-hidden md:block">
          <AdminSidebar pathname={pathname} />
        </div>

        <div className="min-w-0">
          <header className="panel mb-5 flex flex-col gap-4 p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 transition hover:border-blue-200 hover:text-blue-800 md:hidden"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation"
                >
                  <IconMenu className="h-5 w-5" />
                </button>
                <HealthPill />
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <SessionControls />
              </div>
            </div>
            {searchSlot ? <div className="w-full">{searchSlot}</div> : null}
          </header>

          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Coffee Logic Admin</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">{subtitle}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">{actions}</div> : null}
          </div>

          <div className="grid gap-5">{children}</div>
        </div>
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/30"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="panel absolute left-4 top-4 h-[calc(100vh-2rem)] w-[min(20rem,calc(100vw-2rem))] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Navigation</p>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-blue-200 hover:text-blue-800"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            <AdminSidebar pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

