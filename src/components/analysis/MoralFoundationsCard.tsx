'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MoralFoundationsResult } from '@/lib/analysis/moral-foundations-prompts';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import { PSYCH_CITATIONS } from '@/lib/analysis/citations';

interface MoralFoundationsCardProps {
  result: MoralFoundationsResult;
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

const FOUNDATION_LABELS: Record<string, string> = {
  care: 'Troska',
  fairness: 'Sprawiedliwość',
  loyalty: 'Lojalność',
  authority: 'Autorytet',
  sanctity: 'Świętość',
  liberty: 'Wolność',
};

const FOUNDATION_EMOJIS: Record<string, string> = {
  care: '💛',
  fairness: '⚖️',
  loyalty: '🤝',
  authority: '👑',
  sanctity: '✨',
  liberty: '🕊️',
};

const FOUNDATIONS = ['care', 'fairness', 'loyalty', 'authority', 'sanctity', 'liberty'] as const;

function compatibilityColor(score: number): string {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 30) return 'text-amber-400';
  return 'text-red-400';
}

export default function MoralFoundationsCard({ result, participants }: MoralFoundationsCardProps) {
  const entries = participants
    .filter(p => result.perPerson[p])
    .map((name, idx) => ({
      name,
      data: result.perPerson[name],
      color: PERSON_COLORS[idx % PERSON_COLORS.length],
    }));

  if (entries.length === 0) return null;

  // Build chart data
  const chartData = FOUNDATIONS.map(f => {
    const point: Record<string, unknown> = { foundation: FOUNDATION_LABELS[f] };
    for (const { name, data } of entries) {
      point[name] = data[f];
    }
    return point;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10">
          <span className="text-lg">⚖️</span>
        </div>
        <div>
          <h3 className="font-display text-sm font-bold">Fundamenty Moralne</h3>
          <p className="text-xs text-muted-foreground">Teoria Haidta — 6 fundamentów</p>
        </div>
        <div className="ml-auto">
          <span className={`font-display text-lg font-black ${compatibilityColor(result.moralCompatibility)}`}>
            {result.moralCompatibility}%
          </span>
          <p className="text-[10px] text-muted-foreground text-right">zgodność</p>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="mb-4 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="#2a2a2a" />
            <PolarAngleAxis
              dataKey="foundation"
              tick={{ fill: '#888888', fontSize: 10 }}
            />
            {entries.map(({ name, color }) => (
              <Radar
                key={name}
                name={name}
                dataKey={name}
                stroke={color}
                fill={color}
                fillOpacity={0.15}
                strokeWidth={1.5}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Dominant foundations per person */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {entries.map(({ name, data, color }) => (
          <div key={name} className="rounded-lg bg-muted p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-white truncate">{name}</span>
            </div>
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-base">{FOUNDATION_EMOJIS[data.dominantFoundation]}</span>
              <span className="text-[11px] font-medium" style={{ color }}>
                {FOUNDATION_LABELS[data.dominantFoundation]}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {data.interpretation}
            </p>
          </div>
        ))}
      </div>

      {/* Conflicts */}
      {result.conflicts.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
            Napięcia wartości
          </p>
          {result.conflicts.map((c, i) => (
            <p key={i} className="text-[11px] text-muted-foreground leading-relaxed">{c}</p>
          ))}
        </div>
      )}

      {/* Overall profile */}
      {result.overallProfile && (
        <div className="mb-4 rounded-lg bg-muted px-3 py-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{result.overallProfile}</p>
        </div>
      )}

      <PsychDisclaimer
        text="Fundamenty moralne wykrywane z wzorców językowych (słownik MFD, Haidt & Graham 2007). Metoda słownikowa: r=0.59–0.77 korelacja z ankietami MFQ (Rathje et al., 2024, PNAS). Wyniki heurystyczne — nie diagnostyczne."
        citation={`${PSYCH_CITATIONS.haidt2007Short}`}
      />
    </div>
  );
}
