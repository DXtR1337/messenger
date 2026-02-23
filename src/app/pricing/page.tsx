import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PricingToggle from '@/components/pricing/PricingToggle';
import PricingCards from '@/components/pricing/PricingCards';
import PTLogo from '@/components/shared/PTLogo';
import BrandP from '@/components/shared/BrandP';

const PricingComparison = dynamic(() => import('@/components/pricing/PricingComparison'));
const PricingFAQ = dynamic(() => import('@/components/pricing/PricingFAQ'));

export const metadata: Metadata = {
  title: 'Cennik',
  description:
    'Wybierz plan PodTeksT — od darmowego po nieograniczone analizy rozmów z AI. Analizuj rozmowy z Messengera, WhatsApp, Instagram, Telegram i Discord.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#050505]">
      {/* Navigation bar */}
      <nav className="border-b border-[#1a1a1a] bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <PTLogo size={24} className="shrink-0" />
            <span className="brand-logo font-display text-base font-bold tracking-tight leading-none flex items-center">
              <BrandP height="0.85em" />
              <span className="text-[#3b82f6]">od</span>
              <span className="text-[#a855f7]">T</span>
              <span className="brand-eks text-[#a855f7]">eks</span>
              <span className="text-[#a855f7]">T</span>
            </span>
          </Link>
          <Link
            href="/analysis/new"
            className="rounded-lg border border-[#2a2a2a] bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[#3a3a3a] hover:bg-[#111111]"
          >
            Analizuj rozmowę
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pb-8 pt-20 text-center">
        <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
          CENNIK
        </p>
        <h1 className="font-story-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Wybierz swój plan
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Zacznij za darmo — płać gdy potrzebujesz więcej.
          Bez ukrytych opłat, bez przymusowego kontraktu.
        </p>
      </section>

      {/* Toggle + Cards */}
      <section className="pb-20">
        <PricingToggle>
          {(isAnnual) => <PricingCards isAnnual={isAnnual} />}
        </PricingToggle>
      </section>

      {/* Comparison table */}
      <PricingComparison />

      {/* FAQ */}
      <PricingFAQ />

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] px-6 py-8 text-center">
        <p className="text-xs text-[#555555]">
          &copy; {new Date().getFullYear()} PodTeksT. Wszystkie prawa zastrzeżone.
        </p>
      </footer>
    </main>
  );
}
