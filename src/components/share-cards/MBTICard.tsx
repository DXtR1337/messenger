'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { PersonProfile } from '@/lib/analysis/types';

interface MBTICardProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
}

const PERSON_COLORS = ['#6d9fff', '#b38cff'] as const;
const PERSON_BG = ['rgba(109,159,255,0.08)', 'rgba(179,140,255,0.08)'] as const;

const DIMENSION_LABELS: Record<string, [string, string]> = {
  ie: ['I', 'E'],
  sn: ['S', 'N'],
  tf: ['T', 'F'],
  jp: ['J', 'P'],
};

const DIM_FULL: Record<string, [string, string]> = {
  ie: ['Introwertyk', 'Ekstrawertyk'],
  sn: ['Sensoryk', 'Intuicyjny'],
  tf: ['Myśliciel', 'Uczuciowy'],
  jp: ['Osądzający', 'Percepcyjny'],
};

export default function MBTICard({ profiles, participants }: MBTICardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'chatscope-mbti');

  const participantsWithMBTI = participants.filter(
    (name) => profiles[name]?.mbti,
  );

  if (participantsWithMBTI.length === 0) return null;

  const isTwoPlayer = participantsWithMBTI.length >= 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#050510',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Grid scanlines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(100,100,255,0.02) 3px, rgba(100,100,255,0.02) 4px)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Corner accents */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTop: '2px solid #ff336644', borderLeft: '2px solid #ff336644', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTop: '2px solid #ff336644', borderRight: '2px solid #ff336644', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottom: '2px solid #ff336644', borderLeft: '2px solid #ff336644', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottom: '2px solid #ff336644', borderRight: '2px solid #ff336644', zIndex: 2 }} />

        {/* Header — fighting game title */}
        <div
          style={{
            padding: '18px 16px 10px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '0.72rem',
              color: '#ff3366',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              textShadow: '0 0 10px rgba(255,51,102,0.4)',
            }}
          >
            WYBIERZ WOJOWNIKA
          </div>
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1.4rem',
              color: '#ffffff',
              letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(255,255,255,0.2)',
              marginTop: 2,
            }}
          >
            STARCIE MBTI
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#333355',
              letterSpacing: '0.1em',
              marginTop: 4,
            }}
          >
            CHATSCOPE MISTRZOSTWA WALKI
          </div>
        </div>

        {/* VS divider for two players */}
        {isTwoPlayer && (
          <div
            style={{
              textAlign: 'center',
              padding: '6px 0',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-syne)',
                fontWeight: 900,
                fontSize: '1.2rem',
                color: '#ff3366',
                textShadow: '0 0 20px rgba(255,51,102,0.6), 0 0 40px rgba(255,51,102,0.3)',
                letterSpacing: '0.15em',
              }}
            >
              VS
            </div>
          </div>
        )}

        {/* Character panels */}
        <div
          style={{
            flex: 1,
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: isTwoPlayer ? 10 : 20,
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {participantsWithMBTI.map((name, idx) => {
            const mbti = profiles[name].mbti!;
            const color = PERSON_COLORS[idx] ?? PERSON_COLORS[0];
            const bg = PERSON_BG[idx] ?? PERSON_BG[0];
            const isRight = idx === 1;

            return (
              <div
                key={name}
                style={{
                  background: bg,
                  border: `1px solid ${color}33`,
                  borderRadius: 4,
                  padding: '14px 16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Character side indicator */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    [isRight ? 'right' : 'left']: 0,
                    width: 3,
                    height: '100%',
                    background: color,
                    boxShadow: `0 0 8px ${color}66`,
                  }}
                />

                {/* Name + MBTI type */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.46rem',
                        color: '#555577',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      GRACZ {idx + 1}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-syne)',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        color,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 160,
                      }}
                    >
                      {name}
                    </div>
                  </div>
                  {/* Big MBTI badge */}
                  <div
                    style={{
                      background: `${color}22`,
                      border: `2px solid ${color}`,
                      borderRadius: 4,
                      padding: '6px 14px',
                      boxShadow: `0 0 16px ${color}33`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-syne)',
                        fontWeight: 900,
                        fontSize: '1.4rem',
                        color: '#ffffff',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {mbti.type}
                    </span>
                  </div>
                </div>

                {/* Dimension bars — health bar style */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(['ie', 'sn', 'tf', 'jp'] as const).map((dim) => {
                    const d = mbti.reasoning[dim];
                    const labels = DIMENSION_LABELS[dim];
                    const fullLabels = DIM_FULL[dim];
                    const isFirst = d.letter === labels[0];
                    const confidence = d.confidence;

                    return (
                      <div key={dim}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-geist-mono)',
                              fontSize: '0.42rem',
                              color: isFirst ? color : '#555577',
                              fontWeight: isFirst ? 700 : 400,
                            }}
                          >
                            {labels[0]} {fullLabels[0]}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-geist-mono)',
                              fontSize: '0.42rem',
                              color: !isFirst ? color : '#555577',
                              fontWeight: !isFirst ? 700 : 400,
                            }}
                          >
                            {fullLabels[1]} {labels[1]}
                          </span>
                        </div>
                        {/* Bar */}
                        <div
                          style={{
                            height: 6,
                            borderRadius: 1,
                            background: '#0a0a1a',
                            border: '1px solid #1a1a2e',
                            overflow: 'hidden',
                            display: 'flex',
                          }}
                        >
                          <div
                            style={{
                              width: `${isFirst ? confidence : 100 - confidence}%`,
                              height: '100%',
                              background: isFirst ? color : '#1a1a2e',
                            }}
                          />
                          <div
                            style={{
                              flex: 1,
                              height: '100%',
                              background: !isFirst ? color : '#1a1a2e',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Confidence */}
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.42rem',
                    color: '#555577',
                    textAlign: 'center',
                  }}
                >
                  POZIOM MOCY: {mbti.confidence}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#333355' }}>
            chatscope.app
          </span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#ff3366', textShadow: '0 0 6px rgba(255,51,102,0.3)' }}>
            WALKA!
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
