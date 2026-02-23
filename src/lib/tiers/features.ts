export type Tier = 'free' | 'pro' | 'unlimited';

export interface TierLimits {
  analysesPerMonth: number;
  shareCardsPerMonth: number;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { analysesPerMonth: 3, shareCardsPerMonth: 3 },
  pro: { analysesPerMonth: 10, shareCardsPerMonth: Infinity },
  unlimited: { analysesPerMonth: Infinity, shareCardsPerMonth: Infinity },
};

// Feature access map — 'free' means available to all, 'pro' means Pro+, 'unlimited' means Unlimited only
export type FeatureKey =
  | 'quantitative_analysis'
  | 'ai_pass_1'
  | 'ai_passes_2_4'
  | 'enhanced_roast'
  | 'standup_comedy'
  | 'court_trial'
  | 'dating_profile'
  | 'reply_simulator'
  | 'subtext_decoder'
  | 'cps_screener'
  | 'delusion_quiz'
  | 'share_cards'
  | 'pdf_export'
  | 'story_wrapped'
  | 'discord_import';

export const FEATURE_ACCESS: Record<FeatureKey, Tier> = {
  quantitative_analysis: 'free',
  ai_pass_1: 'free',
  ai_passes_2_4: 'pro',
  enhanced_roast: 'pro',
  standup_comedy: 'pro',
  court_trial: 'pro',
  dating_profile: 'pro',
  reply_simulator: 'pro',
  subtext_decoder: 'pro',
  cps_screener: 'pro',
  delusion_quiz: 'free',
  share_cards: 'free', // limited count for free
  pdf_export: 'pro',
  story_wrapped: 'pro',
  discord_import: 'pro',
};

// Human-readable Polish feature names for upgrade modals
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  quantitative_analysis: 'Analiza ilościowa',
  ai_pass_1: 'AI Przegląd',
  ai_passes_2_4: 'Pełna analiza AI (Passy 2-4)',
  enhanced_roast: 'Enhanced Roast',
  standup_comedy: 'Stand-Up Comedy Roast',
  court_trial: 'Twój Chat w Sądzie',
  dating_profile: 'Szczery Profil Randkowy',
  reply_simulator: 'Symulator Odpowiedzi',
  subtext_decoder: 'Translator Podtekstów',
  cps_screener: 'Wzorce Komunikacyjne (CPS)',
  delusion_quiz: 'Quiz Deluzji',
  share_cards: 'Karty do udostępnienia',
  pdf_export: 'Eksport PDF',
  story_wrapped: 'Story / Wrapped Mode',
  discord_import: 'Import z Discorda',
};

export function canAccessFeature(_tier: Tier, _feature: FeatureKey): boolean {
  // TODO: Restore tier gating when Stripe payments are implemented
  // const requiredTier = FEATURE_ACCESS[feature];
  // if (requiredTier === 'free') return true;
  // if (requiredTier === 'pro') return tier === 'pro' || tier === 'unlimited';
  // return tier === 'unlimited';
  return true;
}
