'use client';

import { useRef, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import type { RedFlag, GreenFlag } from '@/lib/analysis/types';

interface FlagsCardProps {
  redFlags: RedFlag[];
  greenFlags: GreenFlag[];
}

const SEVERITY_COLORS: Record<string, string> = {
  mild: '#fbbf24',
  moderate: '#fb923c',
  severe: '#ef4444',
};

const SEVERITY_LABELS: Record<string, string> = {
  mild: 'LEKKA',
  moderate: 'UMIARK.',
  severe: 'POWAZNA',
};

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export default function FlagsCard({ redFlags, greenFlags }: FlagsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-flags', {
    backgroundColor: '#b8895e',
  });

  const displayGreen = greenFlags.slice(0, 3);
  const displayRed = redFlags.slice(0, 3);

  const caseId = useMemo(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }, []);

  const rotations = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: 8 }, () => (rng() * 6 - 3));
  }, []);

  const conclusion = useMemo(() => {
    const r = displayRed.length;
    const g = displayGreen.length;
    if (r === 0 && g > 0) return 'Podejrzany czysty. Brak dowodow obciazajacych.';
    if (r > g) return 'Dowody obciazajace przewazaja. Zalecana ostroznosc.';
    if (g > r) return 'Wiecej dowodow laczacych niz kompromitujacych.';
    return 'Sprawa niejednoznaczna. Dalsze sledztwo wymagane.';
  }, [displayRed.length, displayGreen.length]);

  const corkNoiseSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: 'linear-gradient(160deg, #c4956a 0%, #b8895e 30%, #a87d5a 60%, #9e7352 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cork noise texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: corkNoiseSvg,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Cork grain spots */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 3px 2px at 15% 20%, rgba(80,50,20,0.15), transparent), radial-gradient(ellipse 4px 3px at 45% 35%, rgba(80,50,20,0.1), transparent), radial-gradient(ellipse 2px 3px at 75% 15%, rgba(80,50,20,0.12), transparent), radial-gradient(ellipse 3px 2px at 25% 65%, rgba(80,50,20,0.1), transparent), radial-gradient(ellipse 4px 2px at 85% 55%, rgba(80,50,20,0.08), transparent), radial-gradient(ellipse 2px 4px at 55% 80%, rgba(80,50,20,0.12), transparent), radial-gradient(ellipse 3px 3px at 35% 90%, rgba(80,50,20,0.1), transparent), radial-gradient(ellipse 2px 2px at 65% 45%, rgba(80,50,20,0.14), transparent)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header with red pushpin */}
        <div
          style={{
            padding: '14px 16px 10px',
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Red pushpin SVG */}
            <svg width="22" height="28" viewBox="0 0 22 28" fill="none" style={{ flexShrink: 0 }}>
              <ellipse cx="11" cy="24" rx="3" ry="1.5" fill="rgba(0,0,0,0.15)" />
              <line x1="11" y1="14" x2="11" y2="26" stroke="#888" strokeWidth="1.5" />
              <circle cx="11" cy="10" r="8" fill="#cc2222" />
              <circle cx="11" cy="10" r="6" fill="#dd3333" />
              <ellipse cx="9" cy="8" rx="2.5" ry="1.5" fill="rgba(255,255,255,0.25)" />
              <circle cx="11" cy="10" r="2" fill="#aa1111" />
            </svg>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 800,
                  fontSize: '1.0rem',
                  color: '#2a1a0a',
                  letterSpacing: '0.06em',
                  fontStyle: 'italic',
                  textShadow: '0 1px 0 rgba(255,255,255,0.15)',
                }}
              >
                SPRAWA: FLAGI RELACJI
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  color: '#5a3d22',
                  marginTop: 2,
                }}
              >
                AKTA DOCHODZENIA • POUFNE
              </div>
            </div>
          </div>

          {/* Manila folder tab / case file tag */}
          <div
            style={{
              position: 'relative',
              background: '#e8d5a3',
              padding: '4px 10px 4px 12px',
              borderRadius: '0 0 4px 4px',
              boxShadow: '1px 2px 4px rgba(0,0,0,0.2)',
              marginTop: -14,
              borderTop: '2px solid #d4c08a',
            }}
          >
            {/* Paperclip */}
            <svg width="14" height="24" viewBox="0 0 14 24" fill="none" style={{ position: 'absolute', top: -8, left: -6 }}>
              <path d="M4 2 C4 1, 10 1, 10 2 L10 18 C10 21, 4 21, 4 18 L4 6 C4 4, 8 4, 8 6 L8 16" stroke="#aaa" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.62rem',
                color: '#5a3d22',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              AKT NR {caseId}
            </span>
          </div>
        </div>

        {/* Two zones side by side */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: 8,
            padding: '4px 10px 0',
            position: 'relative',
            zIndex: 2,
            minHeight: 0,
          }}
        >
          {/* Left zone: ZIELONE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Green pushpin */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none" style={{ flexShrink: 0 }}>
                <line x1="7" y1="10" x2="7" y2="17" stroke="#777" strokeWidth="1" />
                <circle cx="7" cy="7" r="5.5" fill="#1a9a4a" />
                <circle cx="7" cy="7" r="4" fill="#22c55e" />
                <ellipse cx="5.5" cy="5.5" rx="1.8" ry="1" fill="rgba(255,255,255,0.3)" />
                <circle cx="7" cy="7" r="1.2" fill="#15803d" />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  color: '#1a5a2a',
                  letterSpacing: '0.08em',
                }}
              >
                ZIELONE
              </span>
            </div>

            {/* Green flag polaroid cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {displayGreen.map((flag, i) => {
                const rot = rotations[i] ?? 0;
                return (
                  <div
                    key={i}
                    style={{
                      background: '#fefdf8',
                      border: '4px solid #fefdf8',
                      borderBottom: '14px solid #fefdf8',
                      borderRadius: 1,
                      transform: `rotate(${rot}deg)`,
                      boxShadow: '2px 3px 8px rgba(0,0,0,0.25), 1px 1px 3px rgba(0,0,0,0.15)',
                      padding: '6px 7px 2px',
                      position: 'relative',
                    }}
                  >
                    {/* Pin dot at top */}
                    <div
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #5ae87a, #1a9a4a)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                      <span style={{ fontSize: '0.72rem', color: '#22c55e', flexShrink: 0, lineHeight: 1.3 }}>+</span>
                      <p
                        style={{
                          fontFamily: 'var(--font-space-grotesk)',
                          fontSize: '0.72rem',
                          color: '#2a2518',
                          margin: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {flag.pattern}
                      </p>
                    </div>
                  </div>
                );
              })}
              {displayGreen.length === 0 && (
                <div
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.68rem',
                    color: '#5a3d22',
                    fontStyle: 'italic',
                    padding: '8px 4px',
                  }}
                >
                  Brak dowodow laczacych
                </div>
              )}
            </div>
          </div>

          {/* Red string SVG connecting the two zones */}
          <svg
            width="20"
            height="100%"
            viewBox="0 0 20 400"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 3,
              opacity: 0.6,
            }}
          >
            <path
              d="M10 10 C5 60, 15 100, 10 150 S5 200, 10 250 S15 300, 10 350 S5 380, 10 400"
              stroke="#cc0000"
              strokeWidth="1.2"
              fill="none"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          </svg>

          {/* Right zone: CZERWONE */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Red pushpin */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none" style={{ flexShrink: 0 }}>
                <line x1="7" y1="10" x2="7" y2="17" stroke="#777" strokeWidth="1" />
                <circle cx="7" cy="7" r="5.5" fill="#cc2222" />
                <circle cx="7" cy="7" r="4" fill="#ef4444" />
                <ellipse cx="5.5" cy="5.5" rx="1.8" ry="1" fill="rgba(255,255,255,0.3)" />
                <circle cx="7" cy="7" r="1.2" fill="#b91c1c" />
              </svg>
              <span
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  color: '#7a1a1a',
                  letterSpacing: '0.08em',
                }}
              >
                CZERWONE
              </span>
            </div>

            {/* Red flag polaroid cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {displayRed.map((flag, i) => {
                const rot = rotations[i + 4] ?? 0;
                const sevColor = SEVERITY_COLORS[flag.severity] ?? '#fbbf24';
                const sevLabel = SEVERITY_LABELS[flag.severity] ?? flag.severity;
                return (
                  <div
                    key={i}
                    style={{
                      background: '#fefdf8',
                      border: '4px solid #fefdf8',
                      borderLeft: `4px solid ${sevColor}`,
                      borderBottom: '14px solid #fefdf8',
                      borderRadius: 1,
                      transform: `rotate(${rot}deg)`,
                      boxShadow: '2px 3px 8px rgba(0,0,0,0.25), 1px 1px 3px rgba(0,0,0,0.15)',
                      padding: '6px 7px 2px',
                      position: 'relative',
                    }}
                  >
                    {/* Pin dot at top */}
                    <div
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: 10,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 35% 35%, #ff6666, #cc2222)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                      }}
                    />
                    <p
                      style={{
                        fontFamily: 'var(--font-space-grotesk)',
                        fontSize: '0.72rem',
                        color: '#2a2518',
                        margin: 0,
                        lineHeight: 1.35,
                      }}
                    >
                      {flag.pattern}
                    </p>
                    {/* Severity badge */}
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.63rem',
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        background: sevColor,
                        borderRadius: 2,
                        padding: '1px 5px',
                        marginTop: 3,
                        fontWeight: 700,
                      }}
                    >
                      {sevLabel}
                    </span>
                  </div>
                );
              })}
              {displayRed.length === 0 && (
                <div
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.68rem',
                    color: '#5a3d22',
                    fontStyle: 'italic',
                    padding: '8px 4px',
                  }}
                >
                  Brak dowodow obciazajacych
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky note at bottom */}
        <div
          style={{
            margin: '8px 14px 12px',
            position: 'relative',
            zIndex: 4,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #fff4a3 0%, #ffef8a 40%, #ffe96e 100%)',
              padding: '10px 12px 14px',
              position: 'relative',
              boxShadow: '2px 3px 10px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.1)',
              transform: 'rotate(-0.8deg)',
            }}
          >
            {/* Curled corner effect */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 22,
                height: 22,
                background: 'linear-gradient(225deg, #c4956a 0%, #c4956a 45%, transparent 46%)',
                boxShadow: '-1px -1px 3px rgba(0,0,0,0.1)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 20,
                height: 20,
                background: 'linear-gradient(225deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.08) 45%, transparent 46%)',
              }}
            />
            {/* Tape at top */}
            <div
              style={{
                position: 'absolute',
                top: -5,
                left: '50%',
                transform: 'translateX(-50%) rotate(1deg)',
                width: 50,
                height: 12,
                background: 'rgba(255,255,255,0.35)',
                border: '0.5px solid rgba(200,200,200,0.3)',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '0.72rem',
                color: '#5a3d22',
                letterSpacing: '0.04em',
                marginBottom: 4,
                textTransform: 'uppercase',
              }}
            >
              WNIOSEK:
            </div>
            <p
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.72rem',
                color: '#3a2510',
                margin: 0,
                lineHeight: 1.45,
                marginBottom: 6,
                paddingRight: 22,
              }}
            >
              {conclusion}
            </p>
            <div
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.63rem',
                color: '#7a5a38',
                fontStyle: 'italic',
                textAlign: 'right',
                paddingRight: 24,
              }}
            >
              — Detektyw PodTeksT
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0 16px 10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: '#5a3d22',
              opacity: 0.7,
            }}
          >
            podtekst.app
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: '#7a2222',
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}
          >
            POUFNE
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
