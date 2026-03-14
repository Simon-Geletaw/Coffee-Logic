import type { ReactNode } from 'react';
import { AdminNav } from '@/features/products/components/admin-nav';
import { SessionControls } from '@/features/auth/components/session-controls';

type AdminShellProps = {
  currentPath: '/' | '/add-product' | '/manage-products' | '/delete-products' | '/create-user';
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
};

export function AdminShell({ currentPath, title, subtitle, badge, children }: AdminShellProps) {
  return (
    <main className="app-shell">
      <div className="page-wrap">
        <header className="panel fade-up mb-8 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Coffee Logic Admin</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 md:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">{subtitle}</p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex items-center gap-3">{badge}</div>
              <SessionControls />
            </div>
          </div>
          <div className="mt-4">
            <AdminNav currentPath={currentPath} />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
