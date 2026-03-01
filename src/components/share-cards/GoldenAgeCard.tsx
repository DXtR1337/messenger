'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface GoldenAgeCardProps {
  periodStart: string;
  periodEnd: string;
  peakIntimacy: number;
  description: string;
  bestQuotes: string[];
}

function getIntimacyColor(score: number): string {
  if (score >= 80) return '#e6c875';
  if (score >= 60) return '#c49a6c';
  if (score >= 40) return '#8b7355';
  return '#6b5a45';
}

function ElegantDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '20px 0', opacity: 0.7 }}>
      <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5))' }} />
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M4 0L5.08 2.92L8 4L5.08 5.08L4 8L2.92 5.08L0 4L2.92 2.92L4 0Z" fill="#d4af37" opacity={0.8} />
      </svg>
      <div style={{ width: 60, height: 1, background: 'linear-gradient(270deg, transparent, rgba(212, 175, 55, 0.5))' }} />
    </div>
  );
}

export default function GoldenAgeCard({
  periodStart,
  periodEnd,
  peakIntimacy,
  description,
  bestQuotes,
}: GoldenAgeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const displayQuotes = bestQuotes.slice(0, 2);
  const intimacyColor = getIntimacyColor(peakIntimacy);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(170deg, #141007 0%, #0d0a04 50%, #050401 100%)"
    >
      {/* Golden ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, rgba(196, 154, 108, 0.05) 45%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Elegant arch frame */}
      <div
        style={{
          position: 'absolute',
          inset: 16,
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: '24px 24px 16px 16px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 22,
          border: '1px solid rgba(212, 175, 55, 0.08)',
          borderRadius: '18px 18px 10px 10px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main content */}
      <div
        style={{
          padding: '40px 28px 28px 28px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
          {/* Top ornament */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', opacity: 0.6 }}>
            <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
              <path d="M20 0L22 6L40 6L23 8L26 12L20 9L14 12L17 8L0 6L18 6L20 0Z" fill="#d4af37" />
            </svg>
          </div>

          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.55rem',
              color: '#a38a60',
              letterSpacing: '0.3em',
              marginBottom: 8,
              textTransform: 'uppercase' as const,
            }}
          >
            Karta Pamięci
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '2.1rem',
              fontWeight: 400,
              letterSpacing: '0.15em',
              color: '#e6c875',
              margin: 0,
              lineHeight: 1.1,
              textShadow: '0 4px 20px rgba(230, 200, 117, 0.2)',
            }}
          >
            ZŁOTY OKRES
          </div>

          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '0.9rem',
              color: '#c49a6c',
              fontStyle: 'italic',
              marginTop: 12,
              letterSpacing: '0.05em',
            }}
          >
            {periodStart} &mdash; {periodEnd}
          </div>
        </div>

        {/* Peak intimacy score — hero */}
        <div
          style={{
            textAlign: 'center',
            margin: '10px 0 20px 0',
            position: 'relative',
            background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.05) 0%, transparent 70%)',
            padding: '20px 0',
          }}
        >
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.5rem',
              color: '#8b7a63',
              letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
              marginBottom: 8,
            }}
          >
            Szczytowa Intymność
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '4.5rem',
                fontWeight: 300,
                color: intimacyColor,
                lineHeight: 0.9,
                textShadow: `0 8px 32px ${intimacyColor}40, 0 0 10px ${intimacyColor}20`,
                letterSpacing: '-0.02em',
              }}
            >
              {peakIntimacy}
            </span>
            <span
              style={{
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: '0.8rem',
                color: '#8b7a63',
                marginLeft: 4,
                marginTop: 8,
              }}
            >
              /100
            </span>
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '0.85rem',
            color: '#d1bfae',
            textAlign: 'center',
            lineHeight: 1.6,
            padding: '0 16px',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {description}
        </div>

        <ElegantDivider />

        {/* Best quotes */}
        {displayQuotes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
            {displayQuotes.map((quote, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  padding: '12px 16px',
                  background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.05) 0%, transparent 100%)',
                  borderLeft: '1px solid rgba(212, 175, 55, 0.4)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -4,
                    left: 8,
                    fontSize: '1.5rem',
                    fontFamily: 'Georgia, serif',
                    color: 'rgba(212, 175, 55, 0.2)',
                    lineHeight: 1,
                  }}
                >
                  &ldquo;
                </div>
                <div
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: '#c49a6c',
                    lineHeight: 1.5,
                    position: 'relative',
                    zIndex: 2,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}
                >
                  {quote}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: '100%',
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
              marginBottom: 8,
            }}
          />
          <span
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.45rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase' as const,
              color: '#8b7a63',
            }}
          >
            Archiwum &bull; PodTeksT
          </span>
        </div>
      </div>
    </ShareCardShell>
  );
}
