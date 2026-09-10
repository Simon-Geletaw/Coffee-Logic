import Image from "next/image";
import Ornament from "./ornament";
import content from "@/lib/content.json";
import { imagePaths } from "@/lib/imageSrc";
import Reveal from "@/components/reveal";

export default function FeaturedCoffees() {
  const { title, products } = content.featured;

  return (
    <section id="featured" className="bg-cream-soft py-20 sm:py-24 md:py-28 lg:py-32">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#3B3A2C]">
            {title}
          </h2>
          <p className="featured-heading">Three origins. A world of possibility.</p>
          <p className="mt-2 max-w-lg text-sm leading-7 text-[#5A5346]">Discover Sidamo, Yirgacheffe and Guji — three names at the heart of our Ethiopian coffee collection.</p>
          <Ornament />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:mt-14 md:gap-8 lg:grid-cols-3 lg:gap-10">
          {products.map((product, index) => {
            const image = imagePaths.find((entry) => entry.order === product.imageOrder);
            if (!image) return null;
            return (
              <Reveal key={product.name} delay={index * 120} className="tilt-card">
              <article
                className="group flex h-full flex-col items-center border border-[#E4DBC9] bg-white/40 px-6 pb-9 pt-10 text-center transition-all duration-300 hover:border-[#D3C4A6] hover:shadow-[0_18px_36px_rgba(63,48,22,0.10)]"
              >
                <div className="flex h-56 w-full items-center justify-center sm:h-64 md:h-72">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    quality={100}
                    sizes="(min-width: 1024px) 384px, (min-width: 640px) 45vw, 90vw"
                    className="h-full w-auto object-contain drop-shadow-[0_18px_22px_rgba(60,45,20,0.18)] transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <h3 className="mt-7 text-sm font-semibold uppercase tracking-[0.3em] text-[#2E2A20]">
                  {product.name}
                </h3>
                <p className="mt-2.5 text-[10px] font-medium uppercase tracking-[0.32em] text-[#8A7F6A]">
                  {product.subtitle}
                </p>
                <Ornament className="mt-4" />
              </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
