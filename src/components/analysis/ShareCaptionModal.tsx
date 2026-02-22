"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Copy, Check, Share2, Link2 } from "lucide-react";
import { buildShareUrl } from "@/lib/share/encode";
import type { StoredAnalysis } from "@/lib/analysis/types";

interface ShareCaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: string[];
  healthScore?: number;
  compatibilityScore?: number;
  delusionScore?: number;
  analysis?: StoredAnalysis;
}

const CAPTION_TEMPLATES = [
  {
    id: "roast",
    emoji: "\ud83d\udd25",
    label: "Roast",
    template: (p: string[], scores: Scores) =>
      "\ud83d\udd25 Just got our chat roasted by AI and I'm deceased\n\nDelusion score: " + (scores.delusion ?? 0) + "/100 \ud83d\udc80\n\n#podtekst #roasted",
  },
  {
    id: "compatibility",
    emoji: "\ud83d\udc95",
    label: "Match",
    template: (p: string[], scores: Scores) =>
      "Our compatibility score is " + (scores.compatibility ?? 0) + "% " + ((scores.compatibility ?? 0) > 70 ? "\ud83d\udc95" : "\ud83d\udc80") + "\n\nDon't ask about the rest...\n\n#podtekst #compatibility",
  },
  {
    id: "receipts",
    emoji: "\ud83e\uddfe",
    label: "Paragon",
    template: (_p: string[], _scores: Scores) =>
      "\ud83e\uddfe The receipts are in.\n\nAI przeanalizowa\u0142o nasz\u0105 rozmow\u0119 i... wow.\n\n#podtekst #thereceipts",
  },
  {
    id: "redflag",
    emoji: "\ud83d\udea9",
    label: "Red Flag",
    template: (_p: string[], scores: Scores) =>
      "\ud83d\udea9 RED FLAG REPORT \ud83d\udea9\n\nKlasyfikacja: " + ((scores.delusion ?? 0) > 60 ? "CRITICAL" : "MODERATE") + "\n\nI already knew, but now I have proof.\n\n#podtekst #redflag",
  },
  {
    id: "ghost",
    emoji: "\ud83d\udc7b",
    label: "Ghost",
    template: (_p: string[], scores: Scores) =>
      "\ud83d\udc7b Ghost Forecast: " + (scores.health && scores.health < 40 ? "\ud83c\udf2a\ufe0f EWAKUACJA" : "\u26c5 zachmurzenie") + "\n\nAI wie wi\u0119cej ni\u017c my sami\n\n#podtekst #ghosted",
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
  analysis,
}: ShareCaptionModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    },
    [],
  );

  const copyShareLink = useCallback(() => {
    if (!analysis) return;
    try {
      const shareUrl = buildShareUrl(analysis);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
        });
      }
    } catch (err) {
      void err;
    }
  }, [analysis]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-blue-400" />
            <h3 className="text-sm font-bold text-foreground">Udost\u0119pnij z captionem</h3>
          </div>
          <button
            onClick={onClose}
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Share link button */}
        {analysis && (
          <div className="border-b border-border px-5 py-3">
            <button
              onClick={copyShareLink}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-400 transition-colors hover:bg-blue-500/20"
            >
              {linkCopied ? (
                <><Check className="size-4" /> Skopiowano link!</>
              ) : (
                <><Link2 className="size-4" /> Kopiuj link do raportu</>
              )}
            </button>
          </div>
        )}

        {/* Captions */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto p-5">
          <p className="mb-3 text-xs text-muted-foreground">
            Pobierz kart\u0119, a potem skopiuj gotowy caption do posta:
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
                      <><Check className="size-3 text-green-400" /> Skopiowano!</>
                    ) : (
                      <><Copy className="size-3" /> Kopiuj</>
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
