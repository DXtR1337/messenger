'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Check, X, Crown, Zap, Star } from 'lucide-react';

interface CompactTier {
  name: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  annualPrice: number;
  annualTotal: number;
  highlights: { text: string; included: boolean }[];
  cta: string;
  href: string;
  popular?: boolean;
  badge?: string;
  variant: 'outline' | 'gradient';
}

const TIERS: CompactTier[] = [
  {
    name: 'Unlimited',
    icon: <Crown className="size-4" />,
    monthlyPrice: 79,
    annualPrice: 49,
    annualTotal: 588,
    highlights: [
      { text: 'Nieograniczone analizy', included: true },
      { text: 'Wszystkie funkcje AI', included: true },
      { text: 'Priorytetowe AI', included: true },
      { text: 'Wczesny dostęp do nowości', included: true },
    ],
    cta: 'Wybierz Unlimited',
    href: '/analysis/new',
    variant: 'outline',
  },
  {
    name: 'Pro',
    icon: <Zap className="size-4" />,
    monthlyPrice: 29,
    annualPrice: 19,
    annualTotal: 228,
    highlights: [
      { text: '10 analiz / miesiąc', included: true },
      { text: 'Wszystkie 4 passy AI', included: true },
      { text: 'Roast, Court, Subtext...', included: true },
      { text: 'PDF Export + Share Cards', included: true },
    ],
    cta: 'Wybierz Pro',
    href: '/analysis/new',
    popular: true,
    badge: 'NAJPOPULARNIEJSZY',
    variant: 'gradient',
  },
  {
    name: 'Darmowy',
    icon: <Star className="size-4" />,
    monthlyPrice: 0,
    annualPrice: 0,
    annualTotal: 0,
    highlights: [
      { text: '3 analizy / miesiąc', included: true },
      { text: 'Pełna analiza ilościowa', included: true },
      { text: 'AI Pass 1 + Quiz samoświadomości', included: true },
      { text: 'Zaawansowane funkcje AI', included: false },
    ],
    cta: 'Zacznij za darmo',
    href: '/analysis/new',
    variant: 'outline',
  },
];

export default function LandingPricing() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const [isAnnual, setIsAnnual] = useState(true);

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="border-t border-[#1a1a1a] bg-[#050505] px-6 py-24"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <p className="mb-3 font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
            CENNIK
          </p>
          <h2 className="font-story-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Wybierz swój plan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Zacznij za darmo — płać gdy potrzebujesz więcej
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-10 flex items-center justify-center gap-3"
        >
          <span
            className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            Miesięcznie
          </span>
          <button
            type="button"
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative h-7 w-12 rounded-full border border-[#2a2a2a] bg-[#111111] transition-colors"
            aria-label={isAnnual ? 'Przełącz na plan miesięczny' : 'Przełącz na plan roczny'}
          >
            <motion.div
              className="absolute top-0.5 size-6 rounded-full"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
              }}
              animate={{ left: isAnnual ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span
            className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            Rocznie
          </span>
          {isAnnual && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-[#10b981]/15 px-2.5 py-0.5 font-mono text-[0.65rem] font-semibold text-[#10b981]"
            >
              -34%
            </motion.span>
          )}
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {TIERS.map((tier, i) => {
            const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
            const savings =
              tier.monthlyPrice > 0
                ? (tier.monthlyPrice - tier.annualPrice) * 12
                : 0;

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border p-5 transition-colors ${
                  tier.popular
                    ? 'border-transparent lg:-mt-2 lg:mb-[-8px] lg:pb-7'
                    : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a]'
                }`}
                style={
                  tier.popular
                    ? {
                        background: '#0a0a0a',
                        boxShadow:
                          '0 0 60px rgba(168,85,247,0.08), 0 0 120px rgba(59,130,246,0.04)',
                      }
                    : undefined
                }
              >
                {/* Gradient border for popular */}
                {tier.popular && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      padding: '1px',
                      background:
                        'linear-gradient(135deg, #3b82f6, #a855f7, #3b82f6)',
                      WebkitMask:
                        'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                    }}
                  />
                )}

                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className="rounded-full px-3 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-widest text-white"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                      }}
                    >
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={
                      tier.popular
                        ? 'text-[#a855f7]'
                        : tier.name === 'Unlimited'
                          ? 'text-[#3b82f6]'
                          : 'text-[#888888]'
                    }
                  >
                    {tier.icon}
                  </span>
                  <h3 className="font-story-display text-base font-bold text-foreground">
                    {tier.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-black text-foreground">
                      {price}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {tier.monthlyPrice === 0 ? 'PLN' : 'PLN/mies'}
                    </span>
                  </div>
                  {isAnnual && savings > 0 && (
                    <span className="mt-1 inline-block rounded-full bg-[#10b981]/15 px-2 py-0.5 font-mono text-[0.55rem] font-semibold text-[#10b981]">
                      Oszczędzasz {savings} PLN/rok
                    </span>
                  )}
                </div>

                {/* Highlights */}
                <ul className="mb-5 flex-1 space-y-2">
                  {tier.highlights.map((h) => (
                    <li key={h.text} className="flex items-center gap-2">
                      {h.included ? (
                        <Check className="size-3.5 shrink-0 text-[#10b981]" />
                      ) : (
                        <X className="size-3.5 shrink-0 text-[#555555]" />
                      )}
                      <span
                        className={`text-xs ${h.included ? 'text-foreground' : 'text-[#555555]'}`}
                      >
                        {h.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={tier.href}
                  className={`block rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                    tier.variant === 'gradient'
                      ? 'text-white hover:opacity-90'
                      : 'border border-[#2a2a2a] bg-transparent text-foreground hover:border-[#3a3a3a] hover:bg-[#111111]'
                  }`}
                  style={
                    tier.variant === 'gradient'
                      ? {
                          background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                        }
                      : undefined
                  }
                >
                  {tier.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Full pricing link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Link
            href="/pricing"
            className="font-mono text-xs font-medium text-muted-foreground underline decoration-[#2a2a2a] underline-offset-4 transition-colors hover:text-foreground hover:decoration-[#555555]"
          >
            Zobacz pełny cennik z porównaniem funkcji
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
