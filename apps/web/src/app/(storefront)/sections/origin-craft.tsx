import Image from "next/image";
import Link from "next/link";
import content from "@/lib/content.json";
import { imagePath } from "@/lib/imageSrc";
import Ornament from "./ornament";
import Reveal from "@/components/reveal";

export default function OriginCraft() {
  const { eyebrow, title, text, cta } = content.origin;
  const image = imagePath(8);

  return (
    <section
      id="story"
      className="relative flex items-center overflow-hidden bg-forest min-h-[280px] sm:min-h-[340px] md:min-h-[420px] lg:min-h-[480px] xl:min-h-[520px]"
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        quality={75}
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: "35% center" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-forest/85 via-forest/40 to-transparent"
      />

      <div className="origin-copy relative mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <Reveal className="flex max-w-md flex-col items-start gap-4 md:gap-5">
          <Ornament tone="light" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#C9A45C]">
            {eyebrow}
          </span>
          <h2 className="font-display text-4xl font-medium uppercase leading-[1.05] tracking-[0.05em] text-[#F4EFE3] sm:text-5xl md:text-6xl lg:text-[4.25rem]">
            {title}
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-[#D8D2C2]/90 sm:text-[15px]">
            {text}
          </p>
          <Link href={cta.href} className="cta-underline-light mt-2">
            {cta.label}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
