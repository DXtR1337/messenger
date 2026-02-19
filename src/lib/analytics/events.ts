/**
 * Typed GA4 event tracking for PodTeksT.
 * Safe to call on both client and server — silently no-ops if GA4 is not loaded.
 */

type PodTeksTEvent =
  | { name: 'upload_start'; params: { platform: string; fileCount: number } }
  | { name: 'upload_complete'; params: { platform: string; messageCount: number; durationDays: number } }
  | { name: 'analysis_start'; params: { mode: 'standard' | 'roast' | 'standup' } }
  | { name: 'analysis_complete'; params: { mode: 'standard' | 'roast' | 'standup'; passCount: number } }
  | { name: 'share_card_download'; params: { cardType: string } }
  | { name: 'share_card_share'; params: { cardType: string; method: 'native' | 'clipboard' } }
  | { name: 'wrapped_start'; params: { slideCount: number } }
  | { name: 'wrapped_complete'; params: { slideCount: number } }
  | { name: 'pdf_download'; params: { type: 'standard' | 'standup' } }
  | { name: 'story_view'; params: { scene: string } }
  | { name: 'cps_start'; params: { participant: string } }
  | { name: 'cps_complete'; params: { participant: string } };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(event: PodTeksTEvent): void {
  if (typeof window === 'undefined') return;
  if (!window.gtag) return;

  try {
    window.gtag('event', event.name, event.params);
  } catch {
    // Silently fail — analytics should never break the app
  }
}
