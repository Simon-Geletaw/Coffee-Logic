'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { clearSession, getSession } from '@/lib/session';
import type { UserRole } from '@/lib/types';

type AuthGuardProps = {
  children: React.ReactNode;
  role?: UserRole;
};

export function AuthGuard({ children, role }: AuthGuardProps) {
  const router = useRouter();
  const session = getSession();
  const allowed = !!session && (!role || session.user.role === role);

  useEffect(() => {
    if (!session) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!allowed) {
      router.replace('/login');
    }
  }, [allowed, router, session]);

  const loadingLabel = useMemo(() => (role ? `Checking ${role} access...` : 'Checking session...'), [role]);

  if (!allowed) {
    return (
      <main>
        <section className="panel fade-up p-6 text-sm text-[color:var(--muted)]">{loadingLabel}</section>
      </main>
    );
  }

  return <>{children}</>;
}
