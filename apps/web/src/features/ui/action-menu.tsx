'use client';

import { useEffect, useRef, useState } from 'react';
import { IconDots } from './icons';

type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: 'danger' | 'neutral';
  disabled?: boolean;
};

type ActionMenuProps = {
  label?: string;
  items: ActionMenuItem[];
  align?: 'left' | 'right';
};

export function ActionMenu({ label = 'Row actions', items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const menuPosition =
    align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-blue-200 hover:text-blue-800"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="sr-only">{label}</span>
        <IconDots className="h-4 w-4" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className={`absolute z-30 mt-2 w-44 ${menuPosition} rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_16px_40px_rgba(12,28,52,0.16)]`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                item.tone === 'danger'
                  ? 'text-rose-700 hover:bg-rose-50'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              } ${item.disabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : ''}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type { ActionMenuItem };
