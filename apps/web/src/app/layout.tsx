import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodySans = DM_Sans({
  variable: "--font-body-sans",
  subsets: ["latin"],
});

const headingSans = Space_Grotesk({
  variable: "--font-heading-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodySans.variable} ${headingSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
