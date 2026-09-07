import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Props = { eyebrow: string; title: string; text: string };

export default function ComingSoon({ eyebrow, title, text }: Props) {
  return (
    <main id="main-content" className="cafe-finale flex min-h-screen items-center">
      <div className="mx-auto w-full max-w-3xl px-6 pt-32 pb-24">
        <p className="storefront-eyebrow">{eyebrow}</p>
        <h1 className="mt-5 font-display text-5xl leading-[1.05] sm:text-7xl">{title}</h1>
        <p className="mt-6 max-w-md text-sm leading-7 text-[#bdc7b9]">{text}</p>
        <div className="mt-10 flex flex-wrap gap-6">
          <Link href="/#featured" className="btn-hero-primary !rounded-[3px] !bg-[#d4b478] !text-[#16261c] !text-xs">Browse the coffees <ArrowUpRight size={16} /></Link>
          <Link href="/#cafes" className="cta-underline-light">Visit a café</Link>
        </div>
      </div>
    </main>
  );
}
