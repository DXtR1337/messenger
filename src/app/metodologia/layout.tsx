import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jak to działa? — PodTeksT',
  description:
    'Poznaj 30+ algorytmów ilościowych i 14+ modeli AI stojących za analizą Twoich rozmów. Źródła naukowe, ograniczenia, transparentna metodologia.',
  openGraph: {
    title: 'Jak to działa? — PodTeksT',
    description:
      '30+ algorytmów matematycznych + 14 modeli AI. Sprawdź jak analizujemy Twoje czaty.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jak to działa? — PodTeksT',
    description:
      '30+ algorytmów matematycznych + 14 modeli AI. Sprawdź jak analizujemy Twoje czaty.',
  },
};

export default function MethodologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
