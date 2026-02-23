import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Syne, Space_Grotesk } from "next/font/google";
import ConditionalAnalytics from "@/components/shared/ConditionalAnalytics";
import CookieConsent from "@/components/shared/CookieConsent";
import ReferralCapture from "@/components/shared/ReferralCapture";
import { TierProvider } from "@/lib/tiers/tier-context";
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
  title: {
    default: "PodTeksT — odkryj to, co kryje się między wierszami",
    template: "%s | PodTeksT",
  },
  description:
    "Przeanalizuj rozmowy z Messengera, WhatsApp, Instagram, Telegram i Discord. 60+ metryk + wielowymiarowa analiza psychologiczna AI. Odkryj podtekst swoich relacji.",
  keywords: [
    "analiza rozmów",
    "messenger analiza",
    "whatsapp analiza",
    "instagram analiza",
    "telegram analiza",
    "analiza relacji",
    "psychologia rozmów",
    "analiza AI",
    "podtekst",
    "analiza konwersacji",
  ],
  alternates: {
    canonical: "https://podtekst.app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PodTeksT — odkryj to, co kryje się między wierszami",
    description:
      "Przeanalizuj rozmowy z Messengera, WhatsApp, Instagram, Telegram i Discord. 60+ metryk + analiza psychologiczna AI.",
    locale: "pl_PL",
    type: "website",
    siteName: "PodTeksT",
    images: [
      {
        url: "/og/podtekst-og.png",
        width: 1200,
        height: 630,
        alt: "PodTeksT — odkryj to, co kryje się między wierszami",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PodTeksT — odkryj to, co kryje się między wierszami",
    description:
      "Przeanalizuj rozmowy z Messengera, WhatsApp, Instagram, Telegram i Discord. 60+ metryk + analiza psychologiczna AI.",
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
        <TierProvider>
          <div id="main-content">{children}</div>
        </TierProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <ConditionalAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <CookieConsent />
        <ReferralCapture />
      </body>
    </html>
  );
}
