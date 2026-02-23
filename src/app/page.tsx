import dynamic from 'next/dynamic';
import LandingHero from '@/components/landing/LandingHero';
import LandingSocialProof from '@/components/landing/LandingSocialProof';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import CurtainReveal from '@/components/landing/CurtainReveal';
import ScrollProgress from '@/components/landing/ScrollProgress';
import ToggleLettersButton from '@/components/landing/ToggleLettersButton';

const ParticleBackground = dynamic(() => import('@/components/landing/ParticleBackground'));
const LandingDemo = dynamic(() => import('@/components/landing/LandingDemo'));
const LandingPricing = dynamic(() => import('@/components/landing/LandingPricing'));
const LandingFAQ = dynamic(() => import('@/components/landing/LandingFAQ'));
const LandingFooter = dynamic(() => import('@/components/landing/LandingFooter'));

const webAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'PodTeksT',
  url: 'https://podtekst.app',
  description: 'Analizator rozmów z AI — 60+ metryk + wielowymiarowa analiza psychologiczna relacji',
  applicationCategory: 'UtilityApplication',
  operatingSystem: 'Web',
  inLanguage: 'pl',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'PLN',
    description: 'Darmowa analiza podstawowa',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Czy moje wiadomości są bezpieczne?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Twoje wiadomości są analizowane statystycznie w przeglądarce. Dla analizy AI, niewielka próbka (~2% wiadomości) jest bezpiecznie przesyłana do serwera AI i natychmiast usuwana po przetworzeniu. Żadne wiadomości nie są nigdy zapisywane.',
      },
    },
    {
      '@type': 'Question',
      name: 'Jak wyeksportować rozmowę z Messengera?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Wejdź na Facebooka → Ustawienia → Twoje informacje → Pobierz swoje informacje → Zaznacz tylko 'Wiadomości' → Format JSON → Utwórz plik. Pobierz i rozpakuj archiwum.",
      },
    },
    {
      '@type': 'Question',
      name: 'Jakie formaty plików są obsługiwane?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Obsługujemy 5 platform: Facebook Messenger (JSON), WhatsApp (TXT), Instagram DM (JSON), Telegram (JSON) oraz Discord (import przez bota). Automatycznie rozpoznajemy format pliku.',
      },
    },
    {
      '@type': 'Question',
      name: 'Ile wiadomości potrzeba do analizy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Minimum 100 wiadomości. Dla pełnej analizy psychologicznej rekomendujemy co najmniej 1000 wiadomości. Im dłuższa historia konwersacji, tym trafniejsze wyniki.',
      },
    },
    {
      '@type': 'Question',
      name: 'Czy analiza AI jest dokładna?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Analiza AI opiera się na modelach językowych i dostarcza przybliżone obserwacje, a nie diagnozy kliniczne. Wyniki powinny być traktowane jako punkt wyjścia do refleksji.',
      },
    },
    {
      '@type': 'Question',
      name: 'Jaki AI używacie?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Google Gemini — najnowszy model AI do analizy tekstu. Każda rozmowa przechodzi przez 4 przebiegi AI: przegląd, dynamika, profile osobowości i synteza z oceną zdrowia relacji.',
      },
    },
  ],
};

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <noscript>
        <style>{`.landing-content { opacity: 1 !important; }`}</style>
      </noscript>
      <CurtainReveal />
      <ScrollProgress />
      <ToggleLettersButton />

      <ParticleBackground />

      <div id="landing-content" className="landing-content">
        <LandingHero />
        <LandingSocialProof />
        <LandingHowItWorks />
        <LandingDemo />
        <LandingPricing />
        <LandingFAQ />
        <LandingFooter />
      </div>
    </main>
  );
}
