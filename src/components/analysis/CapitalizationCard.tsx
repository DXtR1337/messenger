'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CapitalizationResult, ACRType } from '@/lib/analysis/capitalization-prompts';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

interface CapitalizationCardProps {
  result: CapitalizationResult;
}

const ACR_CONFIG: Record<ACRType, { label: string; emoji: string; color: string; bar: string }> = {
  active_constructive: {
    label: 'Aktywny Konstruktywny',
    emoji: '🎉',
    color: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  passive_constructive: {
    label: 'Pasywny Konstruktywny',
    emoji: '🙂',
    color: 'text-blue-400',
    bar: 'bg-blue-500',
  },
  active_destructive: {
    label: 'Aktywny Destruktywny',
    emoji: '😬',
    color: 'text-red-400',
    bar: 'bg-red-500',
  },
  passive_destructive: {
    label: 'Pasywny Destruktywny',
    emoji: '😶',
    color: 'text-orange-400',
    bar: 'bg-orange-500',
  },
};

const PERSON_STYLE = [
  { dot: 'bg-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/5', score: 'text-blue-400' },
  { dot: 'bg-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/5', score: 'text-purple-400' },
  { dot: 'bg-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', score: 'text-emerald-400' },
  { dot: 'bg-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/5', score: 'text-amber-400' },
];

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 45) return 'text-amber-400';
  return 'text-red-400';
}

export default function CapitalizationCard({ result }: CapitalizationCardProps) {
  const { perPerson, examples, overallScore, interpretation, gottmanComparison } = result;
  const personEntries = Object.entries(perPerson);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border">
        <div>
          <h3 className="font-display text-base font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Kapitalizacja sukcesu
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Jak reagujecie na dobre wieści? (Gable et al., 2004)</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-right shrink-0 ml-4">
          <div className={cn('text-2xl font-black font-mono leading-none', scoreColor(overallScore))}>
            {overallScore}%
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">ACR score</div>
        </div>
      </div>

      {/* ── Interpretation ── */}
      <div className="px-5 py-3 border-b border-border">
        <p className="text-[11px] text-muted-foreground leading-relaxed">{interpretation}</p>
        {gottmanComparison && (
          <p className="mt-1 text-[11px] text-muted-foreground/50 italic">{gottmanComparison}</p>
        )}
      </div>

      {/* ── Per-person profiles ── */}
      {personEntries.length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Profil odpowiedzi
          </p>
          <div className={cn('grid gap-3', personEntries.length >= 2 ? 'grid-cols-2' : 'grid-cols-1')}>
            {personEntries.map(([name, profile], pi) => {
              const style = PERSON_STYLE[pi % PERSON_STYLE.length];
              const total = Object.values(profile.typeCounts).reduce((a, b) => a + b, 0);
              return (
                <div
                  key={name}
                  className={cn('rounded-lg border p-3', style.border, style.bg)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', style.dot)} />
                    <span className="text-xs font-semibold truncate flex-1">{name}</span>
                    <span className={cn('text-sm font-black font-mono shrink-0', style.score)}>
                      {profile.acrScore}%
                    </span>
                  </div>
                  {/* Stacked bar */}
                  {total > 0 ? (
                    <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                      {(Object.entries(profile.typeCounts) as [ACRType, number][])
                        .filter(([, count]) => count > 0)
                        .map(([type, count]) => (
                          <motion.div
                            key={type}
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / total) * 100}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={cn('h-full', ACR_CONFIG[type].bar)}
                            title={`${ACR_CONFIG[type].label}: ${count}`}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="h-2.5 rounded-full bg-muted/40" />
                  )}
                  {/* Emoji counters */}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {(Object.entries(profile.typeCounts) as [ACRType, number][]).map(([type, count]) => (
                      <span
                        key={type}
                        className={cn(
                          'text-[9px] tabular-nums',
                          count > 0 ? ACR_CONFIG[type].color : 'text-muted-foreground/30'
                        )}
                      >
                        {ACR_CONFIG[type].emoji} {count}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACR legend ── */}
      <div className="px-5 py-3 border-b border-border grid grid-cols-2 gap-1.5">
        {(Object.entries(ACR_CONFIG) as [ACRType, typeof ACR_CONFIG[ACRType]][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-2 rounded-md bg-muted/20 px-2.5 py-1.5">
            <span className="text-sm leading-none">{cfg.emoji}</span>
            <div>
              <div className={cn('text-[11px] font-semibold leading-none', cfg.color)}>{cfg.label}</div>
              <div className="text-[9px] text-muted-foreground mt-0.5">
                {type === 'active_constructive' && 'Entuzjazm + pytania'}
                {type === 'passive_constructive' && 'Cichy support'}
                {type === 'active_destructive' && 'Szuka problemów'}
                {type === 'passive_destructive' && 'Ignoruje / zmienia temat'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Examples ── */}
      {examples.length > 0 && (
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            Wykryte momenty
          </p>
          {examples.slice(0, 4).map((ex, i) => {
            const cfg = ACR_CONFIG[ex.type];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3 }}
                className="rounded-lg bg-muted/15 border border-border overflow-hidden flex"
              >
                <div className={cn('w-0.5 shrink-0', cfg.bar)} />
                <div className="flex-1 p-3">
                  <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Dobra wiadomość
                  </div>
                  <p className="text-[11px] text-foreground/60 italic leading-snug mb-2">
                    &ldquo;{ex.goodNews.length > 120 ? ex.goodNews.slice(0, 120) + '…' : ex.goodNews}&rdquo;
                  </p>
                  <div className="text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Odpowiedź ({ex.responder})
                  </div>
                  <p className="text-[11px] text-foreground/90 italic leading-snug mb-2">
                    &ldquo;{ex.response.length > 120 ? ex.response.slice(0, 120) + '…' : ex.response}&rdquo;
                  </p>
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={cn('text-[11px] font-semibold shrink-0', cfg.color)}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-snug">{ex.explanation}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <PsychDisclaimer
        text="Model ACR (Active-Constructive Responding) pochodzi z badań Gable et al. (2004, JPSP, N=69 par + replikacje). 86% szczęśliwych par vs 33% par rozchodzących się reaguje Active-Constructively na dobre wieści. Klasyfikacja AI może popełniać błędy — humor, ironia, skróty myślowe mogą być błędnie sklasyfikowane."
        citation="Gable, Reis, Impett & Asher, 2004 (JPSP, 87(2)); Peters et al., 2018 (SPPC)"
        showGenericFooter
      />
    </motion.div>
  );
}
