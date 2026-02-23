'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  type Tier,
  type FeatureKey,
  TIER_LIMITS,
  canAccessFeature,
} from './features';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

interface TierState {
  tier: Tier;
  analysesUsed: number;
  shareCardsUsed: number;
  /** YYYY-MM format for monthly reset detection */
  monthKey: string;
}

interface TierContextValue {
  tier: Tier;
  /** Check if a feature is accessible (tier + usage limits) */
  canUse: (feature: FeatureKey) => boolean;
  remainingAnalyses: number;
  remainingShareCards: number;
  incrementAnalyses: () => void;
  incrementShareCards: () => void;
  /** Manually set tier (for testing / future Stripe webhook) */
  setTier: (tier: Tier) => void;
}

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const STORAGE_KEY = 'podtekst-tier-state';

function currentMonthKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

function defaultState(): TierState {
  return {
    tier: 'free',
    analysesUsed: 0,
    shareCardsUsed: 0,
    monthKey: currentMonthKey(),
  };
}

function loadState(): TierState {
  if (typeof window === 'undefined') return defaultState();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw) as TierState;

    // Monthly reset: if stored month differs from current, reset counters
    const current = currentMonthKey();
    if (parsed.monthKey !== current) {
      return {
        tier: parsed.tier,
        analysesUsed: 0,
        shareCardsUsed: 0,
        monthKey: current,
      };
    }

    return parsed;
  } catch {
    return defaultState();
  }
}

function persistState(state: TierState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

// -------------------------------------------------------------------
// Context
// -------------------------------------------------------------------

const TierContext = createContext<TierContextValue | null>(null);

export function TierProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TierState>(defaultState);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setState(loadState());
  }, []);

  // Persist every state change
  useEffect(() => {
    persistState(state);
  }, [state]);

  const canUse = useCallback(
    (_feature: FeatureKey): boolean => {
      // TODO: Restore tier gating + usage limits when Stripe payments are implemented
      return true;
    },
    [],
  );

  const remainingAnalyses = Math.max(
    0,
    TIER_LIMITS[state.tier].analysesPerMonth - state.analysesUsed,
  );

  const remainingShareCards = Math.max(
    0,
    TIER_LIMITS[state.tier].shareCardsPerMonth - state.shareCardsUsed,
  );

  const incrementAnalyses = useCallback(() => {
    setState((prev) => ({ ...prev, analysesUsed: prev.analysesUsed + 1 }));
  }, []);

  const incrementShareCards = useCallback(() => {
    setState((prev) => ({ ...prev, shareCardsUsed: prev.shareCardsUsed + 1 }));
  }, []);

  const setTier = useCallback((newTier: Tier) => {
    setState((prev) => ({ ...prev, tier: newTier }));
  }, []);

  return (
    <TierContext.Provider
      value={{
        tier: state.tier,
        canUse,
        remainingAnalyses,
        remainingShareCards,
        incrementAnalyses,
        incrementShareCards,
        setTier,
      }}
    >
      {children}
    </TierContext.Provider>
  );
}

export function useTier(): TierContextValue {
  const ctx = useContext(TierContext);
  if (!ctx) {
    throw new Error('useTier() must be used within a <TierProvider>');
  }
  return ctx;
}
