'use client';

import { useRouter } from 'next/navigation';
import { clearAuthSession } from '../storage';
import { useAuthSession } from '../hooks/use-auth-session';

export function SessionControls() {
  const router = useRouter();
  const session = useAuthSession();

  if (!session) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs text-slate-600">
        <p className="font-semibold text-slate-900">{session.user.email}</p>
        <p className="uppercase tracking-[0.18em] text-slate-500">{session.user.role}</p>
      </div>
      <button
        type="button"
        className="btn-danger"
        onClick={() => {
          clearAuthSession();
          router.push('/login');
        }}
      >
        Logout
      </button>
    </div>
  );
}
