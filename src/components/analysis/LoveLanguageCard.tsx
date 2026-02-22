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

const PERSON_COLORS = ['#3b82f6', '#a855f7'] as const;
const PERSON_DOT_CLASSES = ['bg-chart-a', 'bg-chart-b'] as const;

const LOVE_LANGUAGE_META: Record<LoveLanguageKey, { emoji: string; label: string }> = {
  words_of_affirmation: { emoji: '\u{1F4AC}', label: 'S\u0142owa uznania' },
  quality_time: { emoji: '\u{23F0}', label: 'Wsp\u00F3lny czas' },
  acts_of_service: { emoji: '\u{1F91D}', label: 'Akty s\u0142u\u017Cby' },
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

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 60
      ? 'text-success bg-success-subtle'
      : confidence >= 40
        ? 'text-warning bg-warning-subtle'
        : 'text-muted-foreground bg-white/[0.04]';

  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', color)}>
      {confidence}% pewności
    </span>
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
  const isInView = useInView(ref, { once: true });

  const dotClass = PERSON_DOT_CLASSES[personIndex % PERSON_DOT_CLASSES.length];
  const barColor = PERSON_COLORS[personIndex % PERSON_COLORS.length];
  const primaryMeta = LOVE_LANGUAGE_META[loveLanguage.primary];

  return (
    <motion.div
      ref={ref}
      className="flex-1 min-w-0"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {/* Person name */}
      <div className="flex items-center gap-1.5 font-semibold text-sm mb-3">
        <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
        <span>{name}</span>
      </div>

      {/* Primary love language highlight */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" role="img" aria-label={primaryMeta.label}>
          {primaryMeta.emoji}
        </span>
        <div>
          <p className="text-sm font-semibold" style={{ color: barColor }}>
            {primaryMeta.label}
          </p>
          <p className="text-[10px] text-muted-foreground">Główny język uczuć</p>
        </div>
      </div>

      {/* Score bars for all 5 languages */}
      <div className="space-y-2 mb-3">
        {ALL_LANGUAGES.map((key) => {
          const meta = LOVE_LANGUAGE_META[key];
          const score = loveLanguage.scores[key];
          const isPrimary = key === loveLanguage.primary;

          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={cn('text-[11px]', isPrimary ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {meta.emoji} {meta.label}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">{score}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: barColor }}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${score}%` } : { width: 0 }}
                  transition={{ duration: 0.6, delay: delay + 0.1, ease: 'easeOut' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Evidence */}
      {loveLanguage.evidence && (
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 line-clamp-3">
          {loveLanguage.evidence}
        </p>
      )}

      {/* Confidence */}
      <ConfidenceBadge confidence={loveLanguage.confidence} />
    </motion.div>
  );
}

export default function LoveLanguageCard({ profiles, participants }: LoveLanguageCardProps) {
  const participantsWithLoveLanguage = participants.filter(
    (name) => profiles[name]?.love_language !== undefined,
  );

  if (participantsWithLoveLanguage.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 pt-4 pb-1">
        <h3 className="font-display text-[15px] font-bold">Języki uczuć</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Jak wyrażacie uczucia w rozmowach
        </p>
      </div>
      <div className="px-5 py-4">
        <div className={cn(
          'flex gap-6',
          participantsWithLoveLanguage.length === 1 ? 'flex-col' : 'flex-col md:flex-row',
        )}>
          {participantsWithLoveLanguage.map((name, index) => {
            const loveLanguage = profiles[name]?.love_language;
            if (!loveLanguage) return null;

            return (
              <PersonLoveLanguage
                key={name}
                name={name}
                loveLanguage={loveLanguage}
                personIndex={index}
                delay={index * 0.1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
