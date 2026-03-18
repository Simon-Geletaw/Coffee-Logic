'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Package, Users } from 'lucide-react';
import { clearSession, getSession } from '@/lib/session';

type AdminShellProps = {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const nav = [
  { href: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/products', label: 'Products', Icon: Package },
  { href: '/users', label: 'Users', Icon: Users },
];

export function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();

  return (
    <main className="grid gap-5 md:grid-cols-[16rem_1fr]">
      <aside className="panel p-4 md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Coffee Logic</p>
        <h1 className="mt-2 text-xl font-bold">Admin Console</h1>

        <nav className="mt-4 grid gap-2">
          {nav.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                pathname === href
                  ? 'border-[color:var(--line-strong)] bg-[#f6ece0] text-[color:var(--text)]'
                  : 'border-[color:var(--line)] bg-[color:var(--surface-strong)] text-[color:var(--muted)] hover:border-[color:var(--line-strong)]',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 rounded-xl border border-[color:var(--line)] bg-[#fbf7ef] p-3 text-xs">
          <p className="font-semibold">Signed in as</p>
          <p className="mt-1 break-all">{session?.user.email ?? 'Unknown'}</p>
          <p className="mt-1 uppercase tracking-[0.18em] text-[color:var(--muted)]">{session?.user.role ?? 'guest'}</p>
        </div>

        <button
          type="button"
          className="btn btn-danger mt-4 inline-flex w-full items-center justify-center gap-2"
          onClick={() => {
            clearSession();
            router.replace('/login');
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <section className="min-w-0">
        <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-sm text-[color:var(--muted)]">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>

        <div className="grid gap-4">{children}</div>
      </section>
    </main>
  );
}
