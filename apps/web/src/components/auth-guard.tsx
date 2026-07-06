'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { clearSession, getSession } from '@/lib/session';
import type { UserRole } from '@/lib/types';

const PRIVILEGED_ROLES: UserRole[] = ['admin', 'manager'];

type AuthGuardProps = {
  children: React.ReactNode;
  /** If provided, only users with this role (or higher privilege) are allowed */
  role?: UserRole;
};

function isRoleAllowed(userRole: UserRole, requiredRole?: UserRole): boolean {
  if (!requiredRole) return true;

  // Admin bypass — admin can always access everything
  if (userRole === 'admin') return true;

  // Manager can access admin-required pages too
  if (requiredRole === 'admin' && userRole === 'manager') return true;

  // Exact match
  return userRole === requiredRole;
}

export function AuthGuard({ children, role }: AuthGuardProps) {
  const router = useRouter();
  const session = getSession();
  const allowed = !!session && isRoleAllowed(session.user.role, role);

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

  const loadingLabel = useMemo(
    () =>
      !session
        ? 'Checking session…'
        : !allowed
          ? 'Insufficient permissions. Redirecting…'
          : `Verifying ${role ?? 'access'}…`,
    [role, session, allowed],
  );

  if (!allowed) {
    return (
      <main>
        <section className="panel fade-up p-6 text-sm" style={{ color: 'var(--muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: 14,
                height: 14,
                border: '2px solid var(--line)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'auth-spin 0.7s linear infinite',
                flexShrink: 0,
              }}
            />
            {loadingLabel}
          </div>
          <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export { PRIVILEGED_ROLES };
