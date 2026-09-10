import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { imagePath } from "@/lib/imageSrc";
import content from "@/lib/content.json";
import HeroExperience from "@/components/hero-experience";

export default function Hero() {
  const image = imagePath(2);

  return (
    <section className="roastery-hero" aria-labelledby="hero-title">
      <HeroExperience>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority
          quality={75}
          sizes="100vw"
          className="hero-poster"
        />
      </HeroExperience>
      <div className="hero-scrim" aria-hidden="true" />
      <div className="hero-copy hero-stagger">
        <p className="storefront-eyebrow"><span /> {content.hero.badge}</p>
        <h1 id="hero-title">Rooted in Ethiopia.<br />Made for <em>your ritual.</em></h1>
        <p className="hero-description">A world of character in a single bean. Discover Ethiopian coffee, from its extraordinary origins to your everyday cup.</p>
        <div className="hero-actions">
          <Link href="/#featured" className="btn-hero-primary">Explore the coffees <ArrowUpRight size={17} /></Link>
          <Link href="/#cafes" className="hero-secondary">Find your café <ArrowUpRight size={16} /></Link>
        </div>
      </div>
      <div className="hero-bottom">
        <span>SIDAMO <b>·</b> YIRGACHEFFE <b>·</b> GUJI</span>
        <Link href="/#featured">Discover what’s inside <ArrowDown size={14} /></Link>
      </div>
    </section>
  );
}
