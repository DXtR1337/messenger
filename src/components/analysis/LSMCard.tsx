'use client';

import type { LSMResult } from '@/lib/parsers/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';

interface LSMCardProps {
  result: LSMResult;
  participants: string[];
}

// Polish labels for LSM categories
const CATEGORY_LABELS: Record<string, string> = {
  articles: 'Przedimki',
  prepositions: 'Przyimki',
  auxiliaryVerbs: 'Czasowniki pom.',
  conjunctions: 'Spójniki',
  negations: 'Przeczenia',
  quantifiers: 'Kwantyfikatory',
  personalPronouns: 'Zaimki osobowe',
  impersonalPronouns: 'Zaimki nieosobowe',
  adverbs: 'Przysłówki',
};

function scoreColor(score: number): string {
  if (score >= 0.8) return 'text-emerald-400';
  if (score >= 0.6) return 'text-amber-400';
  return 'text-red-400';
}

function barColor(score: number): string {
  if (score >= 0.8) return 'bg-emerald-500';
  if (score >= 0.6) return 'bg-amber-500';
  return 'bg-red-500';
}

function interpretationLabel(score: number): string {
  if (score >= 0.85) return 'Bardzo wysoka synchronizacja';
  if (score >= 0.75) return 'Wysoka synchronizacja';
  if (score >= 0.65) return 'Umiarkowana synchronizacja';
  if (score >= 0.5) return 'Niska synchronizacja';
  return 'Bardzo niska synchronizacja';
}

export default function LSMCard({ result, participants }: LSMCardProps) {
  const overallPct = Math.round(result.overall * 100);
  const categories = Object.entries(result.perCategory);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <span className="text-lg">🔗</span>
        </div>
        <div>
          <h3 className="font-display text-sm font-bold">Language Style Matching</h3>
          <p className="text-xs text-muted-foreground">Synchronizacja stylu językowego</p>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-5 flex items-center gap-4">
        <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/50" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              strokeWidth="2.5"
              strokeDasharray={`${overallPct} ${100 - overallPct}`}
              strokeLinecap="round"
              className={scoreColor(result.overall)}
              stroke="currentColor"
            />
          </svg>
          <span className={`absolute font-display text-xl font-black ${scoreColor(result.overall)}`}>
            {overallPct}
          </span>
        </div>
        <div className="flex-1">
          <p className={`font-display text-sm font-bold ${scoreColor(result.overall)}`}>
            {interpretationLabel(result.overall)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {result.interpretation}
          </p>
        </div>
      </div>

      {/* Adaptation Direction */}
      {result.adaptationDirection && (
        <div className="mb-5 rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-white">🦎 Kameleon:</span>{' '}
            <span className="font-medium text-accent">{result.adaptationDirection.chameleon}</span>
            {' '}— bardziej dopasowuje swój styl do rozmówcy
          </p>
        </div>
      )}

      {/* Per-Category Breakdown */}
      <div className="flex flex-col gap-2">
        {categories.map(([key, score]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-[120px] truncate text-[11px] text-muted-foreground">
              {CATEGORY_LABELS[key] ?? key}
            </span>
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`${barColor(score)} rounded-full transition-all duration-700`}
                style={{ width: `${Math.round(score * 100)}%` }}
              />
            </div>
            <span className={`w-8 text-right font-mono text-[11px] ${scoreColor(score)}`}>
              {score.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <PsychDisclaimer
        text="LSM mierzy podobieństwo użycia słów funkcyjnych (przyimki, spójniki, zaimki). Wysoki LSM (>0.80) koreluje z lepszą jakością relacji."
        citation={PSYCH_CITATIONS.lsmShort}
      />
    </div>
  );
}
