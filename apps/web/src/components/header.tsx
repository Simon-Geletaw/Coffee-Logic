"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, UserRound } from "lucide-react";
import { navItems } from "@/lib/navigation";
import { imagePath } from "@/lib/imageSrc";
import content from "@/lib/content.json";
import MobileNav from "@/components/mobileNavbar";

const iconLinkClass =
  "flex size-9 items-center justify-center rounded-full text-[#2E2A20] transition-colors duration-200 hover:bg-[rgba(176,138,62,0.12)] hover:text-[#8A6420]";

export default function SiteHeader() {
  return (
   <header className="fixed inset-x-0 top-0 z-40">
  <div className="mx-auto w-full max-w-7xl px-4 pt-3 md:px-6 md:pt-4">
    <div className="flex h-16 items-center justify-between rounded-2xl border border-white/30 bg-[#F2EDE2]/75 px-4 shadow-sm backdrop-blur-md md:h-20 md:px-6">

      {/* Logo */}
      <Link
        href="/"
        className="flex shrink-0 items-center gap-3"
      >
        <Image
          src={imagePath(1).src}
          alt={imagePath(1).alt}
          width={56}
          height={56}
          priority
          quality={100}
          className="size-11 object-contain md:size-14"
        />

        <span className="font-display text-lg font-medium uppercase tracking-[0.3em] text-[#252A1D]">
          {content.brand.name}
        </span>
      </Link>

      {/* Navigation */}
      <nav className="hidden items-center gap-8 md:flex lg:gap-10">
        {navItems.map((item) => (
          <Link
            key={item.order}
            href={item.href}
            className="group relative text-[11px] font-medium uppercase tracking-[0.22em] text-[#2E2A20] transition-colors duration-200 hover:text-[#8A6420]"
          >
            {item.label}

            <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-[#B08A3E] transition-all duration-200 group-hover:w-full" />
          </Link>
        ))}
      </nav>

      {/* Icons */}
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/login"
          aria-label="Profile"
          className={iconLinkClass}
        >
          <UserRound
            className="size-[18px]"
            strokeWidth={1.75}
          />
        </Link>


        <Link href="/cart" aria-label="Cart" className={iconLinkClass}>
          <ShoppingBag className="size-[18px]" strokeWidth={1.75} />
        </Link>

        <MobileNav />
      </div>

    </div>
  </div>
</header>
  );
}