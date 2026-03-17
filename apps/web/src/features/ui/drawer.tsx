'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { IconX } from './icons';

type DrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export function Drawer({ open, title, description, children, footer, onClose }: DrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[65] flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-slate-950/30"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="panel relative h-full w-full max-w-[38rem] overflow-y-auto rounded-none rounded-l-3xl border-l border-slate-200 p-6 shadow-[0_18px_48px_rgba(12,28,52,0.18)] md:p-7"
      >
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX className="h-4 w-4" />
          </button>
        </header>

        <div>{children}</div>

        {footer ? <footer className="mt-8 border-t border-slate-200 pt-5">{footer}</footer> : null}
      </aside>
    </div>
  );
}

