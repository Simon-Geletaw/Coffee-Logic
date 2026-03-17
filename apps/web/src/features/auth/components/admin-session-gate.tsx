'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type AuthRole } from '../storage';
import { useAuthSession } from '../hooks/use-auth-session';

type AdminSessionGateProps = {
  children: ReactNode;
  requiredRole?: AuthRole;
};

export function AdminSessionGate({ children, requiredRole }: AdminSessionGateProps) {
  const router = useRouter();
  const session = useAuthSession();

  useEffect(() => {
    if (session) {
      return;
    }

    const id = window.setTimeout(() => {
      router.replace('/login');
    }, 0);

    return () => window.clearTimeout(id);
  }, [router, session]);

  const roleAllowed = useMemo(() => {
    if (!requiredRole || !session) {
      return true;
    }

    return session.user.role === requiredRole;
  }, [requiredRole, session]);

  if (!session) {
    return (
      <div className="panel p-6 text-sm text-slate-600">
        Admin
      </div>
    );
  }

  if (!roleAllowed) {
    return (
      <section className="panel fade-up p-6 md:p-7">
        <span className="chip">Admin</span>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">Access denied</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">Admin only.</p>
        <div className="mt-5">
          <Link href="/" className="btn-primary inline-flex items-center">
            Back
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
