import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Syne, Space_Grotesk } from "next/font/google";
import ConditionalAnalytics from "@/components/shared/ConditionalAnalytics";
import CookieConsent from "@/components/shared/CookieConsent";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: 'swap',
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL("https://podtekst.app"),
  title: "PodTeksT — Analizator rozmów z Messengera",
  description:
    "Wrzuć eksport rozmowy z Messengera i odkryj psychologiczną analizę relacji. 28 metryk + analiza AI osobowości i dynamiki.",
  openGraph: {
    title: "PodTeksT — Analizator rozmów z Messengera",
    description:
      "Wrzuć eksport rozmowy z Messengera i odkryj psychologiczną analizę relacji.",
    locale: "pl_PL",
    type: "website",
    images: [
      {
        url: "/og/podtekst-og.png",
        width: 1200,
        height: 630,
        alt: "PodTeksT — Zobacz swoje relacje przez dane",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PodTeksT — Analizator rozmów z Messengera",
    description:
      "Wrzuć eksport rozmowy z Messengera i odkryj psychologiczną analizę relacji.",
    images: ["/og/podtekst-og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${syne.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm"
        >
          Przejdź do treści
        </a>
        <div id="main-content">{children}</div>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <ConditionalAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <CookieConsent />
      </body>
    </html>
  );
}
