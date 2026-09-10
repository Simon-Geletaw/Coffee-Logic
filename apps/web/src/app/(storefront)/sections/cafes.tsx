import Image from "next/image";
import { imagePath } from "@/lib/imageSrc";
import CafeExplorer from "@/components/cafe-explorer";
import Reveal from "@/components/reveal";

export default function Cafes() {
  const image = imagePath(3);
  return (
    <section id="cafes" className="cafe-finale" aria-labelledby="cafes-title">
      <div className="cafe-invitation">
        <div className="cafe-invitation-image">
          <Image src={image.src} alt="A quiet coffee bar with warm stone finishes and Melkora coffee on display" fill quality={75} sizes="(min-width: 900px) 52vw, 100vw" className="object-cover object-left" />
          <span className="image-caption">A LITTLE SPACE. A SLOWER PACE.</span>
        </div>
        <Reveal className="cafe-invitation-copy">
          <p className="storefront-eyebrow">THE CAFÉ EXPERIENCE</p>
          <h2 id="cafes-title">Good coffee.<br /><em>Better company.</em></h2>
          <p>Some things are worth sitting down for. A carefully made coffee. An unhurried conversation. A place that feels a little like your own.</p>
          <a href="#cafe-finder" className="cta-underline-light">Explore the neighborhoods ↗</a>
        </Reveal>
      </div>
      <div id="cafe-finder" className="cafe-finder-shell">
        <div className="cafe-finder-heading">
          <div><p className="storefront-eyebrow">FIND YOUR CORNER</p><h3>Meet us in <em>Addis.</em></h3></div>
          <p>Explore three neighborhood concepts.<br />Choose a location to take a closer look.</p>
        </div>
        <CafeExplorer />
      </div>
    </section>
  );
}
