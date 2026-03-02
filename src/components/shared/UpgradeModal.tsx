'use client';

import { useEffect } from 'react';
import {
  X,
  Sparkles,
  Brain,
  Scale,
  HeartCrack,
  Wand2,
  Theater,
  FileText,
} from 'lucide-react';
import {
  type FeatureKey,
  FEATURE_LABELS,
  FEATURE_ACCESS,
} from '@/lib/tiers/features';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional feature key for feature-specific messaging */
  feature?: FeatureKey;
  title?: string;
  description?: string;
  /** Title of the analysis being viewed (for personalized hero copy) */
  analysisTitle?: string;
  /** Discovery stats shown in the hero section */
  stats?: {
    patterns?: number;
    flags?: number;
    subtexts?: number;
  };
}

const PRO_FEATURES = [
  {
    icon: Brain,
    title: 'Profile osobowości',
    subtitle: 'Big Five, MBTI, styl przywiązania',
  },
  {
    icon: Scale,
    title: 'Sąd nad chatem',
    subtitle: 'Proces, wyrok, mugshot',
  },
  {
    icon: HeartCrack,
    title: 'Damage Report',
    subtitle: 'Skala zniszczeń emocjonalnych',
  },
  {
    icon: Wand2,
    title: 'Predykcje AI',
    subtitle: 'Co będzie dalej w relacji',
  },
  {
    icon: Theater,
    title: 'Stand-Up Roast',
    subtitle: '7-aktowy roast Twojego chatu',
  },
  {
    icon: FileText,
    title: 'Eksport PDF',
    subtitle: 'Pełny raport do pobrania',
  },
] as const;

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  title,
  description,
  analysisTitle,
  stats,
}: UpgradeModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const featureLabel = feature ? FEATURE_LABELS[feature] : undefined;
  const requiredTier = feature ? FEATURE_ACCESS[feature] : undefined;

  // Hero heading — personalized when possible
  const heroHeading = title
    ? title
    : analysisTitle
      ? `Analiza "${analysisTitle}" czeka na Ciebie`
      : featureLabel
        ? `Odblokuj: ${featureLabel}`
        : 'Odblokuj pełny potencjał analizy rozmów';

  // Hero description — stats-driven or feature-specific
  const heroDescription = description
    ? description
    : stats && (stats.patterns || stats.flags || stats.subtexts)
      ? `Odkryliśmy ${stats.patterns ?? 0} wzorców, ${stats.flags ?? 0} flag i ${stats.subtexts ?? 0} ukrytych podtekstów.`
      : requiredTier === 'pro'
        ? 'Ta funkcja jest dostępna w planie Pro i Unlimited.'
        : requiredTier === 'unlimited'
          ? 'Ta funkcja jest dostępna wyłącznie w planie Unlimited.'
          : 'Wszystko, czego potrzebujesz, żeby zrozumieć swoją rozmowę.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      style={{ animation: 'upgradeOverlayIn 200ms ease-out both' }}
    >
      {/* Keyframe styles injected once */}
      <style>{`
        @keyframes upgradeOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes upgradeCardIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes upgradePulse {
          0%, 100% { box-shadow: 0 0 20px 0 rgba(168,85,247,0.3); }
          50%      { box-shadow: 0 0 32px 4px rgba(168,85,247,0.5); }
        }
      `}</style>

      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-[#111111] shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ animation: 'upgradeCardIn 300ms ease-out both 50ms' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Zamknij"
          className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        {/* ──────────────────────────────────────────── Hero section */}
        <div className="relative overflow-hidden px-6 pb-5 pt-7">
          {/* Purple glow background */}
          <div
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2"
            style={{
              width: 320,
              height: 200,
              background:
                'radial-gradient(ellipse at center, rgba(168,85,247,0.15) 0%, transparent 70%)',
            }}
          />

          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-5 text-purple-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                Pro
              </span>
            </div>

            <h3
              id="upgrade-modal-title"
              className="mb-2 text-lg font-bold leading-snug"
              style={{
                background: 'linear-gradient(135deg, #e2e8f0 0%, #a855f7 50%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {heroHeading}
            </h3>

            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {heroDescription}
            </p>
          </div>
        </div>

        {/* ──────────────────────────────────────────── Feature grid */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-5">
          {PRO_FEATURES.map(({ icon: Icon, title: fTitle, subtitle }) => (
            <div
              key={fTitle}
              className="flex gap-2.5 rounded-lg border border-border/50 bg-white/[0.02] p-3 transition-colors hover:border-purple-500/30 hover:bg-purple-500/[0.03]"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-purple-400" />
              <div className="min-w-0">
                <p className="text-[12px] font-semibold leading-tight text-foreground">
                  {fTitle}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ──────────────────────────────────────────── Pricing section */}
        <div className="border-t border-border bg-white/[0.01] px-6 py-5">
          <div className="text-center">
            {/* Price */}
            <div className="mb-1 flex items-baseline justify-center gap-1.5">
              <span className="text-sm font-medium text-muted-foreground">
                Pro —
              </span>
              <span className="text-2xl font-bold text-foreground">
                19 zł
              </span>
              <span className="text-sm text-muted-foreground">/msc</span>
            </div>

            <p className="mb-4 text-[12px] text-muted-foreground">
              Pełny dostęp do wszystkich funkcji analizy
            </p>

            {/* CTA button */}
            <a
              href="/pricing"
              className="relative mx-auto block w-full max-w-xs rounded-lg px-6 py-3 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
                animation: 'upgradePulse 2.5s ease-in-out infinite',
              }}
            >
              Odblokuj pełny raport &rarr;
            </a>

            {/* Alternative pricing */}
            <p className="mt-3 text-[11px] text-muted-foreground/50">
              lub 29 zł/msc bez zobowiązań
            </p>
          </div>
        </div>

        {/* ──────────────────────────────────────────── Footer */}
        <div className="flex items-center justify-center border-t border-border px-6 py-3">
          <button
            onClick={onClose}
            className="group flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>Może później</span>
          </button>
        </div>
      </div>
    </div>
  );
}
