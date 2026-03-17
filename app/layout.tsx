import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radhakrishna Optical | Premium Vision Care',
  description: 'Luxury Offline Optical Dashboard • PWA • OLED Dark Glassmorphism',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className="bg-black text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}
