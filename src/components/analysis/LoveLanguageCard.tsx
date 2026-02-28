'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';
import type { PersonProfile, LoveLanguageResult } from '@/lib/analysis/types';

interface LoveLanguageCardProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
}

type LoveLanguageKey = keyof LoveLanguageResult['scores'];

const PERSON_COLORS = ['#c084fc', '#e879f9'] as const;
const PERSON_DOT_CLASSES = ['bg-chart-a', 'bg-chart-b'] as const;

const LOVE_LANGUAGE_META: Record<LoveLanguageKey, { emoji: string; label: string }> = {
  words_of_affirmation: { emoji: '\u{1F4AC}', label: 'Słowa uznania' },
  quality_time: { emoji: '\u{23F0}', label: 'Wspólny czas' },
  acts_of_service: { emoji: '\u{1F91D}', label: 'Akty służby' },
  gifts_pebbling: { emoji: '\u{1F381}', label: 'Prezenty' },
  physical_touch: { emoji: '\u{1F917}', label: 'Dotyk fizyczny' },
};

const ALL_LANGUAGES: LoveLanguageKey[] = [
  'words_of_affirmation',
  'quality_time',
  'acts_of_service',
  'gifts_pebbling',
  'physical_touch',
];

function ConfidenceBadge({ confidence, isInView, delay }: { confidence: number; isInView: boolean; delay: number }) {
  const color =
    confidence >= 60
      ? 'text-violet-400 bg-violet-500/10 border-violet-500/20'
      : confidence >= 40
        ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
        : 'text-muted-foreground/60 bg-purple-950/[0.15] border-purple-500/[0.08]';

  return (
    <motion.span
      className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border inline-flex', color)}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.3, delay, type: 'spring', stiffness: 300, damping: 20 }}
    >
      {confidence}% pewności
    </motion.span>
  );
}

function PersonLoveLanguage({
  name,
  loveLanguage,
  personIndex,
  delay,
}: {
  name: string;
  loveLanguage: LoveLanguageResult;
  personIndex: number;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  const dotClass = PERSON_DOT_CLASSES[personIndex % PERSON_DOT_CLASSES.length];
  const barColor = PERSON_COLORS[personIndex % PERSON_COLORS.length];
  const barGlow = personIndex === 0 ? 'rgba(192,132,252,0.25)' : 'rgba(232,121,249,0.25)';
  const primaryMeta = LOVE_LANGUAGE_META[loveLanguage.primary];

  return (
    <motion.div
      ref={ref}
      className="flex-1 min-w-0"
      initial={{ opacity: 0, y: 12 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Person name */}
      <div className="flex items-center gap-1.5 font-semibold text-sm mb-3">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
        <span>{name}</span>
      </div>

      {/* Primary love language highlight */}
      <motion.div
        className="flex items-center gap-2.5 mb-3 rounded-lg border border-purple-500/[0.08] bg-purple-950/[0.15] px-3 py-2"
        initial={{ opacity: 0, x: -8 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
        transition={{ duration: 0.4, delay: delay + 0.1 }}
      >
        <motion.span
          className="text-2xl"
          role="img"
          aria-label={primaryMeta.label}
          initial={{ scale: 0.5 }}
          animate={isInView ? { scale: 1 } : { scale: 0.5 }}
          transition={{ duration: 0.4, delay: delay + 0.15, type: 'spring', stiffness: 250, damping: 15 }}
        >
          {primaryMeta.emoji}
        </motion.span>
        <div>
          <p className="text-sm font-bold" style={{ color: barColor }}>
            {primaryMeta.label}
          </p>
          <p className="text-[10px] text-muted-foreground/50">Główny język uczuć</p>
        </div>
      </motion.div>

      {/* Score bars for all 5 languages */}
      <div className="space-y-2 mb-3">
        {ALL_LANGUAGES.map((key, idx) => {
          const meta = LOVE_LANGUAGE_META[key];
          const score = loveLanguage.scores[key];
          const isPrimary = key === loveLanguage.primary;

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={cn('text-[11px]', isPrimary ? 'text-foreground font-medium' : 'text-muted-foreground/60')}>
                  {meta.emoji} {meta.label}
                </span>
                <motion.span
                  className="text-[11px] font-mono text-muted-foreground/50 tabular-nums"
                  initial={{ opacity: 0 }}
                  animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ duration: 0.3, delay: delay + 0.2 + idx * 0.05 }}
                >
                  {score}
                </motion.span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-purple-950/[0.2]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
                    boxShadow: isPrimary ? `0 0 8px ${barGlow}` : 'none',
                  }}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${score}%` } : { width: 0 }}
                  transition={{ duration: 0.7, delay: delay + 0.15 + idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Evidence */}
      {loveLanguage.evidence && (
        <motion.p
          className="text-[11px] text-muted-foreground/50 leading-relaxed mb-2 line-clamp-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, delay: delay + 0.5 }}
        >
          {loveLanguage.evidence}
        </motion.p>
      )}

      {/* Confidence */}
      <ConfidenceBadge confidence={loveLanguage.confidence} isInView={isInView} delay={delay + 0.55} />
    </motion.div>
  );
}

export default function LoveLanguageCard({ profiles, participants }: LoveLanguageCardProps) {
  const participantsWithProfiles = participants.filter(
    (name) => profiles[name] !== undefined,
  );

  const anyHasLoveLanguage = participantsWithProfiles.some(
    (name) => profiles[name]?.love_language !== undefined,
  );
  if (!anyHasLoveLanguage) return null;

  return (
    <div className="rounded-xl border border-purple-500/[0.06] bg-purple-950/[0.08] overflow-hidden">
      <div className="px-5 pt-4 pb-1">
        <h3 className="font-display text-[15px] font-bold">Języki uczuć</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Jak wyrażacie uczucia w rozmowach
        </p>
      </div>
      <div className="px-5 py-4">
        <div className={cn(
          'flex gap-6',
          participantsWithProfiles.length === 1 ? 'flex-col' : 'flex-col md:flex-row',
        )}>
          {participantsWithProfiles.map((name, index) => {
            const loveLanguage = profiles[name]?.love_language;

            if (!loveLanguage) {
              const dotClass = PERSON_DOT_CLASSES[index % PERSON_DOT_CLASSES.length];
              return (
                <div key={name} className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-semibold text-sm mb-3">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
                    <span>{name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground/50 italic">
                    Za mało danych do oceny języków uczuć
                  </p>
                </div>
              );
            }

            return (
              <PersonLoveLanguage
                key={name}
                name={name}
                loveLanguage={loveLanguage}
                personIndex={index}
                delay={index * 0.12}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
