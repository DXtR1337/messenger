'use client';

import { useRef, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import type { ViralScores } from '@/lib/parsers/types';

interface ScoresCardProps {
  viralScores: ViralScores;
  participants: string[];
}

function lcgBars(seed: number, count: number): number[] {
  let s = seed;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    bars.push(s % 4 === 0 ? 3 : s % 3 === 0 ? 2 : 1);
  }
  return bars;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#ffd700';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#fbbf24';
  return '#ef4444';
}

function getDelusionEmoji(score: number): string {
  if (score >= 70) return '\uD83E\uDD21';
  if (score >= 40) return '\uD83D\uDE0E';
  return '\uD83E\uDDD8';
}

function getDelusionVerdict(score: number): string {
  if (score >= 70) return 'MEGA DELUZJA';
  if (score >= 40) return 'LEKKA MGIEKA';
  return 'TWARDO NA ZIEMI';
}

export default function ScoresCard({ viralScores, participants }: ScoresCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-scores', {
    backgroundColor: '#15803d',
  });

  const nameA = participants[0] ?? 'Osoba A';
  const nameB = participants[1] ?? 'Osoba B';

  const compatScore = viralScores.compatibilityScore;
  const interestA = viralScores.interestScores[nameA] ?? 0;
  const interestB = viralScores.interestScores[nameB] ?? 0;
  const delusionScore = viralScores.delusionScore;

  const isWinner = compatScore > 70;
  // Unified gradient direction: higher scorer gets blue→purple, lower gets purple→blue
  const aHigher = interestA >= interestB;

  // Standardized metallic edge gradient
  const metallicH = 'linear-gradient(90deg, #a0a0a0, #c0c0c0, #d0d0d0, #c0c0c0, #a0a0a0)';
  const metallicV = 'linear-gradient(180deg, #a0a0a0, #c0c0c0, #d0d0d0, #c0c0c0, #a0a0a0)';

  const ticketNumber = useMemo(() => {
    const n = Math.floor(Math.random() * 90000000) + 10000000;
    return n.toString();
  }, []);

  const barcode = useMemo(() => lcgBars(compatScore * 137 + 9973, 50), [compatScore]);

  const silverParticles = useMemo(() => {
    const rng = (s: number) => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const particles: Array<{ x: number; y: number; r: number; opacity: number }> = [];
    let seed = 777;
    for (let i = 0; i < 18; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const x = rng(seed + i * 31) * 340 + 10;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const y = rng(seed + i * 47) * 520 + 80;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const r = rng(seed + i * 13) * 2.5 + 1;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const opacity = rng(seed + i * 19) * 0.3 + 0.1;
      particles.push({ x, y, r, opacity });
    }
    return particles;
  }, []);

  const diamondPatternSvg = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0L40 20L20 40L0 20Z' fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='0.5'/%3E%3C/svg%3E")`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: 'linear-gradient(160deg, #1a8a4a 0%, #15803d 40%, #12703a 70%, #0e6030 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Diamond geometric pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: diamondPatternSvg,
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Silver scratch particles */}
        <svg
          width="360"
          height="640"
          viewBox="0 0 360 640"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
        >
          {silverParticles.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#c0c0c0" opacity={p.opacity} />
          ))}
        </svg>

        {/* Winner banner */}
        {isWinner && (
          <div
            style={{
              position: 'absolute',
              top: 46,
              right: -34,
              width: 160,
              height: 24,
              background: 'linear-gradient(90deg, #ffd700, #ffb300, #ffd700)',
              transform: 'rotate(-15deg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 900,
                fontSize: '0.92rem',
                color: '#2a1a00',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              WYGRANA!
            </span>
          </div>
        )}

        {/* Header */}
        <div
          style={{
            padding: '18px 16px 8px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1.4rem',
              color: '#ffffff',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            PODTEKST ZDRAPKA
          </div>
          <div
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.63rem',
              color: 'rgba(255,255,255,0.75)',
              marginTop: 4,
            }}
          >
            Sprawdz swoje wyniki!
          </div>
        </div>

        {/* Ticket number */}
        <div
          style={{
            textAlign: 'center',
            padding: '2px 16px 12px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '0.1em',
            }}
          >
            Nr: {ticketNumber} &bull; Seria: PT-2026
          </span>
        </div>

        {/* Decorative dotted perimeter */}
        <div
          style={{
            margin: '0 14px',
            borderTop: '2px dashed rgba(255,255,255,0.15)',
            position: 'relative',
            zIndex: 2,
          }}
        />

        {/* 3 Scratch zones */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '14px 18px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Zone 1: KOMPATYBILNOSC */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 8,
              padding: '14px 16px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Silver metallic edge gradient — scratched off reveal */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: metallicH, borderRadius: '8px 8px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: metallicH, borderRadius: '0 0 8px 8px' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: metallicV, borderRadius: '8px 0 0 8px' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: metallicV, borderRadius: '0 8px 8px 0' }} />
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              KOMPATYBILNOSC
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.4rem' }}>{compatScore >= 70 ? '\u2764\uFE0F' : compatScore >= 40 ? '\uD83E\uDD1E' : '\uD83D\uDC94'}</span>
              <span
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 900,
                  fontSize: '2.6rem',
                  lineHeight: 1,
                  color: getScoreColor(compatScore),
                  textShadow: `0 0 12px ${getScoreColor(compatScore)}44`,
                }}
              >
                {compatScore}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.3)',
                  alignSelf: 'flex-end',
                  marginBottom: 6,
                }}
              >
                /100
              </span>
            </div>
          </div>

          {/* Zone 2: ZAINTERESOWANIE */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 8,
              padding: '12px 16px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Silver edges */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: metallicH, borderRadius: '8px 8px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: metallicH, borderRadius: '0 0 8px 8px' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: metallicV, borderRadius: '8px 0 0 8px' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: metallicV, borderRadius: '0 8px 8px 0' }} />

            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 10,
                textAlign: 'center',
              }}
            >
              ZAINTERESOWANIE
            </div>

            {/* Person A bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.68rem',
                    color: aHigher ? '#a0c4ff' : '#b8a8e8',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 160,
                  }}
                >
                  {nameA}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 900,
                    fontSize: '1rem',
                    color: aHigher ? '#a0c4ff' : '#b8a8e8',
                  }}
                >
                  {interestA}%
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${interestA}%`,
                    height: '100%',
                    borderRadius: 4,
                    background: aHigher
                      ? 'linear-gradient(90deg, #3b82f6, #a855f7)'
                      : 'linear-gradient(90deg, #a855f7, #3b82f6)',
                    boxShadow: '0 0 6px rgba(99,102,241,0.4)',
                  }}
                />
              </div>
            </div>

            {/* Person B bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.68rem',
                    color: !aHigher ? '#a0c4ff' : '#b8a8e8',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 160,
                  }}
                >
                  {nameB}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 900,
                    fontSize: '1rem',
                    color: !aHigher ? '#a0c4ff' : '#b8a8e8',
                  }}
                >
                  {interestB}%
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${interestB}%`,
                    height: '100%',
                    borderRadius: 4,
                    background: !aHigher
                      ? 'linear-gradient(90deg, #3b82f6, #a855f7)'
                      : 'linear-gradient(90deg, #a855f7, #3b82f6)',
                    boxShadow: '0 0 6px rgba(99,102,241,0.4)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Zone 3: DELUZJA */}
          <div
            style={{
              background: 'rgba(0,0,0,0.25)',
              borderRadius: 8,
              padding: '12px 16px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Silver edges */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: metallicH, borderRadius: '8px 8px 0 0' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: metallicH, borderRadius: '0 0 8px 8px' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: metallicV, borderRadius: '8px 0 0 8px' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 3, background: metallicV, borderRadius: '0 8px 8px 0' }} />

            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              DELUZJA
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: '2rem' }}>{getDelusionEmoji(delusionScore)}</span>
              <div style={{ textAlign: 'center' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 900,
                    fontSize: '2.2rem',
                    lineHeight: 1,
                    color: delusionScore >= 70 ? '#ef4444' : delusionScore >= 40 ? '#fbbf24' : '#22c55e',
                    textShadow: `0 0 10px ${delusionScore >= 70 ? 'rgba(239,68,68,0.3)' : delusionScore >= 40 ? 'rgba(251,191,36,0.3)' : 'rgba(34,197,94,0.3)'}`,
                  }}
                >
                  {delusionScore}
                </span>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: 'rgba(255,255,255,0.5)',
                    marginTop: 2,
                    letterSpacing: '0.08em',
                  }}
                >
                  {getDelusionVerdict(delusionScore)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fine print */}
        <div
          style={{
            padding: '0 20px 6px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: 'rgba(255,255,255,0.25)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Wyniki nie stanowia porady zyciowej. Podtekst nie odpowiada za zlamane serca.
          </p>
        </div>

        {/* Dashed separator above barcode */}
        <div
          style={{
            margin: '6px 14px 0',
            borderTop: '2px dashed rgba(255,255,255,0.15)',
            position: 'relative',
            zIndex: 2,
          }}
        />

        {/* Barcode */}
        <div
          style={{
            padding: '8px 30px 12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 1,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <svg width="300" height="28" viewBox="0 0 300 28">
            {barcode.map((w, i) => {
              const x = i * 6;
              const barWidth = w + 1;
              return (
                <rect
                  key={i}
                  x={x}
                  y={0}
                  width={barWidth}
                  height={22}
                  fill="rgba(255,255,255,0.35)"
                  rx={0.5}
                />
              );
            })}
            <text
              x="150"
              y="28"
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize="8"
              fontFamily="var(--font-geist-mono)"
            >
              PT-{ticketNumber}
            </text>
          </svg>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0 16px 10px',
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            podtekst.app
          </span>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: '#a1a1aa',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          padding: '8px 16px',
          cursor: isDownloading ? 'wait' : 'pointer',
          opacity: isDownloading ? 0.5 : 1,
        }}
      >
        {isDownloading ? 'Pobieranie...' : 'Pobierz karte'}
      </button>
    </div>
  );
}
