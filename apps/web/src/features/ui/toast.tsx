'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { IconX } from './icons';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastInput = {
  kind: ToastKind;
  title: string;
  message?: string;
  timeoutMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const defaultTimeoutByKind: Record<ToastKind, number> = {
  success: 3600,
  info: 4200,
  error: 7000,
};

function toastStyles(kind: ToastKind) {
  if (kind === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  }
  if (kind === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-900';
  }
  return 'border-slate-200 bg-white text-slate-900';
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      window.clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const item: ToastItem = { ...input, id };
      setToasts((prev) => [item, ...prev].slice(0, 4));

      const timeoutMs = input.timeoutMs ?? defaultTimeoutByKind[input.kind];
      const timeout = window.setTimeout(() => dismiss(id), timeoutMs);
      timeoutsRef.current.set(id, timeout);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto rounded-2xl border p-4 shadow-[0_12px_30px_rgba(12,28,52,0.12)] ${toastStyles(toast.kind)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-sm opacity-80">{toast.message}</p> : null}
              </div>
              <button
                type="button"
                className="rounded-xl border border-transparent p-2 text-slate-600 transition hover:border-slate-200 hover:bg-white"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

