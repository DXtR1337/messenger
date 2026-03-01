'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { RankingPercentiles } from '@/lib/parsers/types';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';
import ExperimentalBadge from '@/components/shared/ExperimentalBadge';

const METRIC_ICON: Record<string, string> = {
  message_volume: '/icons/ranking/ranking-message-volume.png',
  response_time: '/icons/ranking/ranking-response-time.png',
  ghost_frequency: '/icons/ranking/ranking-ghost.png',
  asymmetry: '/icons/ranking/ranking-asymmetry.png',
};

interface RankingBadgesProps {
  rankings: RankingPercentiles;
}

function getBadgeTier(percentile: number): {
  label: string;
  bg: string;
  text: string;
  ring: string;
  shadow: string;
  textShadow: string;
} {
  if (percentile >= 90) {
    return {
      label: `TOP ${100 - percentile}%`,
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      ring: 'ring-yellow-500/40',
      shadow: '0 0 12px rgba(234,179,8,0.2)',
      textShadow: '0 0 12px rgba(234,179,8,0.4)',
    };
  }
  if (percentile >= 75) {
    return {
      label: `TOP ${100 - percentile}%`,
      bg: 'bg-slate-300/10',
      text: 'text-slate-300',
      ring: 'ring-slate-400/40',
      shadow: '0 0 12px rgba(148,163,184,0.15)',
      textShadow: '0 0 10px rgba(148,163,184,0.3)',
    };
  }
  if (percentile >= 50) {
    return {
      label: `TOP ${100 - percentile}%`,
      bg: 'bg-amber-600/10',
      text: 'text-amber-500',
      ring: 'ring-amber-600/40',
      shadow: '0 0 10px rgba(217,119,6,0.15)',
      textShadow: '0 0 10px rgba(217,119,6,0.3)',
    };
  }
  return {
    label: `TOP ${100 - percentile}%`,
    bg: 'bg-blue-500/[0.06]',
    text: 'text-blue-400/70',
    ring: 'ring-blue-500/20',
    shadow: '0 0 8px rgba(59,130,246,0.1)',
    textShadow: '0 0 8px rgba(59,130,246,0.2)',
  };
}

export default function RankingBadges({ rankings }: RankingBadgesProps) {
  if (!rankings.rankings || rankings.rankings.length === 0) return null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Image src="/icons/ranking/ranking-trophy.png" alt="" width={96} height={96} className="size-7" unoptimized />
        <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
          Ranking
        </h3>
        <ExperimentalBadge metricKey="rankingPercentiles" />
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Jak wypadacie na tle innych par
      </p>
      <PsychDisclaimer
        text="Rankingi percentylowe są szacunkowe — oparte na heurystycznych parametrach, nie empirycznych danych populacyjnych."
        className="mb-4 mt-0 px-0"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" data-scroll-group="achievements">
        {rankings.rankings.map((ranking) => {
          const tier = getBadgeTier(ranking.percentile);

          return (
            <div
              key={ranking.metric}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl p-3 ring-1 sm:p-4 transition-all duration-300 hover:-translate-y-0.5',
                tier.bg,
                tier.ring,
              )}
              style={{ boxShadow: tier.shadow }}
            >
              {METRIC_ICON[ranking.metric] ? (
                <Image
                  src={METRIC_ICON[ranking.metric]}
                  alt={ranking.label}
                  width={192}
                  height={192}
                  className="size-14 sm:size-16"
                  unoptimized
                />
              ) : (
                <span className="text-2xl sm:text-3xl">{ranking.emoji}</span>
              )}
              <span
                className={cn(
                  'font-mono text-2xl font-black',
                  tier.text,
                )}
                style={{ textShadow: tier.textShadow }}
              >
                {tier.label}
              </span>
              <span className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                {ranking.label}
              </span>
              {ranking.isEstimated && (
                <span className="text-[10px] text-gray-500" title="Percentyl oparty na szacunkowych normach statystycznych, nie na danych empirycznych">
                  (szacunkowe)
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
