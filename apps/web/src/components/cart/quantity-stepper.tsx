'use client';

import clsx from 'clsx';
import { Minus, Plus } from 'lucide-react';

type Props = {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  /** 20 mirrors the API's per-line cap, so the UI cannot request a rejection. */
  max?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
};

/** Reusable -/+ quantity control used by cart lines and the product page. */
export default function QuantityStepper({
  quantity,
  onChange,
  min = 1,
  max = 20,
  disabled = false,
  label = 'Quantity',
  className,
}: Props) {
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, quantity + delta));
    if (next !== quantity) onChange(next);
  };

  const buttonClass =
    'flex size-9 items-center justify-center text-[#2E2A20] transition-colors hover:bg-[#B08A3E]/12 disabled:cursor-not-allowed disabled:text-[#B5AC98] disabled:hover:bg-transparent';

  return (
    <div
      className={clsx(
        'inline-flex items-center border border-[#E4DBC9] bg-white/50',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={disabled || quantity <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className={buttonClass}
      >
        <Minus size={13} strokeWidth={2} aria-hidden />
      </button>

      <span
        aria-live="polite"
        className="min-w-9 text-center text-xs font-medium tabular-nums text-[#2E2A20]"
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={() => step(1)}
        disabled={disabled || quantity >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className={buttonClass}
      >
        <Plus size={13} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
