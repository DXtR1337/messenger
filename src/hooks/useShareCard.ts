'use client';

import { useState, useCallback } from 'react';
import { trackEvent } from '@/lib/analytics/events';

interface UseShareCardOptions {
  cardType: string;
  title?: string;
  text?: string;
}

interface UseShareCardReturn {
  share: (blob: Blob) => Promise<void>;
  canShare: boolean;
  isSharing: boolean;
}

export function useShareCard({ cardType, title, text }: UseShareCardOptions): UseShareCardReturn {
  const [isSharing, setIsSharing] = useState(false);

  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';

  const share = useCallback(
    async (blob: Blob) => {
      const file = new File([blob], `podtekst-${cardType}.png`, { type: 'image/png' });

      if (canShare && navigator.canShare({ files: [file] })) {
        setIsSharing(true);
        try {
          await navigator.share({
            files: [file],
            title: title ?? 'PodTeksT',
            text: text ?? 'Sprawdź moją analizę rozmowy na podtekst.app',
          });
          trackEvent({ name: 'share_card_share', params: { cardType, method: 'native' } });
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') {
            console.error('[Share Error]', err);
          }
        } finally {
          setIsSharing(false);
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `podtekst-${cardType}.png`;
        a.click();
        URL.revokeObjectURL(url);
        trackEvent({ name: 'share_card_download', params: { cardType } });
      }
    },
    [canShare, cardType, title, text],
  );

  return { share, canShare, isSharing };
}
