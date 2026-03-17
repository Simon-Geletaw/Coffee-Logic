import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/features/ui/toast";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
