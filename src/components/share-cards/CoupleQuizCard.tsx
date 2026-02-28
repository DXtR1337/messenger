'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { CoupleQuizComparison } from '@/lib/analysis/couple-quiz';

interface CoupleQuizCardProps {
  comparison: CoupleQuizComparison;
}

// ============================================================
// Constants
// ============================================================

const BG = '#0a0a14';
const BLUE = '#3b82f6';
const PURPLE = '#a855f7';
const SPOT_GOLD = '#ffd700';
const SYNE = 'var(--font-syne)';
const MONO = 'var(--font-geist-mono)';
const GROTESK = 'var(--font-space-grotesk)';

// ============================================================
// Component
// ============================================================

export default function CoupleQuizCard({ comparison }: CoupleQuizCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-couple-quiz', {
    backgroundColor: BG,
  });

  const { personA, personB, awarenessWinner, delusionGap, agreementRate, perQuestion } = comparison;
  const nameA = personA.name.split(' ')[0] ?? 'A';
  const nameB = personB.name.split(' ')[0] ?? 'B';
  const scoreA = personA.result.score;
  const scoreB = personB.result.score;
  const isTie = awarenessWinner === 'tie';
  const winnerName = isTie ? null : (awarenessWinner === personA.name ? nameA : nameB);
  const totalQ = perQuestion.length;
  const matchCount = perQuestion.filter((q) => q.agree).length;
  const matchPct = totalQ > 0 ? Math.round((matchCount / totalQ) * 100) : 0;
  const agreePct = Math.round(agreementRate * 100);

  // LED dot count on podium edge
  const ledCount = 6;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: BG,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Spotlight gradient from top */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 300,
            height: 300,
            background: `radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.1) 0%, rgba(255,215,0,0.04) 35%, transparent 65%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {/* Stage floor glow */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            background: `linear-gradient(180deg, transparent 0%, rgba(255,215,0,0.05) 60%, rgba(255,215,0,0.08) 100%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '22px 20px 16px',
          }}
        >
          {/* Header - Neon style */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div
              style={{
                fontFamily: SYNE,
                fontWeight: 900,
                fontSize: '1.2rem',
                color: SPOT_GOLD,
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                textShadow: `0 0 10px ${SPOT_GOLD}55, 0 0 30px ${SPOT_GOLD}22, 0 0 60px ${SPOT_GOLD}11`,
              }}
            >
              TELETURNIEJ PODTEKST
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.68rem',
                color: `${SPOT_GOLD}88`,
                letterSpacing: '0.25em',
                marginTop: 4,
                textShadow: `0 0 8px ${SPOT_GOLD}33`,
              }}
            >
              {'✦ WYNIKI ✦'}
            </div>
          </div>

          {/* Two contestant podiums */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              marginBottom: 14,
              flex: 1,
              alignItems: 'center',
            }}
          >
            {/* Podium A */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: 130 }}>
              {/* Crown for winner */}
              <div style={{ height: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {!isTie && awarenessWinner === personA.name && (
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{'\uD83D\uDC51'}</span>
                )}
                {isTie && (
                  <span style={{ fontFamily: MONO, fontSize: '0.63rem', color: `${SPOT_GOLD}88` }}>{'='}</span>
                )}
              </div>

              {/* Winner banner */}
              {!isTie && awarenessWinner === personA.name && (
                <div
                  style={{
                    fontFamily: SYNE,
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    color: SPOT_GOLD,
                    letterSpacing: '0.14em',
                    marginBottom: 4,
                    textShadow: `0 0 6px ${SPOT_GOLD}44`,
                  }}
                >
                  ZWYCIĘZCA!
                </div>
              )}
              {isTie && (
                <div
                  style={{
                    fontFamily: SYNE,
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    color: SPOT_GOLD,
                    letterSpacing: '0.14em',
                    marginBottom: 4,
                    textShadow: `0 0 6px ${SPOT_GOLD}44`,
                  }}
                >
                  REMIS!
                </div>
              )}
              {!isTie && awarenessWinner !== personA.name && (
                <div style={{ height: 18 }} />
              )}

              {/* Score */}
              <div
                style={{
                  fontFamily: SYNE,
                  fontWeight: 900,
                  fontSize: '2.5rem',
                  lineHeight: 1,
                  color: '#ffffff',
                  textShadow: `0 0 20px ${BLUE}44`,
                }}
              >
                {scoreA}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                pkt
              </div>

              {/* Podium block */}
              <div
                style={{
                  width: 110,
                  height: 70,
                  background: `linear-gradient(180deg, ${BLUE}22 0%, ${BLUE}44 100%)`,
                  border: `1px solid ${BLUE}66`,
                  borderRadius: '4px 4px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Name plate */}
                <div
                  style={{
                    background: `${BLUE}33`,
                    border: `1px solid ${BLUE}66`,
                    borderRadius: 3,
                    padding: '4px 14px',
                    boxShadow: `0 0 8px ${BLUE}22`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: SYNE,
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {nameA}
                  </span>
                </div>

                {/* LED strip on bottom edge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    padding: '0 8px',
                    height: 6,
                    alignItems: 'center',
                  }}
                >
                  {Array.from({ length: ledCount }).map((_, i) => (
                    <div
                      key={`led-a-${i}`}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: BLUE,
                        boxShadow: `0 0 4px ${BLUE}`,
                        opacity: 0.7 + (i % 2) * 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* VS divider */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                alignSelf: 'center',
                marginTop: 40,
              }}
            >
              <div
                style={{
                  fontFamily: SYNE,
                  fontWeight: 900,
                  fontSize: '0.92rem',
                  color: 'rgba(255,255,255,0.15)',
                  letterSpacing: '0.08em',
                }}
              >
                VS
              </div>
            </div>

            {/* Podium B */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: 130 }}>
              {/* Crown for winner */}
              <div style={{ height: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {!isTie && awarenessWinner === personB.name && (
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{'\uD83D\uDC51'}</span>
                )}
                {isTie && (
                  <span style={{ fontFamily: MONO, fontSize: '0.63rem', color: `${SPOT_GOLD}88` }}>{'='}</span>
                )}
              </div>

              {/* Winner banner */}
              {!isTie && awarenessWinner === personB.name && (
                <div
                  style={{
                    fontFamily: SYNE,
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    color: SPOT_GOLD,
                    letterSpacing: '0.14em',
                    marginBottom: 4,
                    textShadow: `0 0 6px ${SPOT_GOLD}44`,
                  }}
                >
                  ZWYCIĘZCA!
                </div>
              )}
              {isTie && (
                <div
                  style={{
                    fontFamily: SYNE,
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    color: SPOT_GOLD,
                    letterSpacing: '0.14em',
                    marginBottom: 4,
                    textShadow: `0 0 6px ${SPOT_GOLD}44`,
                    visibility: 'hidden' as const,
                  }}
                >
                  REMIS!
                </div>
              )}
              {!isTie && awarenessWinner !== personB.name && (
                <div style={{ height: 18 }} />
              )}

              {/* Score */}
              <div
                style={{
                  fontFamily: SYNE,
                  fontWeight: 900,
                  fontSize: '2.5rem',
                  lineHeight: 1,
                  color: '#ffffff',
                  textShadow: `0 0 20px ${PURPLE}44`,
                }}
              >
                {scoreB}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.65rem',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                pkt
              </div>

              {/* Podium block */}
              <div
                style={{
                  width: 110,
                  height: 70,
                  background: `linear-gradient(180deg, ${PURPLE}22 0%, ${PURPLE}44 100%)`,
                  border: `1px solid ${PURPLE}66`,
                  borderRadius: '4px 4px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {/* Name plate */}
                <div
                  style={{
                    background: `${PURPLE}33`,
                    border: `1px solid ${PURPLE}66`,
                    borderRadius: 3,
                    padding: '4px 14px',
                    boxShadow: `0 0 8px ${PURPLE}22`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: SYNE,
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {nameB}
                  </span>
                </div>

                {/* LED strip on bottom edge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    padding: '0 8px',
                    height: 6,
                    alignItems: 'center',
                  }}
                >
                  {Array.from({ length: ledCount }).map((_, i) => (
                    <div
                      key={`led-b-${i}`}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: PURPLE,
                        boxShadow: `0 0 4px ${PURPLE}`,
                        opacity: 0.7 + (i % 2) * 0.3,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Answer comparison strip */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                marginBottom: 6,
                textAlign: 'center',
              }}
            >
              ODPOWIEDZI
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 3,
                flexWrap: 'wrap',
              }}
            >
              {perQuestion.slice(0, 15).map((q, i) => {
                const isMatch = q.agree;
                return (
                  <div
                    key={i}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      border: isMatch ? `1px solid ${SPOT_GOLD}66` : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isMatch ? (
                      /* Gold fill + check for agreement */
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: `${SPOT_GOLD}44`,
                          boxShadow: `inset 0 0 4px ${SPOT_GOLD}22`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: '0.63rem', color: SPOT_GOLD, lineHeight: 1 }}>{'\u2713'}</span>
                      </div>
                    ) : (
                      /* Dark fill for disagreement */
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: '#333333',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend for answer squares */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginTop: 5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 1,
                    background: `${SPOT_GOLD}44`,
                    border: `1px solid ${SPOT_GOLD}66`,
                  }}
                />
                <span style={{ fontFamily: MONO, fontSize: '0.63rem', color: 'rgba(255,255,255,0.5)' }}>
                  zgodność
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 1,
                    background: '#333333',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
                <span style={{ fontFamily: MONO, fontSize: '0.63rem', color: 'rgba(255,255,255,0.5)' }}>
                  różnica
                </span>
              </div>
            </div>
          </div>

          {/* Stats ticker (lower third) */}
          <div
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.04em',
              }}
            >
              Zgodność: <span style={{ color: SPOT_GOLD, fontWeight: 800 }}>{agreePct}%</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: MONO, fontSize: '0.75rem' }}>
              {'\u2022'}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.04em',
              }}
            >
              Pytań: <span style={{ color: '#ffffff', fontWeight: 800 }}>{totalQ}</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: MONO, fontSize: '0.75rem' }}>
              {'\u2022'}
            </span>
            <span
              style={{
                fontFamily: MONO,
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.04em',
              }}
            >
              Gap: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800 }}>{delusionGap}</span>
            </span>
          </div>

          {/* Applause meter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.06em',
              }}
            >
              PUBLICZNOŚĆ:
            </span>
            {/* Bar */}
            <div
              style={{
                width: 100,
                height: 6,
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${matchPct}%`,
                  height: '100%',
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${SPOT_GOLD}88, ${SPOT_GOLD})`,
                  boxShadow: `0 0 6px ${SPOT_GOLD}44`,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: `${SPOT_GOLD}cc`,
                fontWeight: 700,
              }}
            >
              {matchPct}%
            </span>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              marginTop: 'auto',
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.15)',
                letterSpacing: '0.06em',
              }}
            >
              podtekst.app
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: GROTESK,
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
