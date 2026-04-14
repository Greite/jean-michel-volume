import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Jean-Michel Volume",
    template: "%s | Jean-Michel Volume",
  },
  description:
    "Contrôlez le volume de Spotify avec votre voix en temps réel. Enregistrez pendant 5 secondes et le volume s'ajustera automatiquement.",
  keywords: [
    "Spotify",
    "contrôle vocal",
    "volume",
    "voice control",
    "Jean-Michel Volume",
    "microphone",
    "audio",
  ],
  authors: [{ name: "Jean-Michel Volume Team" }],
  creator: "Jean-Michel Volume",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "Jean-Michel Volume",
    description: "Contrôlez le volume de Spotify avec votre voix",
    siteName: "Jean-Michel Volume",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jean-Michel Volume",
    description: "Contrôlez le volume de Spotify avec votre voix",
  },
  icons: {
    icon: [{ url: "/icon.webp", type: "image/webp" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
