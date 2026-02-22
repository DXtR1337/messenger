'use client';

import { useRef, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import type { Badge } from '@/lib/parsers/types';

interface BadgesCardProps {
  badges: Badge[];
  participants: string[];
}

const MEDAL_GRADIENTS: Array<{ start: string; end: string; ribbon: string }> = [
  { start: '#ffd700', end: '#b8860b', ribbon: '#8b0000' },
  { start: '#ffd700', end: '#b8860b', ribbon: '#8b0000' },
  { start: '#d0d0d0', end: '#808080', ribbon: '#1a3a6a' },
  { start: '#d0d0d0', end: '#808080', ribbon: '#1a3a6a' },
  { start: '#cd7f32', end: '#8b4513', ribbon: '#2d4a2d' },
  { start: '#cd7f32', end: '#8b4513', ribbon: '#2d4a2d' },
];

export default function BadgesCard({ badges, participants }: BadgesCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-badges', { backgroundColor: '#0a0e1f' });

  const displayBadges = badges.slice(0, 6);
  const remainingCount = Math.max(0, badges.length - 6);

  const certId = useMemo(() => {
    const num = Math.floor(Math.random() * 9000) + 1000;
    return `PT/${num}/2026`;
  }, []);

  const personColorMap: Record<string, string> = {};
  if (participants[0]) personColorMap[participants[0]] = '#6d9fff';
  if (participants[1]) personColorMap[participants[1]] = '#b38cff';
  const getPersonColor = (holder: string): string => personColorMap[holder] ?? '#a1a1aa';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#0a0e1f',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Velvet fabric texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(20,25,50,0.3) 4px, rgba(20,25,50,0.3) 5px)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Gold inner border */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            bottom: 8,
            border: '1px solid rgba(212,168,71,0.2)',
            pointerEvents: 'none',
            zIndex: 12,
          }}
        />

        {/* SVG ribbon bar across top */}
        <div style={{ position: 'relative', zIndex: 2, padding: '16px 16px 0' }}>
          <svg width="328" height="12" viewBox="0 0 328 12" style={{ display: 'block', margin: '0 auto' }}>
            <rect x="0" y="4" width="328" height="4" fill="rgba(212,168,71,0.15)" rx="2" />
            {displayBadges.map((_, i) => {
              const x = 28 + i * 56;
              return (
                <circle key={i} cx={x} cy="6" r="5" fill="rgba(212,168,71,0.25)" stroke="rgba(212,168,71,0.4)" strokeWidth="1" />
              );
            })}
          </svg>
        </div>

        {/* Header */}
        <div
          style={{
            padding: '12px 16px 8px',
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
              color: '#d4a847',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textShadow: '0 0 2px #d4a847, 0 1px 0 #b8860b',
            }}
          >
            MEDALE ZASŁUGI
          </div>
          <div
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.65rem',
              color: 'rgba(212,168,71,0.5)',
              letterSpacing: '0.06em',
              marginTop: 4,
            }}
          >
            Przyznane za wybitne osiągnięcia konwersacyjne
          </div>
          {/* Gold divider */}
          <div
            style={{
              height: 1,
              margin: '10px 50px 0',
              background: 'linear-gradient(90deg, transparent, rgba(212,168,71,0.4), transparent)',
            }}
          />
        </div>

        {/* Medal grid 2x3 */}
        <div
          style={{
            flex: 1,
            padding: '8px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: 8,
            position: 'relative',
            zIndex: 2,
          }}
        >
          {displayBadges.map((badge, i) => {
            const medal = MEDAL_GRADIENTS[i] ?? MEDAL_GRADIENTS[5];
            const holderColor = getPersonColor(badge.holder);

            return (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 4px 4px',
                  position: 'relative',
                  boxShadow: '0 0 12px rgba(205,127,50,0.15)',
                  overflow: 'hidden',
                  minWidth: 0,
                }}
              >
                {/* Medal SVG circle */}
                <svg width="46" height="58" viewBox="0 0 44 56" style={{ flexShrink: 0 }}>
                  <defs>
                    <linearGradient id={`medal-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={medal.start} />
                      <stop offset="100%" stopColor={medal.end} />
                    </linearGradient>
                    <radialGradient id={`medal-shine-${i}`} cx="0.35" cy="0.3" r="0.85">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                    </radialGradient>
                  </defs>
                  {/* Ribbon tails */}
                  <polygon points="14,36 22,42 22,55 10,48" fill={medal.ribbon} opacity="0.8" />
                  <polygon points="30,36 22,42 22,55 34,48" fill={medal.ribbon} opacity="0.85" />
                  {/* Medal outer circle */}
                  <circle cx="22" cy="20" r="18" fill={`url(#medal-grad-${i})`} />
                  {/* Shine overlay */}
                  <circle cx="22" cy="20" r="18" fill={`url(#medal-shine-${i})`} />
                  {/* Inner circle for emoji */}
                  <circle cx="22" cy="20" r="13" fill="rgba(10,14,31,0.6)" stroke={medal.start} strokeWidth="0.5" />
                  {/* Emoji text */}
                  <text x="22" y="25" textAnchor="middle" fontSize="14" dominantBaseline="middle" dy="-1">
                    {badge.emoji}
                  </text>
                </svg>

                {/* Badge title */}
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    color: '#ededed',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    marginTop: 2,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {badge.name}
                </div>

                {/* Holder name */}
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: holderColor,
                    textAlign: 'center',
                    marginTop: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                >
                  {badge.holder}
                </div>

                {/* Evidence snippet */}
                <div
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.63rem',
                    color: 'rgba(212,168,71,0.35)',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    marginTop: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                >
                  {badge.evidence}
                </div>
              </div>
            );
          })}
        </div>

        {/* Remaining count */}
        {remainingCount > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '0 16px 4px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.75rem',
                color: 'rgba(212,168,71,0.65)',
                letterSpacing: '0.04em',
              }}
            >
              ...i jeszcze {remainingCount} odznaczeń
            </span>
          </div>
        )}

        {/* Footer: certificate number + brand */}
        <div
          style={{
            padding: '8px 16px 14px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              height: 1,
              margin: '0 40px 8px',
              background: 'linear-gradient(90deg, transparent, rgba(212,168,71,0.3), transparent)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(212,168,71,0.3)',
                letterSpacing: '0.04em',
              }}
            >
              Certyfikat nr {certId}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(212,168,71,0.3)',
              }}
            >
              podtekst.app
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
