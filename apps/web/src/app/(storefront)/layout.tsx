import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import SiteHeader from "@/components/header";
import "leaflet/dist/leaflet.css";
import "./storefront.css";

export const metadata: Metadata = {
  title: "Melkora — Ethiopian Coffee & Everyday Rituals",
  description: "Specialty Ethiopian coffee — Sidamo, Yirgacheffe and more.",
};

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

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
