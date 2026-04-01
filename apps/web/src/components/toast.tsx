'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────── */
export type ToastVariant = 'success' | 'error' | 'info';

type ToastEntry = {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  exiting?: boolean;
};

type ToastContextValue = {
  toast: (variant: ToastVariant, title: string, message?: string) => void;
};

/* ─── Context ────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={17} className="toast-icon" aria-hidden />,
  error: <XCircle size={17} className="toast-icon" aria-hidden />,
  info: <Info size={17} className="toast-icon" aria-hidden />,
};

const AUTO_DISMISS_MS = 3500;
const EXIT_ANIMATION_MS = 240;

/* ─── Provider ───────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, EXIT_ANIMATION_MS);
    timers.current.set(id, timer);
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, variant, title, message }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="toast-container"
        aria-live="polite"
        aria-atomic="false"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`toast toast-${t.variant}${t.exiting ? ' exiting' : ''}`}
          >
            {ICONS[t.variant]}
            <div className="toast-body">
              <p className="toast-title">{t.title}</p>
              {t.message ? <p className="toast-message">{t.message}</p> : null}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────── */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
