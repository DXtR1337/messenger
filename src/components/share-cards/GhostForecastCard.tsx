'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { ViralScores } from '@/lib/parsers/types';

interface GhostForecastCardProps {
  viralScores: ViralScores;
  participants: string[];
}

interface ForecastLevel {
  icon: string;
  label: string;
  color: string;
  description: string;
}

const FORECAST_LEVELS: ForecastLevel[] = [
  { icon: '☀️', label: 'BEZPIECZNIE', color: '#10b981', description: 'Odpowiedzi regularne, żadnych sygnałów ostrzegawczych' },
  { icon: '🌤️', label: 'LEKKIE CHMURY', color: '#84cc16', description: 'Drobne opóźnienia, ale nic poważnego' },
  { icon: '⛅', label: 'ZACHMURZENIE', color: '#eab308', description: 'Czas odpowiedzi rośnie, uważaj' },
  { icon: '🌧️', label: 'DESZCZ', color: '#f97316', description: 'Wyraźne sygnały dystansu' },
  { icon: '⛈️', label: 'BURZA', color: '#ef4444', description: 'Poważne ryzyko ghostingu' },
  { icon: '🌪️', label: 'EWAKUACJA', color: '#dc2626', description: 'Ghosting w toku lub nieuchronny' },
];

function getForecastLevel(score: number): ForecastLevel {
  if (score < 15) return FORECAST_LEVELS[0];
  if (score < 30) return FORECAST_LEVELS[1];
  if (score < 45) return FORECAST_LEVELS[2];
  if (score < 60) return FORECAST_LEVELS[3];
  if (score < 80) return FORECAST_LEVELS[4];
  return FORECAST_LEVELS[5];
}

export default function GhostForecastCard({ viralScores, participants }: GhostForecastCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-ghost-forecast');

  const mono = 'var(--font-geist-mono)';
  const syne = 'var(--font-syne)';
  const grotesk = 'var(--font-space-grotesk)';

  // Get the higher ghost risk
  const ghostEntries = Object.entries(viralScores.ghostRisk ?? {})
    .filter((entry): entry is [string, NonNullable<typeof entry[1]>] => entry[1] != null);
  const sorted = ghostEntries.sort(([, a], [, b]) => b.score - a.score);
  const topGhost = sorted[0];
  const topScore = topGhost?.[1]?.score ?? 0;
  const topName = topGhost?.[0] ?? '';
  const forecast = getForecastLevel(topScore);

  // Build thermometer segments
  const segments = FORECAST_LEVELS.map((level, i) => ({
    ...level,
    active: topScore >= i * 16,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: 'linear-gradient(180deg, #0a0a1a 0%, #0d0e1a 50%, #0a0a0f 100%)',
          borderRadius: 16,
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Weather glow */}
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${forecast.color}12 0%, transparent 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 10, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: syne,
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#a78bfa',
            }}
          >
            PodTeksT
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: syne,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#666',
            textAlign: 'center',
            textTransform: 'uppercase',
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          PROGNOZA GHOSTINGU
        </div>

        {/* Main weather icon */}
        <div
          style={{
            fontSize: '4rem',
            textAlign: 'center',
            marginBottom: 8,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {forecast.icon}
        </div>

        {/* Forecast label */}
        <div
          style={{
            fontFamily: syne,
            fontSize: '1.4rem',
            fontWeight: 900,
            color: forecast.color,
            textAlign: 'center',
            letterSpacing: '0.08em',
            marginBottom: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {forecast.label}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: grotesk,
            fontSize: '0.63rem',
            color: '#888',
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: 20,
            padding: '0 10px',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {forecast.description}
        </div>

        {/* Risk meter */}
        <div
          role="img"
          aria-label={`Poziom ryzyka ghostingu: ${forecast.label}, ${topScore}%`}
          style={{
            display: 'flex',
            gap: 3,
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {segments.map((seg, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: seg.active ? seg.color : '#1a1a1a',
                opacity: seg.active ? 1 : 0.3,
              }}
            />
          ))}
        </div>

        {/* Per-person forecast */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flex: 1,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {sorted.map(([name, data]) => {
            const pForecast = getForecastLevel(data.score);
            return (
              <div
                key={name}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontFamily: grotesk, fontSize: '0.65rem', fontWeight: 600, color: '#ccc' }}>
                    {name.split(' ')[0]}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: '0.63rem', color: pForecast.color, fontWeight: 700 }}>
                    {pForecast.icon} {data.score}%
                  </span>
                </div>
                {/* Risk bar */}
                <div role="meter" aria-label={`Ryzyko ghostingu: ${name}`} aria-valuenow={data.score} aria-valuemin={0} aria-valuemax={100} style={{ width: '100%', height: 3, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${data.score}%`,
                      height: '100%',
                      background: pForecast.color,
                      borderRadius: 2,
                    }}
                  />
                </div>
                {/* Factors */}
                {data.factors && data.factors.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {data.factors.slice(0, 2).map((f: string, fi: number) => (
                      <div
                        key={fi}
                        style={{
                          fontFamily: mono,
                          fontSize: '0.63rem',
                          color: '#555',
                          lineHeight: 1.6,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        • {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Subject line */}
        {topName && topScore > 40 && (
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#555',
              textAlign: 'center',
              marginTop: 10,
              position: 'relative',
              zIndex: 1,
            }}
          >
            ⚠️ Główne zagrożenie: {topName.split(' ')[0]}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: 10,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            podtekst.app · wyłącznie dla rozrywki
          </span>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '📥 Pobierz prognozę'}
      </button>
    </div>
  );
}
