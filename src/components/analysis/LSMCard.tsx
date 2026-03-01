'use client';

import { motion } from 'framer-motion';
import type { LSMResult } from '@/lib/parsers/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';
import { QuantBadge } from '@/components/shared/SourceBadge';

interface LSMCardProps {
  result?: LSMResult | null;
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

function scoreHexColor(score: number): string {
  if (score >= 0.8) return '#10b981';
  if (score >= 0.6) return '#f59e0b';
  return '#ef4444';
}

// Thresholds aligned with lsm.ts + empirical norms (Cannava & Bodie, 2017;
// Burke & Rauer, 2022). Population mean ~ .84 for couples, range .75-.95.
function interpretationLabel(score: number): string {
  if (score >= 0.87) return 'Bardzo wysoka synchronizacja';
  if (score >= 0.80) return 'Wysoka synchronizacja';
  if (score >= 0.65) return 'Umiarkowana synchronizacja';
  if (score >= 0.50) return 'Niska synchronizacja';
  return 'Bardzo niska synchronizacja';
}

export default function LSMCard({ result, participants }: LSMCardProps) {
  if (!result) return (
    <div className="rounded-xl border border-border bg-card/50 p-6 opacity-50">
      <p className="text-sm text-muted-foreground text-center">Za mało danych dla tej analizy</p>
    </div>
  );

  const overallPct = Math.round(result.overall * 100);
  const categories = Object.entries(result.perCategory);

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <span className="text-lg">🔗</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-[family-name:var(--font-syne)] text-lg font-semibold text-white">Language Style Matching</h3>
            <QuantBadge />
          </div>
          <p className="text-sm text-white/50">Synchronizacja stylu językowego</p>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-5 flex items-center gap-4">
        <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/[0.04]" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              strokeWidth="2.5"
              strokeDasharray={`${overallPct} ${100 - overallPct}`}
              strokeLinecap="round"
              className={scoreColor(result.overall)}
              stroke="currentColor"
            />
          </svg>
          <span
            className={`absolute font-mono text-3xl font-black ${scoreColor(result.overall)}`}
            style={{ textShadow: `0 0 20px ${scoreHexColor(result.overall)}40` }}
          >
            {overallPct}
          </span>
        </div>
        <div className="flex-1">
          <p className={`font-[family-name:var(--font-syne)] text-base font-semibold ${scoreColor(result.overall)}`}>
            {interpretationLabel(result.overall)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            {result.interpretation}
          </p>
          <p className="mt-1 text-xs text-white/30">
            Norma dla par: 0.84 (zakres 0.75–0.95)
          </p>
        </div>
      </div>

      {/* Adaptation Direction */}
      {result.adaptationDirection && (
        <div className="mb-5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4">
          <p className="text-xs text-white/50">
            <span className="font-medium text-white">🦎 Kameleon:</span>{' '}
            <span className="font-medium text-accent">{result.adaptationDirection.chameleon}</span>
            {' '}— bardziej dopasowuje swój styl do rozmówcy
          </p>
        </div>
      )}

      {/* Per-Category Breakdown */}
      <div className="flex flex-col gap-2.5">
        {categories.map(([key, score], index) => (
          <motion.div
            key={key}
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="w-[120px] truncate text-sm text-white/50">
              {CATEGORY_LABELS[key] ?? key}
            </span>
            <div
              className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
            >
              <div
                className="rounded-full transition-all duration-700"
                style={{
                  width: `${Math.round(score * 100)}%`,
                  background: `linear-gradient(90deg, ${scoreHexColor(score)}90, ${scoreHexColor(score)})`,
                  boxShadow: `0 0 8px ${scoreHexColor(score)}25`,
                }}
              />
            </div>
            <span className={`w-8 text-right font-mono text-xs ${scoreColor(score)}`}>
              {score.toFixed(2)}
            </span>
          </motion.div>
        ))}
      </div>

      <PsychDisclaimer
        text="LSM mierzy podobieństwo użycia słów funkcyjnych (przyimki, spójniki, zaimki). Wysoki LSM (>0.80) koreluje z lepszą jakością relacji (r=.10, meta-analiza; Bierstetel et al., 2020, N=383). Normy wg Cannava & Bodie, 2017."
        citation={PSYCH_CITATIONS.lsmShort}
      />
    </div>
  );
}
