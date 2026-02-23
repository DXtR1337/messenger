'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useTier } from '@/lib/tiers/tier-context';

const DISMISS_KEY = 'podtekst-nudge-dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24h

export function FloatingUpgradeNudge() {
  // TODO: Re-enable when Stripe payments are implemented
  return null;

  const { tier } = useTier();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (tier !== 'free') return;

    // Check if dismissed within 24h
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION) {
        return;
      }
    } catch {}

    setDismissed(false);

    // Show after 30s delay
    const timer = setTimeout(() => setVisible(true), 30000);
    return () => clearTimeout(timer);
  }, [tier]);

  if (tier !== 'free' || dismissed || !visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md"
      style={{
        animation: 'nudgeSlideUp 0.4s ease-out',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <style>{`
        @keyframes nudgeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="flex items-center gap-2 rounded-xl border border-purple-500/20 bg-[#111111]/95 px-3 py-2.5 shadow-lg shadow-purple-500/10 backdrop-blur-md sm:gap-3 sm:px-4">
        <Sparkles className="size-4 shrink-0 text-purple-400" />
        <span className="text-xs text-foreground/90">
          Twoja analiza jest w <span className="font-semibold text-purple-400">33%</span> gotowa.
        </span>
        <button
          onClick={() => {
            // Open upgrade - dispatch custom event that UpgradeModal listens to
            // For simplicity, navigate to pricing
            window.location.href = '/pricing';
          }}
          className="shrink-0 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Odblokuj →
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
