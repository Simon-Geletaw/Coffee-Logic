import type { StaticImageData } from "next/image";

import logoMark from "@/components/assets/melkora_logo_mark.webp";
import heroImage from "@/components/assets/hero.webp";
import cafeScene from "@/components/assets/melkora_cafe_scene.webp";
import bagSidamo from "@/components/assets/coffee_bag_1.webp";
import bagYirgacheffe from "@/components/assets/coffee_bag_2.webp";
import bagGuji from "@/components/assets/coffee_bag_3.webp";
import productLineup from "@/components/assets/melkora_product_lineup.webp";
import originStory from "@/components/assets/origin_story.webp";
import darkBackground from "@/components/assets/melkora_dark_background.webp";
import limestoneBackground from "@/components/assets/melkora_limestone_background.webp";

export type imagePath = { order: number; src: StaticImageData; alt: string };

export {
  logoMark,
  heroImage,
  cafeScene,
  bagSidamo,
  bagYirgacheffe,
  bagGuji,
  productLineup,
  originStory,
  darkBackground,
  limestoneBackground,
};

export const imagePaths: imagePath[] = [
  { order: 1, src: logoMark, alt: "Melkora coffee roasters logo mark" },
  { order: 2, src: heroImage, alt: "Melkora Ethiopia single origin coffee hero" },
  { order: 3, src: cafeScene, alt: "Melkora cafe scene" },
  { order: 4, src: bagSidamo, alt: "Melkora Sidamo single origin coffee bag" },
  { order: 5, src: bagYirgacheffe, alt: "Melkora Yirgacheffe single origin coffee bag" },
  { order: 6, src: bagGuji, alt: "Melkora Guji single origin coffee bag" },
  { order: 7, src: productLineup, alt: "Melkora coffee product lineup" },
  { order: 8, src: originStory, alt: "Melkora Ethiopia origin story" },
  { order: 9, src: darkBackground, alt: "Melkora dark background" },
  { order: 10, src: limestoneBackground, alt: "Melkora limestone background" },
];

export function imagePath(order: number): imagePath {
  const entry = imagePaths.find((image) => image.order === order);
  if (!entry) throw new Error(`No image registered for order ${order}`);
  return entry;
}
