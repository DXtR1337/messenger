'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { SubtextResult } from '@/lib/analysis/subtext';
import { CATEGORY_META } from '@/lib/analysis/subtext';

interface SubtextCardProps {
  subtextResult: SubtextResult;
  participants: string[];
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  deflection: '#d4a017',
  hidden_anger: '#cc0000',
  seeking_validation: '#8b5cf6',
  power_move: '#cc0000',
  genuine: '#33ff33',
  testing: '#f97316',
  guilt_trip: '#be185d',
  passive_aggressive: '#cc0000',
  love_signal: '#ec4899',
  insecurity: '#6366f1',
  distancing: '#64748b',
  humor_shield: '#d4a017',
};

export default function SubtextCard({ subtextResult, participants }: SubtextCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-translator');

  const { items, summary } = subtextResult;

  // Pick top 3-4 items: highlights first, then highest confidence
  const highlights = items.filter(i => i.isHighlight);
  const nonHighlights = items.filter(i => !i.isHighlight).sort((a, b) => b.confidence - a.confidence);
  const displayItems = [...highlights.slice(0, 2), ...nonHighlights.slice(0, Math.max(0, 2 - highlights.length))].slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          minHeight: 640,
          background: '#0a1208',
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        {/* Subtle grid lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(212,160,23,0.03) 1px, transparent 1px), ' +
              'linear-gradient(90deg, rgba(212,160,23,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
          }}
        />

        {/* Faint radio wave SVG curves in background */}
        <svg
          viewBox="0 0 360 640"
          fill="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <ellipse cx="320" cy="100" rx="80" ry="80" stroke="rgba(212,160,23,0.04)" strokeWidth="0.5" fill="none" />
          <ellipse cx="320" cy="100" rx="120" ry="120" stroke="rgba(212,160,23,0.03)" strokeWidth="0.5" fill="none" />
          <ellipse cx="320" cy="100" rx="160" ry="160" stroke="rgba(212,160,23,0.02)" strokeWidth="0.5" fill="none" />
          <ellipse cx="40" cy="540" rx="60" ry="60" stroke="rgba(212,160,23,0.04)" strokeWidth="0.5" fill="none" />
          <ellipse cx="40" cy="540" rx="100" ry="100" stroke="rgba(212,160,23,0.03)" strokeWidth="0.5" fill="none" />
          <ellipse cx="40" cy="540" rx="140" ry="140" stroke="rgba(212,160,23,0.02)" strokeWidth="0.5" fill="none" />
        </svg>

        {/* Red "SCISLE TAJNE" watermark (rotated) */}
        <div
          style={{
            position: 'absolute',
            top: '45%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-5deg)',
            fontFamily: 'var(--font-syne)',
            fontWeight: 800,
            fontSize: '2.2rem',
            letterSpacing: '0.15em',
            color: 'rgba(204,0,0,0.07)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            textTransform: 'uppercase',
          }}
        >
          SCISLE TAJNE
        </div>

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '22px 18px 16px',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontWeight: 800,
                fontSize: '1.1rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#d4a017',
                textShadow: '0 0 8px rgba(212,160,23,0.3)',
              }}
            >
              DEPESZA PRZECHWYCONA
            </div>
          </div>

          {/* Classification bar */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 12,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(212,160,23,0.15)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(212,160,23,0.55)',
                letterSpacing: '0.1em',
              }}
            >
              POZIOM: OMEGA &bull; DEKODOWANIE: UKONCZONE &bull; AGENT: AI-GEMINI
            </div>
          </div>

          {/* Intercept entries */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {displayItems.map((item, i) => {
              const meta = CATEGORY_META[item.category];
              const badgeColor = CATEGORY_BADGE_COLORS[item.category] ?? meta.color;

              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(10,18,8,0.8)',
                    border: '1px solid rgba(212,160,23,0.12)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Sender line */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.63rem',
                        fontWeight: 600,
                        color: 'rgba(212,160,23,0.6)',
                        letterSpacing: '0.08em',
                        wordBreak: 'break-word' as const,
                      }}
                    >
                      NADAWCA: {item.sender.split(' ')[0].toUpperCase()}
                    </div>
                    {/* Category badge */}
                    <div
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.63rem',
                        fontWeight: 700,
                        color: badgeColor,
                        background: `${badgeColor}15`,
                        border: `1px solid ${badgeColor}30`,
                        borderRadius: 9999,
                        padding: '1px 7px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {meta.label.toUpperCase()}
                    </div>
                  </div>

                  {/* Original message */}
                  <div
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '0.63rem',
                      fontWeight: 600,
                      color: 'rgba(212,160,23,0.45)',
                      letterSpacing: '0.06em',
                      marginBottom: 3,
                    }}
                  >
                    ORYGINAL:
                  </div>
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(212,160,23,0.08)',
                      borderRadius: 4,
                      padding: '5px 8px',
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.68rem',
                        color: 'rgba(255,255,255,0.55)',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        wordBreak: 'break-word' as const,
                      }}
                    >
                      &ldquo;{item.originalMessage}&rdquo;
                    </div>
                  </div>

                  {/* DEKODOWANO stamp + decoded meaning */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.63rem',
                        fontWeight: 800,
                        color: '#0a1208',
                        background: '#33ff33',
                        borderRadius: 2,
                        padding: '1px 4px',
                        flexShrink: 0,
                        marginTop: 2,
                        letterSpacing: '0.06em',
                      }}
                    >
                      DEKODOWANO
                    </div>
                    <div
                      style={{
                        background: 'rgba(51,255,51,0.06)',
                        border: '1px solid rgba(51,255,51,0.12)',
                        borderRadius: 4,
                        padding: '4px 7px',
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-space-grotesk)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#33ff33',
                          lineHeight: 1.35,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical' as const,
                          wordBreak: 'break-word' as const,
                        }}
                      >
                        &ldquo;{item.subtext}&rdquo;
                      </div>
                    </div>
                  </div>

                  {/* Confidence meter */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 5,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.63rem',
                        color: 'rgba(212,160,23,0.4)',
                        letterSpacing: '0.06em',
                        flexShrink: 0,
                      }}
                    >
                      PEWNOSC:
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        borderRadius: 2,
                        background: 'rgba(212,160,23,0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${item.confidence}%`,
                          height: '100%',
                          borderRadius: 2,
                          background: 'linear-gradient(90deg, #d4a017, #33ff33)',
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.63rem',
                        fontWeight: 700,
                        color: 'rgba(212,160,23,0.6)',
                        flexShrink: 0,
                      }}
                    >
                      {item.confidence}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 0 }} />

          {/* Deception scores */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid rgba(212,160,23,0.1)',
            }}
          >
            {participants.slice(0, 2).map(name => {
              const score = summary.deceptionScore[name] ?? 0;
              const color = score > 60 ? '#cc0000' : score > 40 ? '#d4a017' : '#33ff33';
              return (
                <div key={name} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '0.63rem',
                      color: 'rgba(212,160,23,0.45)',
                      letterSpacing: '0.06em',
                      marginBottom: 2,
                    }}
                  >
                    {name.split(' ')[0].toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-syne)',
                      fontSize: '1.3rem',
                      fontWeight: 800,
                      color,
                      lineHeight: 1,
                      textShadow: `0 0 8px ${color}44`,
                    }}
                  >
                    {score}%
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '0.63rem',
                      color: 'rgba(212,160,23,0.3)',
                      marginTop: 1,
                      letterSpacing: '0.04em',
                    }}
                  >
                    UKRYTYCH EMOCJI
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(212,160,23,0.2)',
                letterSpacing: '0.06em',
              }}
            >
              Departament Analizy Podtekstow &bull; Dzial Dekodowania &bull; PodTeksT
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: '#d4a017',
          background: 'rgba(212,160,23,0.06)',
          border: '1px solid rgba(212,160,23,0.2)',
          borderRadius: 8,
          padding: '8px 16px',
          cursor: isDownloading ? 'wait' : 'pointer',
          opacity: isDownloading ? 0.5 : 1,
        }}
      >
        {isDownloading ? 'Pobieranie...' : 'Pobierz PNG'}
      </button>
    </div>
  );
}
