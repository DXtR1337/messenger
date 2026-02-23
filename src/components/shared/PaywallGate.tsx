'use client';

import { useState } from 'react';
import { Brain, Flame, Heart, Shield, Sparkles } from 'lucide-react';
import { useTier } from '@/lib/tiers/tier-context';
import { type FeatureKey, FEATURE_LABELS } from '@/lib/tiers/features';
import { UpgradeModal } from './UpgradeModal';

// ---------------------------------------------------------------------------
// Contextual default headlines per feature
// ---------------------------------------------------------------------------
const FEATURE_TEASERS: Record<FeatureKey, string> = {
  quantitative_analysis: 'Analiza ilościowa gotowa',
  ai_pass_1: 'Wstępna analiza AI gotowa',
  ai_passes_2_4: 'Pełna analiza psychologiczna jest gotowa',
  enhanced_roast: 'Psychologiczny roast jest gotowy',
  standup_comedy: 'Stand-Up Comedy Roast gotowy',
  court_trial: 'Akt oskarżenia gotowy',
  dating_profile: 'Twój szczery profil randkowy czeka',
  reply_simulator: 'Symulacja odpowiedzi gotowa',
  subtext_decoder: 'Ukryte podteksty wykryte',
  cps_screener: '63 wzorce komunikacji do analizy',
  delusion_quiz: 'Quiz deluzji gotowy',
  share_cards: 'Karty do udostępnienia gotowe',
  pdf_export: 'Raport PDF gotowy do pobrania',
  story_wrapped: 'Twoja historia relacji czeka',
  discord_import: 'Import z Discorda dostępny',
};

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------
const ICON_MAP = {
  brain: Brain,
  fire: Flame,
  heart: Heart,
  shield: Shield,
  sparkles: Sparkles,
} as const;

type IconKey = keyof typeof ICON_MAP;

// ---------------------------------------------------------------------------
// CTA glow animation style (inline — no external CSS dependency)
// ---------------------------------------------------------------------------
const ctaGlowStyle: React.CSSProperties = {
  animation: 'ctaGlow 2s ease-in-out infinite',
};

// We inject the @keyframes via a tiny <style> tag rendered once per gate
const CTA_KEYFRAMES = `
@keyframes ctaGlow {
  0%, 100% { box-shadow: 0 0 15px rgba(168, 85, 247, 0.3); }
  50% { box-shadow: 0 0 25px rgba(168, 85, 247, 0.5), 0 0 50px rgba(59, 130, 246, 0.2); }
}`;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PaywallGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  blurPreview?: boolean;
  teaser?: {
    headline: string;
    detail?: string;
    stat?: string;
    statLabel?: string;
    icon?: IconKey;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PaywallGate({
  feature,
  children,
  blurPreview = true,
  teaser,
}: PaywallGateProps) {
  const { canUse } = useTier();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Feature is accessible — render children normally
  if (canUse(feature)) {
    return <>{children}</>;
  }

  // Resolve icon
  const IconComponent = teaser?.icon ? ICON_MAP[teaser.icon] : Sparkles;

  // Resolve headline
  const headline = teaser?.headline ?? FEATURE_TEASERS[feature] ?? FEATURE_LABELS[feature];

  return (
    <div className="relative">
      {/* Inject CTA glow keyframes */}
      <style dangerouslySetInnerHTML={{ __html: CTA_KEYFRAMES }} />

      {/* Blurred or placeholder content */}
      {blurPreview ? (
        <div
          className="pointer-events-none select-none"
          style={{ filter: 'blur(6px)' }}
          aria-hidden="true"
        >
          {children}
        </div>
      ) : (
        <div
          className="flex min-h-[200px] items-center justify-center rounded-xl border border-border bg-card"
          aria-hidden="true"
        >
          <Sparkles className="size-12 text-muted-foreground/30" />
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-xl bg-[#0a0a0a]/85 backdrop-blur-md">
        <div className="flex max-w-xs flex-col items-center gap-3 px-4 text-center sm:max-w-sm sm:gap-4 sm:px-6">
          {/* Icon with gradient glow */}
          <div className="relative flex items-center justify-center">
            {/* Glow backdrop */}
            <div
              className="absolute size-16 rounded-full blur-xl"
              style={{
                background:
                  'radial-gradient(circle, rgba(168,85,247,0.2) 0%, rgba(59,130,246,0.2) 60%, transparent 100%)',
              }}
            />
            <IconComponent className="relative size-8 text-purple-400" />
          </div>

          {/* Headline */}
          <h3 className="text-sm font-bold text-foreground">{headline}</h3>

          {/* Stat display */}
          {teaser?.stat && (
            <div className="flex flex-col items-center gap-0.5">
              <span
                className="text-3xl font-bold"
                style={{
                  background: 'linear-gradient(to right, #3b82f6, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {teaser.stat}
              </span>
              {teaser.statLabel && (
                <span className="text-[11px] text-muted-foreground">
                  {teaser.statLabel}
                </span>
              )}
            </div>
          )}

          {/* Detail */}
          {teaser?.detail && (
            <p className="text-xs text-muted-foreground">{teaser.detail}</p>
          )}

          {/* CTA button with pulsing glow */}
          <button
            onClick={() => setShowUpgrade(true)}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={ctaGlowStyle}
          >
            Odblokuj &rarr;
          </button>
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={feature}
      />
    </div>
  );
}
