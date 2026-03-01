/**
 * Typed GA4 event tracking for PodTeksT.
 * Safe to call on both client and server — silently no-ops if GA4 is not loaded.
 */

type PodTeksTEvent =
  | { name: 'upload_start'; params: { platform: string; fileCount: number } }
  | { name: 'upload_complete'; params: { platform: string; messageCount: number; durationDays: number } }
  | { name: 'analysis_start'; params: { mode: 'standard' | 'roast' | 'standup' | 'mega_roast' | 'cwel_tygodnia' } }
  | { name: 'analysis_complete'; params: { mode: 'standard' | 'roast' | 'standup' | 'mega_roast' | 'cwel_tygodnia'; passCount?: number } }
  | { name: 'share_card_download'; params: { cardType: string } }
  | { name: 'share_card_share'; params: { cardType: string; method: 'native' | 'clipboard' } }
  | { name: 'wrapped_start'; params: { slideCount: number } }
  | { name: 'wrapped_complete'; params: { slideCount: number } }
  | { name: 'pdf_download'; params: { type: 'standard' | 'standup' | 'eks' } }
  | { name: 'story_view'; params: { scene: string } }
  | { name: 'cps_start'; params: { participant: string } }
  | { name: 'cps_complete'; params: { participant: string } }
  | { name: 'share_link_created'; params: { cardType?: string } }
  | { name: 'share_link_opened'; params: { source?: string } }
  | { name: 'referral_conversion'; params: { referredBy?: string } }
  | { name: 'court_trial_start'; params?: undefined }
  | { name: 'court_trial_complete'; params?: undefined }
  | { name: 'eks_analysis_start'; params?: undefined }
  | { name: 'eks_analysis_complete'; params?: undefined }
  | { name: 'eks_share_card_download'; params: { cardType: string } }
  | { name: 'eks_share_link_created'; params: { method: 'native' | 'clipboard' } };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: PodTeksTEvent): void {
  if (typeof window === 'undefined') return;
  if (!window.gtag) return;

  try {
    window.gtag('event', event.name, 'params' in event ? event.params : undefined);
  } catch {
    // Silently fail — analytics should never break the app
  }
}


/* ------------------------------------------------------------------ */
/*  Referral & UTM tracking                                            */
/* ------------------------------------------------------------------ */

const REFERRAL_KEY = 'podtekst-referred-by';

/**
 * Capture UTM / referral params from the URL on page load.
 * Stores the `ref` query parameter in localStorage for later attribution.
 * Should be called once on app mount.
 */
export function captureReferralParam(): void {
  if (typeof window === 'undefined') return;

  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && ref.trim().length > 0) {
      localStorage.setItem(REFERRAL_KEY, ref.trim());
      trackEvent({ name: 'share_link_opened', params: { source: ref.trim() } });
    }
  } catch {
    // Silently fail -- localStorage or URL parsing issues
  }
}

/**
 * Get the stored referral source (if any).
 */
export function getReferralSource(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(REFERRAL_KEY);
  } catch {
    return null;
  }
}

/**
 * Track a referral conversion (e.g. when a referred user completes their first analysis).
 */
export function trackReferralConversion(): void {
  const referredBy = getReferralSource();
  if (referredBy) {
    trackEvent({ name: 'referral_conversion', params: { referredBy } });
  }
}
