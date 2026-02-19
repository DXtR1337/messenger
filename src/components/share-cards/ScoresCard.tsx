'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { ViralScores } from '@/lib/parsers/types';

interface ScoresCardProps {
  viralScores: ViralScores;
  participants: string[];
}

function getScoreStyle(score: number): { color: string; neon: string; label: string } {
  if (score >= 80) return { color: '#00ff88', neon: 'rgba(0,255,136,0.4)', label: 'JACKPOT' };
  if (score >= 60) return { color: '#fbbf24', neon: 'rgba(251,191,36,0.3)', label: 'GORĄCO' };
  if (score >= 40) return { color: '#ff8c00', neon: 'rgba(255,140,0,0.3)', label: 'CIEPŁO' };
  return { color: '#ff3333', neon: 'rgba(255,51,51,0.3)', label: 'ZIMNO' };
}

export default function ScoresCard({ viralScores, participants }: ScoresCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-scores');

  const nameA = participants[0] ?? 'Osoba A';
  const nameB = participants[1] ?? 'Osoba B';

  const compatScore = viralScores.compatibilityScore;
  const interestA = viralScores.interestScores[nameA] ?? 0;
  const interestB = viralScores.interestScores[nameB] ?? 0;
  const delusionScore = viralScores.delusionScore;
  const delusionHolder = viralScores.delusionHolder;

  const compatStyle = getScoreStyle(compatScore);
  const delusionEmoji = delusionScore >= 70 ? '🤡' : delusionScore >= 40 ? '😳' : '😌';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#0a0008',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Casino neon border glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 60px rgba(255,0,100,0.08), inset 0 0 120px rgba(100,0,255,0.06)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header — neon sign */}
        <div
          style={{
            padding: '18px 16px 14px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1.2rem',
              color: '#ff3366',
              textShadow: '0 0 20px rgba(255,51,102,0.6), 0 0 40px rgba(255,51,102,0.3)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            ♠ WYNIKI VIRALOWE ♠
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#553344',
              letterSpacing: '0.12em',
              marginTop: 4,
            }}
          >
            PODTEKST KASYNO • OBSTAWIAJ
          </div>
        </div>

        {/* Main score — neon circle */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 16px 20px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Neon ring */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: `3px solid ${compatStyle.color}`,
              boxShadow: `0 0 20px ${compatStyle.neon}, 0 0 40px ${compatStyle.neon}, inset 0 0 20px ${compatStyle.neon}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 900,
                fontSize: '3rem',
                lineHeight: 1,
                color: compatStyle.color,
                textShadow: `0 0 20px ${compatStyle.neon}`,
              }}
            >
              {compatScore}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.5rem',
                color: '#553344',
              }}
            >
              DOPASOWANIE
            </span>
          </div>
          {/* Label */}
          <div
            style={{
              marginTop: 10,
              padding: '4px 20px',
              background: `${compatStyle.color}15`,
              border: `1px solid ${compatStyle.color}44`,
              borderRadius: 2,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 800,
                fontSize: '0.62rem',
                color: compatStyle.color,
                letterSpacing: '0.15em',
                textShadow: `0 0 10px ${compatStyle.neon}`,
              }}
            >
              ★ {compatStyle.label} ★
            </span>
          </div>
        </div>

        {/* Neon divider */}
        <div
          style={{
            height: 1,
            margin: '0 24px',
            background: 'linear-gradient(90deg, transparent, #ff336644, transparent)',
            boxShadow: '0 0 8px rgba(255,51,102,0.3)',
          }}
        />

        {/* Interest meters — slot-machine style */}
        <div style={{ padding: '16px 20px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.46rem',
              color: '#553344',
              letterSpacing: '0.12em',
              marginBottom: 12,
              textAlign: 'center',
            }}
          >
            POZIOM ZAINTERESOWANIA
          </div>

          {[
            { name: nameA, score: interestA, color: '#6d9fff' },
            { name: nameB, score: interestB, color: '#b38cff' },
          ].map((person) => (
            <div key={person.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.58rem',
                    color: person.color,
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 140,
                  }}
                >
                  {person.name}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    color: person.color,
                    textShadow: `0 0 10px ${person.color}44`,
                  }}
                >
                  {person.score}
                </span>
              </div>
              {/* Neon bar */}
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: '#1a0018',
                  border: '1px solid #2a1028',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${person.score}%`,
                    height: '100%',
                    borderRadius: 3,
                    background: person.color,
                    boxShadow: `0 0 8px ${person.color}66`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Delusion score — roulette feel */}
        <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              background: '#1a0018',
              border: '1px solid #2a1028',
              borderRadius: 4,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span style={{ fontSize: '2rem', flexShrink: 0 }}>{delusionEmoji}</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.42rem',
                  color: '#553344',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                WYNIK ZŁUDZEŃ
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 900,
                    fontSize: '1.8rem',
                    lineHeight: 1,
                    color: '#ff3366',
                    textShadow: '0 0 10px rgba(255,51,102,0.4)',
                  }}
                >
                  {delusionScore}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.46rem',
                    color: '#553344',
                  }}
                >
                  / 100
                </span>
              </div>
              {delusionHolder && (
                <div
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.5rem',
                    color: '#ff3366',
                    marginTop: 4,
                    opacity: 0.7,
                  }}
                >
                  {delusionHolder} trochę marzy
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#553344' }}>
            podtekst.app
          </span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#ff3366', textShadow: '0 0 6px rgba(255,51,102,0.3)' }}>
            ♦ ZAKŁADY BEZ ZWROTÓW ♦
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
        {isDownloading ? 'Pobieranie...' : 'Pobierz kartę'}
      </button>
    </div>
  );
}
