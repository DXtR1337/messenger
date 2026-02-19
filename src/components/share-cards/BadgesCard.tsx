'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { Badge } from '@/lib/parsers/types';

interface BadgesCardProps {
  badges: Badge[];
  participants: string[];
}

const TROPHY_RANKS = ['🥇', '🥈', '🥉', '🏅', '🎖️', '⭐'];

export default function BadgesCard({ badges, participants }: BadgesCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-badges', { backgroundColor: '#0a0505' });

  const displayBadges = badges.slice(0, 6);
  const remainingCount = badges.length - 6;

  const personColorMap: Record<string, string> = {};
  if (participants[0]) personColorMap[participants[0]] = '#6d9fff';
  if (participants[1]) personColorMap[participants[1]] = '#b38cff';

  const getPersonColor = (holder: string): string => {
    return personColorMap[holder] ?? '#a1a1aa';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#0a0505',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Velvet curtain gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(139,0,0,0.1) 0%, transparent 30%, transparent 70%, rgba(139,0,0,0.06) 100%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Spotlight */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 200,
            background: 'radial-gradient(circle, rgba(255,215,0,0.08), transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header — award ceremony */}
        <div
          style={{
            padding: '20px 16px 14px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>🏆</div>
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1rem',
              color: '#ffd700',
              textShadow: '0 0 20px rgba(255,215,0,0.4)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            GALA NAGRÓD
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#5a3a2a',
              letterSpacing: '0.1em',
              marginTop: 4,
            }}
          >
            PODTEKST PREZENTUJE • NAGRODY {new Date().getFullYear()}
          </div>
          {/* Gold divider */}
          <div
            style={{
              height: 1,
              margin: '12px 40px 0',
              background: 'linear-gradient(90deg, transparent, #ffd70066, transparent)',
            }}
          />
        </div>

        {/* Awards list */}
        <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 2 }}>
          {displayBadges.map((badge, i) => {
            const holderColor = getPersonColor(badge.holder);
            const trophy = TROPHY_RANKS[i] ?? '⭐';

            return (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '10px 12px',
                  background: i === 0 ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${i === 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Rank badge */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '1.3rem',
                  }}
                >
                  {trophy}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Badge name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: '0.9rem' }}>{badge.emoji}</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-syne)',
                        fontWeight: 700,
                        fontSize: '0.62rem',
                        color: i === 0 ? '#ffd700' : '#ededed',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {badge.name}
                    </span>
                  </div>

                  {/* Holder — "the award goes to..." */}
                  <div
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '0.46rem',
                      color: holderColor,
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ▸ {badge.holder}
                  </div>

                  {/* Evidence — small */}
                  <div
                    style={{
                      fontFamily: 'var(--font-space-grotesk)',
                      fontSize: '0.42rem',
                      color: '#5a5a5a',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {badge.evidence}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Remaining count */}
          {remainingCount > 0 && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.5rem',
                  color: '#5a3a2a',
                  letterSpacing: '0.06em',
                }}
              >
                +{remainingCount} więcej nagród
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px 16px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              height: 1,
              margin: '0 40px 10px',
              background: 'linear-gradient(90deg, transparent, #ffd70033, transparent)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#5a3a2a' }}>
              podtekst.app
            </span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#ffd700', textShadow: '0 0 6px rgba(255,215,0,0.3)' }}>
              ★ A WYGRYWA... ★
            </span>
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
