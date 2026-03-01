'use client';

import { useRef, type RefObject } from 'react';
import { useCardDownload } from './useCardDownload';
import type { PersonVerdict } from '@/lib/analysis/court-prompts';

interface MugshotCardProps {
  personVerdict: PersonVerdict;
  caseNumber: string;
  cardRef?: RefObject<HTMLDivElement | null>;
}

function getVerdictColors(verdict: PersonVerdict['verdict']): { text: string; bg: string; border: string } {
  switch (verdict) {
    case 'winny':
      return { text: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
    case 'niewinny':
      return { text: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' };
    case 'warunkowo':
      return { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' };
  }
}

export default function MugshotCard({ personVerdict, caseNumber, cardRef: externalRef }: MugshotCardProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const cardRef = externalRef ?? internalRef;
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-mugshot');
  const colors = getVerdictColors(personVerdict.verdict);

  const initials = personVerdict.name
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Height markers: lines at regular intervals
  const heightMarkers = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          minHeight: 640,
          background: '#1a1a1f',
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        {/* Subtle vertical noise lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.008) 7px, rgba(255,255,255,0.008) 8px)',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Police header bar */}
          <div
            style={{
              background: '#1e3a5f',
              padding: '10px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Shield badge SVG */}
              <svg width="28" height="32" viewBox="0 0 22 26" fill="none">
                <path
                  d="M11 0L22 5V12C22 19.18 17.16 25.12 11 26C4.84 25.12 0 19.18 0 12V5L11 0Z"
                  fill="rgba(255,255,255,0.15)"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="0.5"
                />
                <path
                  d="M11 3L19 7V12C19 17.52 15.16 22.24 11 23C6.84 22.24 3 17.52 3 12V7L11 3Z"
                  fill="rgba(30,58,95,0.8)"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="0.5"
                />
                {/* Star in shield */}
                <path
                  d="M11 7L12.5 10.5L16 11L13.5 13.5L14 17L11 15.5L8 17L8.5 13.5L6 11L9.5 10.5L11 7Z"
                  fill="rgba(255,255,255,0.4)"
                />
              </svg>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.85)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  KOMENDA GLOWNA
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: 'rgba(255,255,255,0.4)',
                    letterSpacing: '0.08em',
                  }}
                >
                  PODTEKST
                </div>
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.06em',
              }}
            >
              {caseNumber.replace('SPRAWA NR ', '')}
            </div>
          </div>

          {/* Mugshot frame section */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '12px 18px 0',
              flexShrink: 0,
            }}
          >
            {/* FRONT box */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.1em',
                  marginBottom: 4,
                }}
              >
                FRONT
              </div>
              <div
                style={{
                  width: '100%',
                  height: 140,
                  background: '#111115',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Height markers */}
                {heightMarkers.map(i => (
                  <div
                    key={`front-${i}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${(i + 1) * 12.5}%`,
                      height: 1,
                      background: 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
                {/* Right-side measurement ticks */}
                {heightMarkers.map(i => (
                  <div
                    key={`tick-front-${i}`}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: `${(i + 1) * 12.5}%`,
                      width: 8,
                      height: 1,
                      background: 'rgba(255,255,255,0.18)',
                    }}
                  />
                ))}
                {/* Large initial letter circle */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-syne)',
                      fontWeight: 800,
                      fontSize: '1.8rem',
                      color: 'rgba(255,255,255,0.35)',
                    }}
                  >
                    {initials}
                  </div>
                </div>
              </div>
            </div>

            {/* PROFIL box */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.1em',
                  marginBottom: 4,
                }}
              >
                PROFIL
              </div>
              <div
                style={{
                  width: '100%',
                  height: 140,
                  background: '#111115',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Height markers */}
                {heightMarkers.map(i => (
                  <div
                    key={`prof-${i}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${(i + 1) * 12.5}%`,
                      height: 1,
                      background: 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
                {/* Left-side measurement ticks */}
                {heightMarkers.map(i => (
                  <div
                    key={`tick-prof-${i}`}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: `${(i + 1) * 12.5}%`,
                      width: 8,
                      height: 1,
                      background: 'rgba(255,255,255,0.18)',
                    }}
                  />
                ))}
                {/* Profile silhouette - side view of head */}
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 70,
                    height: 70,
                    opacity: 0.28,
                  }}
                >
                  <path
                    d="M 55,15 Q 70,15 75,30 L 78,42 Q 80,50 75,55 L 72,58 Q 70,62 72,66 L 70,72 Q 65,80 55,82 L 50,83 L 50,95 L 40,95 L 40,83 Q 30,80 28,72 Q 27,65 30,58 Q 25,50 28,40 Q 30,25 42,18 Q 48,15 55,15 Z"
                    fill="rgba(255,255,255,0.6)"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Name placard */}
          <div
            style={{
              margin: '6px 18px 0',
              background: '#e8e4dc',
              borderRadius: 4,
              padding: '4px 12px',
              textAlign: 'center',
              border: '1px solid rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: '#111111',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {personVerdict.name}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: '#555555',
                letterSpacing: '0.06em',
                marginTop: 1,
              }}
            >
              {caseNumber}
            </div>
          </div>

          {/* Booking details */}
          <div
            style={{
              margin: '8px 18px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {/* IMIE */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.08em',
                  width: 70,
                  flexShrink: 0,
                }}
              >
                IMIE:
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.8)',
                }}
              >
                {personVerdict.name}
              </div>
            </div>

            {/* NR SPRAWY */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.08em',
                  width: 70,
                  flexShrink: 0,
                }}
              >
                NR SPRAWY:
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {caseNumber.replace('SPRAWA NR ', '')}
              </div>
            </div>

            {/* ZARZUT */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.08em',
                  width: 70,
                  flexShrink: 0,
                }}
              >
                ZARZUT:
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#ef4444',
                  lineHeight: 1.3,
                  flex: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  wordBreak: 'break-word' as const,
                }}
              >
                {personVerdict.mainCharge}
              </div>
            </div>

            {/* WYROK */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.08em',
                  width: 70,
                  flexShrink: 0,
                }}
              >
                WYROK:
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: colors.text,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 12px ${colors.text}44`,
                }}
              >
                {personVerdict.verdict.toUpperCase()}
              </div>
            </div>

            {/* KARA */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.08em',
                  width: 70,
                  flexShrink: 0,
                }}
              >
                KARA:
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: 1.35,
                  flex: 1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                  wordBreak: 'break-word' as const,
                }}
              >
                {personVerdict.sentence}
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* ROZSTRZYGNIĘTE stamp overlay */}
          <div
            style={{
              position: 'absolute',
              top: '52%',
              right: 20,
              transform: 'rotate(-18deg)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '3px solid rgba(239,68,68,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
              }}
            >
              <div
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: '50%',
                  border: '1px solid rgba(239,68,68,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    color: 'rgba(239,68,68,0.38)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    lineHeight: 1.2,
                  }}
                >
                  ROZSTRZY-
                  <br />
                  GNIETE
                </div>
              </div>
            </div>
          </div>

          {/* Fingerprint strip */}
          <div
            style={{
              padding: '8px 18px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              flexShrink: 0,
            }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="24" height="24" viewBox="0 0 24 24" fill="none">
                {/* Fingerprint-like concentric arcs */}
                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" fill="none" />
                <path
                  d="M 8,16 Q 6,12 8,8 Q 10,5 14,5 Q 18,5 18,10"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="0.5"
                  fill="none"
                />
                <path
                  d="M 9,15 Q 7.5,12 9,9 Q 10.5,6.5 13,6.5 Q 16,6.5 16.5,10"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="0.5"
                  fill="none"
                />
                <path
                  d="M 10,14 Q 9,12 10,10 Q 11,8 13,8 Q 15,8 15,10.5"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="0.5"
                  fill="none"
                />
                <path
                  d="M 11,13 Q 10.5,12 11,11 Q 11.5,9.5 13,9.5 Q 14,9.5 14,11"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="0.5"
                  fill="none"
                />
                <ellipse cx="12" cy="14" rx="1" ry="1.5" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" fill="none" />
              </svg>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              paddingBottom: 10,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.06em',
              }}
            >
              Akta nr {caseNumber.replace('SPRAWA NR ', '')} &bull; Archiwum PodTeksT &bull; 2026
            </div>
          </div>
        </div>
      </div>

      {!externalRef && (
        <button
          onClick={download}
          disabled={isDownloading}
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: '#a1a1aa',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: isDownloading ? 'wait' : 'pointer',
            opacity: isDownloading ? 0.5 : 1,
          }}
        >
          {isDownloading ? 'Pobieranie...' : 'Pobierz kartę'}
        </button>
      )}
    </div>
  );
}
