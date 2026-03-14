'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuthSession, type AuthRole, type AuthSession } from '../storage';

type AdminSessionGateProps = {
  children: ReactNode;
  requiredRole?: AuthRole;
};

export function AdminSessionGate({ children, requiredRole }: AdminSessionGateProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getAuthSession();
    if (!stored) {
      router.replace('/login');
      return;
    }

    setSession(stored);
    setLoading(false);
  }, [router]);

  const roleAllowed = useMemo(() => {
    if (!requiredRole || !session) {
      return true;
    }

    return session.user.role === requiredRole;
  }, [requiredRole, session]);

  if (loading) {
    return (
      <div className="panel p-6 text-sm text-slate-600">
        Checking administrator access...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!roleAllowed) {
    return (
      <section className="panel fade-up p-6 md:p-7">
        <span className="chip">Access limited</span>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">This area is reserved for administrators</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          You are logged in as {session.user.email} with the role <strong>{session.user.role}</strong>. Ask an administrator to grant a higher permission level if you need product-management access.
        </p>
        <div className="mt-5">
          <Link href="/" className="btn-primary inline-flex items-center">
            Return to overview
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
