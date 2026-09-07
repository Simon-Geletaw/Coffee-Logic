"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ShoppingBag, UserRound } from "lucide-react";
import { navItems } from "@/lib/navigation";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const linkClass =
    "flex min-h-11 items-center rounded-xl px-3 text-[13px] font-medium uppercase tracking-[0.18em] text-[#2E2A20] transition-colors duration-200 hover:bg-[rgba(176,138,62,0.14)] hover:text-[#8A6420]";

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex size-9 items-center justify-center rounded-full text-[#2E2A20] transition-colors duration-200 hover:bg-[rgba(176,138,62,0.12)] hover:text-[#8A6420]"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {/* Backdrop — starts below the header bar so the toggle stays clickable */}
      <div
        aria-hidden={!open}
        onClick={close}
        className={`fixed inset-x-0 bottom-0 top-[4.75rem] bg-[#140D05]/25 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Cream dropdown panel */}
      <div
        id="mobile-nav-panel"
        ref={panelRef}
        aria-hidden={!open}
        className={`fixed inset-x-4 top-[5.25rem] origin-top rounded-2xl border border-white/40 bg-[#F2EDE2]/95 p-3 shadow-[0_18px_40px_rgba(20,13,5,0.28)] backdrop-blur-md transition-all duration-200 ease-out ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0"
        }`}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={linkClass}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="my-2 h-px bg-[rgba(46,42,32,0.12)]" />

        <div className="flex flex-col gap-0.5">
          <Link href="/cart" onClick={() => setOpen(false)} className={linkClass}>
            <ShoppingBag className="mr-3 size-4" strokeWidth={1.75} />
            Cart
          </Link>
          <Link href="/login" onClick={() => setOpen(false)} className={linkClass}>
            <UserRound className="mr-3 size-4" strokeWidth={1.75} />
            Login
          </Link>
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[rgba(46,42,32,0.06)] text-[11px] font-semibold uppercase tracking-[0.2em] text-[#5A5346] transition-colors duration-200 hover:bg-[rgba(176,138,62,0.14)] hover:text-[#8A6420]"
        >
          <X className="size-4" strokeWidth={2} />
          Close
        </button>
      </div>
    </div>
  );
}
