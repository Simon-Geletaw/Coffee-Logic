'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/session';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    router.replace('/products');
  }, [router]);

  return (
    <main>
      <section className="panel fade-up p-6 text-sm text-[color:var(--muted)]">Preparing admin workspace...</section>
    </main>
  );
}
