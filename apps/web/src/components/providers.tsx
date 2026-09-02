'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5 seconds — fast enough to feel fresh after mutations
            staleTime: 5_000,
            // Exponential back-off handled internally by react-query
            retry: 1,
            // Don't refetch on focus — reduces noise in admin panels
            refetchOnWindowFocus: false,
            // Keep previous data visible while re-fetching (no flash of empty)
            placeholderData: (prev: unknown) => prev,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
