'use client';

import { useState, useCallback } from 'react';
import { Share2, Check, Link2 } from 'lucide-react';
import { buildEksShareUrl } from '@/lib/share/encode';
import { trackEvent } from '@/lib/analytics/events';
import type { EksResult } from '@/lib/analysis/eks-prompts';

interface EksShareButtonProps {
  result: EksResult;
  participants: string[];
}

/**
 * Generates an anonymized EKS share link and copies it to clipboard
 * (or uses Web Share API on supported devices).
 * Styled in the EKS crimson palette to match the autopsy theme.
 */
export default function EksShareButton({ result, participants }: EksShareButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = buildEksShareUrl(result, participants);

      // Try native Web Share API first
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function'
      ) {
        const shareData = {
          title: 'PodTeksT — Akt Zgonu Związku',
          text: result.epitaph
            ? `"${result.epitaph}" — sprawdź sekcję zwłok mojego związku`
            : 'Sprawdź sekcję zwłok mojego związku na PodTeksT',
          url: shareUrl,
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          trackEvent({ name: 'eks_share_link_created', params: { method: 'native' } });
          return;
        }
      }

      // Fallback: copy to clipboard
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Legacy fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setStatus('copied');
      trackEvent({ name: 'eks_share_link_created', params: { method: 'clipboard' } });
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  }, [result, participants]);

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-mono text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background:
          status === 'copied'
            ? 'rgba(16,185,129,0.15)'
            : status === 'error'
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(153,27,27,0.15)',
        border: `1px solid ${
          status === 'copied'
            ? '#10b98130'
            : status === 'error'
              ? '#ef444430'
              : '#991b1b30'
        }`,
        color:
          status === 'copied'
            ? '#10b981'
            : status === 'error'
              ? '#ef4444'
              : '#991b1b',
      }}
    >
      {status === 'copied' ? (
        <>
          <Check className="size-3.5" />
          Skopiowano link!
        </>
      ) : status === 'error' ? (
        <>
          <Link2 className="size-3.5" />
          Nie udało się skopiować
        </>
      ) : (
        <>
          <Share2 className="size-3.5" />
          Udostępnij Akt Zgonu
        </>
      )}
    </button>
  );
}
