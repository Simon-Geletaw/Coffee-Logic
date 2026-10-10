import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import SiteHeader from "@/components/header";
import "leaflet/dist/leaflet.css";
import "./storefront.css";

export const metadata: Metadata = {
  title: "Melkora — Ethiopian Coffee & Everyday Rituals",
  description: "Specialty Ethiopian coffee — Sidamo, Yirgacheffe and more.",
};

const display = localFont({
  src: [
    { path: "../../fonts/cormorant-garamond.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/cormorant-garamond.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/cormorant-garamond.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});
const body = localFont({
  src: "../../fonts/inter.woff2",
  weight: "400 700",
  variable: "--font-body",
  display: "swap",
});

export default function StoreFrontLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${display.variable} ${body.variable} storefront min-h-screen bg-cream font-[family-name:var(--font-body)]`}
    >
      <a className="storefront-skip" href="#main-content">Skip to content</a>
      <SiteHeader />
      {children}
    </div>
  );
}
