'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Check, X, Crown, Zap, Star } from 'lucide-react';

interface PricingTier {
  name: string;
  icon: React.ReactNode;
  monthlyPrice: number;
  annualPrice: number;
  annualTotal: number;
  description: string;
  features: { name: string; included: boolean }[];
  cta: string;
  href: string;
  popular?: boolean;
  badge?: string;
  variant: 'outline' | 'gradient';
}

const TIERS: PricingTier[] = [
  {
    name: 'Unlimited',
    icon: <Crown className="size-5" />,
    monthlyPrice: 79,
    annualPrice: 49,
    annualTotal: 588,
    description: 'Dla power userów i twórców treści',
    features: [
      { name: 'Nieograniczone analizy', included: true },
      { name: 'Pełna analiza ilościowa', included: true },
      { name: 'AI Pass 1 — Przegląd', included: true },
      { name: 'AI Passy 2-4 — Pełna analiza', included: true },
      { name: 'Enhanced Roast', included: true },
      { name: 'Stand-Up Comedy', included: true },
      { name: 'Court Trial', included: true },
      { name: 'Dating Profile', included: true },
      { name: 'Reply Simulator', included: true },
      { name: 'Subtext Decoder', included: true },
      { name: 'CPS Screener', included: true },
      { name: 'Delusion Quiz', included: true },
      { name: 'Nieograniczone Share Cards', included: true },
      { name: 'Export PDF', included: true },
      { name: 'Story / Wrapped', included: true },
      { name: 'Discord Import', included: true },
      { name: 'Priorytetowe AI', included: true },
      { name: 'Wczesny dostęp do nowości', included: true },
    ],
    cta: 'Wybierz Unlimited',
    href: '/analysis/new',
    variant: 'outline',
  },
  {
    name: 'Pro',
    icon: <Zap className="size-5" />,
    monthlyPrice: 29,
    annualPrice: 19,
    annualTotal: 228,
    description: 'Wszystko czego potrzebujesz',
    features: [
      { name: '10 analiz / miesiąc', included: true },
      { name: 'Pełna analiza ilościowa', included: true },
      { name: 'AI Pass 1 — Przegląd', included: true },
      { name: 'AI Passy 2-4 — Pełna analiza', included: true },
      { name: 'Enhanced Roast', included: true },
      { name: 'Stand-Up Comedy', included: true },
      { name: 'Court Trial', included: true },
      { name: 'Dating Profile', included: true },
      { name: 'Reply Simulator', included: true },
      { name: 'Subtext Decoder', included: true },
      { name: 'CPS Screener', included: true },
      { name: 'Delusion Quiz', included: true },
      { name: 'Nieograniczone Share Cards', included: true },
      { name: 'Export PDF', included: true },
      { name: 'Story / Wrapped', included: true },
      { name: 'Discord Import', included: true },
      { name: 'Priorytetowe AI', included: false },
      { name: 'Wczesny dostęp do nowości', included: false },
    ],
    cta: 'Wybierz Pro',
    href: '/analysis/new',
    popular: true,
    badge: 'NAJPOPULARNIEJSZY',
    variant: 'gradient',
  },
  {
    name: 'Darmowy',
    icon: <Star className="size-5" />,
    monthlyPrice: 0,
    annualPrice: 0,
    annualTotal: 0,
    description: 'Na start, bez zobowiązań',
    features: [
      { name: '3 analizy / miesiąc', included: true },
      { name: 'Pełna analiza ilościowa', included: true },
      { name: 'AI Pass 1 — Przegląd', included: true },
      { name: 'AI Passy 2-4 — Pełna analiza', included: false },
      { name: 'Enhanced Roast', included: false },
      { name: 'Stand-Up Comedy', included: false },
      { name: 'Court Trial', included: false },
      { name: 'Dating Profile', included: false },
      { name: 'Reply Simulator', included: false },
      { name: 'Subtext Decoder', included: false },
      { name: 'CPS Screener', included: false },
      { name: 'Delusion Quiz', included: true },
      { name: '3 Share Cards / miesiąc', included: true },
      { name: 'Export PDF', included: false },
      { name: 'Story / Wrapped', included: false },
      { name: 'Discord Import', included: false },
      { name: 'Priorytetowe AI', included: false },
      { name: 'Wczesny dostęp do nowości', included: false },
    ],
    cta: 'Zacznij za darmo',
    href: '/analysis/new',
    variant: 'outline',
  },
];

export default function PricingCards({ isAnnual }: { isAnnual: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div
      ref={ref}
      className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 lg:grid-cols-3"
    >
      {TIERS.map((tier, i) => {
        const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
        const savings = tier.monthlyPrice > 0
          ? (tier.monthlyPrice - tier.annualPrice) * 12
          : 0;

        return (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative flex flex-col rounded-2xl border p-6 transition-colors ${
              tier.popular
                ? 'border-transparent lg:-mt-4 lg:mb-[-16px] lg:pb-10'
                : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a]'
            }`}
            style={
              tier.popular
                ? {
                    background: '#0a0a0a',
                    boxShadow: '0 0 60px rgba(168,85,247,0.08), 0 0 120px rgba(59,130,246,0.04)',
                  }
                : undefined
            }
          >
            {/* Purple gradient border for popular tier */}
            {tier.popular && (
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl"
                style={{
                  padding: '1px',
                  background: 'linear-gradient(135deg, #3b82f6, #a855f7, #3b82f6)',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
            )}

            {/* Badge */}
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="rounded-full px-4 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-widest text-white"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                  }}
                >
                  {tier.badge}
                </span>
              </div>
            )}

            {/* Intro price badge for Pro */}
            {tier.popular && (
              <div className="mb-4 mt-2 flex justify-center">
                <span className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-wider text-[#f59e0b]">
                  Cena wstępna
                </span>
              </div>
            )}

            {/* Header */}
            <div className={`${tier.popular ? '' : 'mt-2'} mb-4 flex items-center gap-2.5`}>
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
              <h3 className="font-story-display text-lg font-bold text-foreground">
                {tier.name}
              </h3>
            </div>

            {/* Description */}
            <p className="mb-5 text-sm text-muted-foreground">{tier.description}</p>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-4xl font-black text-foreground">
                  {price}
                </span>
                <span className="font-mono text-sm text-muted-foreground">
                  {tier.monthlyPrice === 0 ? 'PLN' : 'PLN/mies'}
                </span>
              </div>
              {isAnnual && tier.annualTotal > 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {tier.annualTotal} PLN/rok
                  </span>
                  {savings > 0 && (
                    <span className="rounded-full bg-[#10b981]/15 px-2 py-0.5 font-mono text-[0.6rem] font-semibold text-[#10b981]">
                      Oszczędzasz {savings} PLN
                    </span>
                  )}
                </div>
              )}
              {!isAnnual && tier.monthlyPrice > 0 && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  lub {tier.annualPrice} PLN/mies przy rocznym planie
                </p>
              )}
            </div>

            {/* CTA */}
            <Link
              href={tier.href}
              className={`mb-6 block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
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

            {/* Social proof (Pro only) */}
            {tier.popular && (
              <p className="mb-4 text-center font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                Dołącz do 5,000+ użytkowników
              </p>
            )}

            {/* Features */}
            <div className="flex-1 border-t border-[#1a1a1a] pt-5">
              <ul className="space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature.name} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[#10b981]" />
                    ) : (
                      <X className="mt-0.5 size-3.5 shrink-0 text-[#555555]" />
                    )}
                    <span
                      className={`text-sm ${
                        feature.included ? 'text-foreground' : 'text-[#555555]'
                      }`}
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export { TIERS };
export type { PricingTier };
