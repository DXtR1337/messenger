'use client';

import { useState, useCallback } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';

interface ShareCaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: string[];
  healthScore?: number;
  compatibilityScore?: number;
  delusionScore?: number;
}

const CAPTION_TEMPLATES = [
  {
    id: 'roast',
    emoji: '🔥',
    label: 'Roast',
    template: (p: string[], scores: Scores) =>
      `🔥 Just got our chat roasted by AI and I'm deceased\n\nDelusion score: ${scores.delusion ?? 0}/100 💀\n\n#podtekst #roasted`,
  },
  {
    id: 'compatibility',
    emoji: '💕',
    label: 'Match',
    template: (p: string[], scores: Scores) =>
      `Our compatibility score is ${scores.compatibility ?? 0}% ${(scores.compatibility ?? 0) > 70 ? '💕' : '💀'}\n\nDon't ask about the rest...\n\n#podtekst #compatibility`,
  },
  {
    id: 'receipts',
    emoji: '🧾',
    label: 'Paragon',
    template: (p: string[], scores: Scores) =>
      `🧾 The receipts are in.\n\nAI przeanalizowało naszą rozmowę i... wow.\n\n#podtekst #thereceipts`,
  },
  {
    id: 'redflag',
    emoji: '🚩',
    label: 'Red Flag',
    template: (p: string[], scores: Scores) =>
      `🚩 RED FLAG REPORT 🚩\n\nKlasyfikacja: ${(scores.delusion ?? 0) > 60 ? 'CRITICAL' : 'MODERATE'}\n\nI already knew, but now I have proof.\n\n#podtekst #redflag`,
  },
  {
    id: 'ghost',
    emoji: '👻',
    label: 'Ghost',
    template: (p: string[], scores: Scores) =>
      `👻 Ghost Forecast: ${scores.health && scores.health < 40 ? '🌪️ EWAKUACJA' : '⛅ zachmurzenie'}\n\nAI wie więcej niż my sami\n\n#podtekst #ghosted`,
  },
];

interface Scores {
  health?: number;
  compatibility?: number;
  delusion?: number;
}

export default function ShareCaptionModal({
  isOpen,
  onClose,
  participants,
  healthScore,
  compatibilityScore,
  delusionScore,
}: ShareCaptionModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scores: Scores = {
    health: healthScore,
    compatibility: compatibilityScore ?? 0,
    delusion: delusionScore ?? 0,
  };

  const copyCaption = useCallback(
    (id: string, text: string) => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        });
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    },
    [],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground">Udostępnij z captionem</h3>
          </div>
          <button
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Captions */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Pobierz kartę, a potem skopiuj gotowy caption do posta:
          </p>

          {CAPTION_TEMPLATES.map((tpl) => {
            const caption = tpl.template(participants, scores);
            const isCopied = copiedId === tpl.id;

            return (
              <div
                key={tpl.id}
                className="group rounded-lg border border-border bg-secondary/50 p-4 transition-colors hover:border-border-hover"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <span>{tpl.emoji}</span>
                    {tpl.label}
                  </span>
                  <button
                    onClick={() => copyCaption(tpl.id, caption)}
                    className="flex items-center gap-1 rounded-md bg-card px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3 text-green-400" />
                        Skopiowano!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        Kopiuj
                      </>
                    )}
                  </button>
                </div>
                <p className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {caption}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
