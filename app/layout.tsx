import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google';

import { Providers } from '@/components/Providers';
import { ThemeScript } from '@/components/ThemeScript';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Jean-Michel Volume',
    template: '%s · Jean-Michel Volume',
  },
  description: 'Contrôlez le volume de Spotify avec votre voix. Cinq secondes, un cri, un volume.',
  keywords: [
    'Spotify',
    'contrôle vocal',
    'volume',
    'voice control',
    'Jean-Michel Volume',
    'microphone',
    'audio',
    'Web Audio API',
  ],
  authors: [{ name: 'Gauthier Painteaux' }],
  creator: 'Gauthier Painteaux',
  applicationName: 'Jean-Michel Volume',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    title: 'Jean-Michel Volume',
    description: 'Contrôlez Spotify avec votre voix.',
    siteName: 'Jean-Michel Volume',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Jean-Michel Volume',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jean-Michel Volume',
    description: 'Contrôlez Spotify avec votre voix.',
    images: ['/icon-512.png'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5ef' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0c0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
