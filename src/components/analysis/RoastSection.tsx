'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useCallback, useState } from 'react';
import { Flame, Award, Share2, Check } from 'lucide-react';
import { compressToEncodedURIComponent } from 'lz-string';
import type { RoastResult } from '@/lib/analysis/types';
import RoastImageCard from './RoastImageCard';

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];

interface RoastSectionProps {
  roast: RoastResult;
  participants: string[];
  messages?: Array<{ sender: string; content: string; timestamp: number }>;
}

export default function RoastSection({ roast, participants, messages }: RoastSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [linkCopied, setLinkCopied] = useState(false);

  const shareRoast = useCallback(() => {
    const data = {
      verdict: roast.verdict,
      roasts: roast.roasts_per_person,
      superlatives: roast.superlatives.map((s) => ({
        category: s.title,
        winner: s.holder,
        evidence: s.roast,
      })),
      relationship_roast: roast.relationship_roast,
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
  }, [roast]);

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
            'linear-gradient(var(--bg-card, #111111), var(--bg-card, #111111)), linear-gradient(135deg, #ef4444, #f97316, #ef4444)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          borderWidth: '2px',
          borderStyle: 'solid',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/15">
            <Flame className="size-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Tryb Roast</h2>
            <p className="text-xs text-muted-foreground">Brutalna, ale zabawna analiza</p>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {/* Verdict */}
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 px-6 py-5">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5" />
            <p className="relative text-center text-lg font-bold italic text-foreground">
              &ldquo;{roast.verdict}&rdquo;
            </p>
          </div>

          {/* Per-person roasts */}
          <div className="grid gap-6 md:grid-cols-2">
            {participants.map((name, personIndex) => {
              const personRoasts = roast.roasts_per_person[name];
              if (!personRoasts || personRoasts.length === 0) return null;
              const color = PERSON_COLORS[personIndex % PERSON_COLORS.length];

              return (
                <div key={name} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                  </div>
                  <ul className="space-y-2">
                    {personRoasts.map((line, lineIndex) => (
                      <motion.li
                        key={lineIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                        transition={{ duration: 0.3, delay: 0.1 + lineIndex * 0.08 }}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Flame className="mt-0.5 size-3.5 shrink-0 text-red-500/70" />
                        <span>{line}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Superlatives */}
          {roast.superlatives.length > 0 && (
            <div className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Award className="size-4 text-orange-500" />
                Nagrody specjalne
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roast.superlatives.map((superlative, supIndex) => {
                  const holderIndex = participants.indexOf(superlative.holder);
                  const color = holderIndex >= 0
                    ? PERSON_COLORS[holderIndex % PERSON_COLORS.length]
                    : PERSON_COLORS[0];

                  return (
                    <motion.div
                      key={supIndex}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: 0.3 + supIndex * 0.1 }}
                      className="rounded-lg border border-border bg-secondary/50 p-4"
                    >
                      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-orange-500">
                        {superlative.title}
                      </div>
                      <div className="mb-2 text-xs text-muted-foreground">
                        <span
                          className="font-semibold"
                          style={{ color }}
                        >
                          {superlative.holder}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{superlative.roast}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Relationship roast */}
          <div className="space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Roast relacji</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {roast.relationship_roast}
            </p>
          </div>

          {/* Entertainment disclaimer */}
          <p className="text-center text-[11px] italic text-muted-foreground/50">
            Tryb rozrywkowy — nie stanowi analizy psychologicznej ani profesjonalnej oceny
          </p>

          {/* Anonymous share button */}
          <div className="flex justify-center border-t border-border pt-4">
            <button
              onClick={shareRoast}
              className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              {linkCopied ? (
                <>
                  <Check className="size-4" />
                  Link skopiowany!
                </>
              ) : (
                <>
                  <Share2 className="size-4" />
                  Udostępnij anonimowy roast
                </>
              )}
            </button>
          </div>

          {/* Roast Comic */}
          <RoastImageCard
            roast={roast}
            participants={participants}
            messages={messages}
          />
        </div>
      </div>
    </motion.div>
  );
}
