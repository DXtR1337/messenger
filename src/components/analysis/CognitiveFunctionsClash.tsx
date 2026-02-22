'use client';

import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CognitiveFunctionsResult, CognitiveFunction } from '@/lib/analysis/cognitive-functions';

interface CognitiveFunctionsClashProps {
  result: CognitiveFunctionsResult | undefined;
  participants: string[];
}

const ROLE_LABELS: Record<string, string> = {
  dominant: 'dominująca',
  auxiliary: 'pomocnicza',
  tertiary: 'trzeciorzędna',
  inferior: 'niższa',
};

/** Color for compatibility score bar */
function compatColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

/** Color for overall compatibility badge */
function overallColor(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 50) return 'text-amber-400';
  return 'text-red-400';
}

/** Background tint for function pill based on cognitive base */
function funcPillClass(func: CognitiveFunction): string {
  const base = func[0]; // T, F, S, N
  switch (base) {
    case 'T': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'F': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    case 'S': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'N': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  }
}

export default function CognitiveFunctionsClash({ result, participants }: CognitiveFunctionsClashProps) {
  if (!result) return null;

  const stackNames = Object.keys(result.stacks);
  const nameA = stackNames[0] ?? participants[0] ?? 'Osoba A';
  const nameB = stackNames[1] ?? participants[1] ?? 'Osoba B';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
          <Brain className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Funkcje kognitywne
          </h3>
          <p className="text-xs text-muted-foreground">
            Jak wasze mózgi się zderzają
          </p>
        </div>
      </div>

      {/* Clash rows */}
      <div className="space-y-5">
        {result.clashes.map((clash, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * (idx + 1) }}
            className="space-y-2"
          >
            {/* Function badges row */}
            <div className="flex items-center justify-between gap-2">
              {/* Person A badge */}
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground truncate max-w-full">
                  {nameA}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-sm font-mono font-bold',
                    funcPillClass(clash.personA.func),
                  )}
                >
                  {clash.personA.func}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {ROLE_LABELS[clash.personA.role] ?? clash.personA.role}
                </span>
              </div>

              {/* VS separator */}
              <div className="flex-shrink-0 text-lg">
                ⚔️
              </div>

              {/* Person B badge */}
              <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
                <span className="text-xs text-muted-foreground truncate max-w-full">
                  {nameB}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-sm font-mono font-bold',
                    funcPillClass(clash.personB.func),
                  )}
                >
                  {clash.personB.func}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {ROLE_LABELS[clash.personB.role] ?? clash.personB.role}
                </span>
              </div>
            </div>

            {/* Clash description */}
            <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
              {clash.description}
            </p>

            {/* Compatibility bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: clash.compatibility + '%' }}
                  transition={{ delay: 0.2 * (idx + 1), duration: 0.6, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', compatColor(clash.compatibility))}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                {clash.compatibility}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overall compatibility */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 pt-4 border-t border-border flex items-center justify-between"
      >
        <span className="text-sm text-muted-foreground">
          Kompatybilność kognitywna
        </span>
        <span className={cn('text-2xl font-display font-bold', overallColor(result.overallCompatibility))}>
          {result.overallCompatibility}%
        </span>
      </motion.div>
    </motion.div>
  );
}
