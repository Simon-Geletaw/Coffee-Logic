import Hero from "@/components/hero";
import FeaturedCoffees from "./sections/featured-coffees";
import OriginCraft from "./sections/origin-craft";
import Cafes from "./sections/cafes";
import SiteFooter from "./sections/site-footer";

export default function StoreFrontPage() {
  return (
    <>
      <main id="main-content" className="m-0 w-full max-w-none p-0">
        <Hero />
        <FeaturedCoffees />
        <OriginCraft />
        <Cafes />
      </main>
      <SiteFooter />
    </>
  );
}
