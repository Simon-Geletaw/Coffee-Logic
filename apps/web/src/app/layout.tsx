import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from '@/components/providers';

const headingFont = localFont({
  src: [
    { path: '../fonts/space-grotesk.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/space-grotesk.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-heading',
  display: 'swap',
});

const monoFont = localFont({
  src: [
    { path: '../fonts/ibm-plex-mono-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/ibm-plex-mono-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Coffee Logic Admin',
  description: 'Security-first admin control panel for Coffee Logic.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${monoFont.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
