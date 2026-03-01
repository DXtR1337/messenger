import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tryb Eks \u00B7 Sekcja Zwlok \u2014 PodTeksT',
  description: 'Kinematograficzna autopsja zakonczonego zwiazku. 11 scen, przyczyna smierci, punkt bez powrotu, prognoza powrotu.',
  openGraph: {
    title: 'Tryb Eks \u00B7 Sekcja Zwlok',
    description: 'Kinematograficzna autopsja zakonczonego zwiazku na PodTeksT.',
    type: 'website',
    siteName: 'PodTeksT',
    locale: 'pl_PL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tryb Eks \u00B7 PodTeksT',
    description: 'Autopsja zakonczonego zwiazku — 11 scen, akt zgonu, prognoza powrotu.',
  },
};

export default function EksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
