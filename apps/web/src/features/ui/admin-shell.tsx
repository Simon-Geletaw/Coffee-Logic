import type { ReactNode } from 'react';
import { AdminNav } from '@/features/products/components/admin-nav';

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
              <p className="text-xs uppercase tracking-[0.28em] text-slate-300/70">Coffee Logic Studio</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-100 md:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-slate-300/80 md:text-base">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">{badge}</div>
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
