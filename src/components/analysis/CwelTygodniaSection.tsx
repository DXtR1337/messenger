'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import { Skull, Award, MessageCircle, Trophy, Share2, Check, Loader2 } from 'lucide-react';
import type { CwelTygodniaResult } from '@/lib/analysis/types';

interface CwelTygodniaSectionProps {
  result: CwelTygodniaResult;
  discordChannelId?: string;
}

export default function CwelTygodniaSection({ result, discordChannelId }: CwelTygodniaSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [discordSending, setDiscordSending] = useState(false);
  const [discordSent, setDiscordSent] = useState(false);
  const [discordError, setDiscordError] = useState<string | null>(null);

  const sendToDiscord = useCallback(async () => {
    if (!discordChannelId) return;
    setDiscordSending(true);
    setDiscordError(null);
    try {
      const res = await fetch('/api/discord/send-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: discordChannelId, type: 'cwelTygodnia', cwelTygodnia: result }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setDiscordSent(true);
      setTimeout(() => setDiscordSent(false), 3000);
    } catch (err) {
      setDiscordError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setDiscordSending(false);
    }
  }, [discordChannelId, result]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <div
        className="overflow-hidden rounded-xl border bg-card"
        style={{
          borderColor: 'transparent',
          backgroundImage:
            'linear-gradient(var(--bg-card, #111111), var(--bg-card, #111111)), linear-gradient(135deg, #ef4444, #dc2626, #ef4444)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          borderWidth: '2px',
          borderStyle: 'solid',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/15">
            <Skull className="size-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Cwel Tygodnia — {result.winner}
            </h2>
            <p className="text-xs text-muted-foreground">
              Ceremonia wręczenia najgorszych nagród
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1">
            <span className="text-xs font-bold text-red-400">{result.winnerScore}/100</span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Intro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/10 via-red-900/10 to-red-500/10 px-6 py-5"
          >
            <p className="relative text-center text-sm italic text-muted-foreground leading-relaxed">
              {result.intro}
            </p>
          </motion.div>

          {/* Categories 2x4 grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="space-y-3"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Award className="size-4 text-red-500" />
              Nominacje
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.nominations.map((nom, i) => (
                <motion.div
                  key={nom.categoryId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                  className="rounded-lg border border-border bg-secondary/50 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">{nom.emoji}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                      {nom.categoryTitle}
                    </span>
                  </div>
                  <p className="mb-1.5 text-sm font-semibold text-foreground">{nom.winner}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{nom.reason}</p>
                  {nom.evidence.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {nom.evidence.map((ev, j) => (
                        <p key={j} className="border-l-2 border-red-500/30 pl-2 text-[11px] italic text-muted-foreground/70">
                          &ldquo;{ev}&rdquo;
                        </p>
                      ))}
                    </div>
                  )}
                  {nom.runnerUp && (
                    <p className="mt-2 text-[10px] text-muted-foreground/50">
                      Runner-up: {nom.runnerUp}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Hall of Shame */}
          {result.hallOfShame.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircle className="size-4 text-red-400" />
                Hall of Shame
              </h3>
              <div className="space-y-2">
                {result.hallOfShame.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                    className="rounded-lg border-l-2 border-red-500 bg-secondary/50 py-3 pl-4 pr-3"
                  >
                    <p className="text-xs font-semibold text-red-400">{item.person}</p>
                    <p className="mt-1 text-sm italic text-muted-foreground">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground/70">{item.commentary}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Winner Reveal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="relative overflow-hidden rounded-xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-900/5 to-red-500/10 px-6 py-8 text-center"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent" />
            <div className="relative">
              <Skull className="mx-auto mb-3 size-10 text-red-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-red-400">Cwel Tygodnia</p>
              <p className="mt-2 text-2xl font-black text-foreground">{result.winner}</p>
              <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span>Cwelowatość: <strong className="text-red-400">{result.winnerScore}/100</strong></span>
                <span>Wygrane kategorie: <strong className="text-red-400">{result.winnerCategories}/8</strong></span>
              </div>
            </div>
          </motion.div>

          {/* Crowning Speech */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/10 via-red-900/10 to-red-500/10 px-6 py-5"
          >
            <p className="relative text-center text-sm font-medium italic text-foreground leading-relaxed">
              {result.crowningSpeech}
            </p>
          </motion.div>

          {/* Verdict */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.85 }}
            className="text-center"
          >
            <p className="text-lg font-black text-red-400">
              &ldquo;{result.verdict}&rdquo;
            </p>
          </motion.div>

          {/* Full Ranking */}
          {result.ranking.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.9 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Trophy className="size-4 text-red-400" />
                Ranking Cwelowatości
              </h3>
              <div className="space-y-1.5">
                {result.ranking.map((entry, i) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-bold text-red-400">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{entry.oneLiner}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-red-400">{entry.score}/100</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Disclaimer */}
          <p className="text-center text-[11px] italic text-muted-foreground/50">
            Tryb rozrywkowy — nie stanowi analizy psychologicznej ani profesjonalnej oceny
          </p>

          {/* Share / Discord buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4">
            {discordChannelId && (
              <button
                onClick={sendToDiscord}
                disabled={discordSending}
                className="flex items-center gap-2 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-2.5 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/20 disabled:opacity-50"
              >
                {discordSending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : discordSent ? (
                  <>
                    <Check className="size-4" />
                    Wysłano na Discord!
                  </>
                ) : (
                  <>
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                    </svg>
                    Wyślij na Discord
                  </>
                )}
              </button>
            )}
            {discordError && (
              <p className="w-full text-center text-xs text-red-400">{discordError}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
