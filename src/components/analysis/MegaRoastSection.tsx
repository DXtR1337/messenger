'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useCallback } from 'react';
import { Flame, Award, MessageCircle, Skull, Share2, Check, Loader2 } from 'lucide-react';
import { compressToEncodedURIComponent } from 'lz-string';
import type { MegaRoastResult } from '@/lib/analysis/types';
import { AIBadge } from '@/components/shared/SourceBadge';

interface MegaRoastSectionProps {
  result: MegaRoastResult;
  discordChannelId?: string;
}

export default function MegaRoastSection({ result, discordChannelId }: MegaRoastSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [linkCopied, setLinkCopied] = useState(false);
  const [discordSending, setDiscordSending] = useState(false);
  const [discordSent, setDiscordSent] = useState(false);
  const [discordError, setDiscordError] = useState<string | null>(null);

  const shareRoast = useCallback(() => {
    const data = {
      targetName: result.targetName,
      opening: result.opening,
      roast_lines: result.roast_lines,
      verdict: result.verdict,
      superlatives: result.superlatives,
      tldr: result.tldr,
    };
    const compressed = compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}/roast#${compressed}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [result]);

  const sendToDiscord = useCallback(async () => {
    if (!discordChannelId) return;
    setDiscordSending(true);
    setDiscordError(null);
    try {
      const res = await fetch('/api/discord/send-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: discordChannelId, megaRoast: result, pin: localStorage.getItem('podtekst-discord-pin') ?? '' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setDiscordSent(true);
      setTimeout(() => setDiscordSent(false), 3000);
    } catch (err) {
      setDiscordError(err instanceof Error ? err.message : 'Nieznany blad');
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
            'linear-gradient(var(--bg-card, #111111), var(--bg-card, #111111)), linear-gradient(135deg, #f97316, #ef4444, #f97316)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          borderWidth: '2px',
          borderStyle: 'solid',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/15">
            <Flame className="size-5 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                Mega Roast — {result.targetName}
              </h2>
              <AIBadge />
            </div>
            <p className="text-xs text-muted-foreground">
              Ultra brutalny roast na podstawie całej konwersacji
            </p>
          </div>
        </div>

        <div className="space-y-6 p-6" aria-live="polite">
          {/* Opening */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="relative overflow-hidden rounded-lg bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 px-6 py-5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5" />
            <p className="relative text-center text-lg font-bold italic text-foreground">
              &ldquo;{result.opening}&rdquo;
            </p>
          </motion.div>

          {/* Roast Lines */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="space-y-3"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Flame className="size-4 text-red-500" />
              Roast
            </h3>
            <ul className="space-y-2">
              {result.roast_lines.map((line, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                  transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-[10px] font-bold text-orange-400">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* What Others Say */}
          {result.what_others_say.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageCircle className="size-4 text-purple-500" />
                Co mówią inni
              </h3>
              <div className="space-y-2">
                {result.what_others_say.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
                    className="rounded-lg border-l-2 border-purple-500 bg-secondary/50 py-2 pl-4 pr-3 text-sm text-muted-foreground"
                  >
                    {line}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Self Owns */}
          {result.self_owns.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Skull className="size-4 text-red-400" />
                Samobójcze gole
              </h3>
              <ul className="space-y-2">
                {result.self_owns.map((line, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="shrink-0">💀</span>
                    <span>{line}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Superlatives */}
          {result.superlatives.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              className="space-y-3"
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Award className="size-4 text-orange-500" />
                Nagrody specjalne
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.superlatives.map((sup, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                    className="rounded-lg border border-border bg-secondary/50 p-4"
                  >
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-500">
                      {sup.title}
                    </div>
                    <p className="text-xs text-muted-foreground">{sup.roast}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.65 }}
            className="space-y-3 border-t border-border pt-4"
          >
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 px-6 py-5">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5" />
              <p className="relative text-center text-lg font-bold italic text-foreground">
                &ldquo;{result.verdict}&rdquo;
              </p>
            </div>
            {result.tldr && (
              <p className="text-center text-xs text-muted-foreground/70">
                TLDR: {result.tldr}
              </p>
            )}
          </motion.div>

          {/* Disclaimer */}
          <p className="text-center text-[11px] italic text-muted-foreground/50">
            Tryb rozrywkowy — nie stanowi analizy psychologicznej ani profesjonalnej oceny
          </p>

          {/* Share buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4">
            <button
              onClick={shareRoast}
              className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-2.5 text-sm font-medium text-orange-400 transition-colors hover:bg-orange-500/20"
            >
              {linkCopied ? (
                <>
                  <Check className="size-4" />
                  Link skopiowany!
                </>
              ) : (
                <>
                  <Share2 className="size-4" />
                  Udostępnij mega roast
                </>
              )}
            </button>

            {discordChannelId && (
              <button
                onClick={sendToDiscord}
                disabled={discordSending}
                className="flex items-center gap-2 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 px-4 py-2.5 text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/20 disabled:opacity-50"
              >
                {discordSending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Wysylanie...
                  </>
                ) : discordSent ? (
                  <>
                    <Check className="size-4" />
                    Wyslano na Discord!
                  </>
                ) : (
                  <>
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                    </svg>
                    Wyslij na Discord
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
