'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface AutopsyCardProps {
  causeOfDeath: string;
  turningPointDate: string;
  epitaph: string;
  wasItPreventable: boolean;
  healthScore?: number;
}

function getHealthLabel(score: number): string {
  if (score >= 70) return 'STABILNY';
  if (score >= 45) return 'OSŁABIONY';
  if (score >= 20) return 'KRYTYCZNY';
  return 'MARTWY';
}

export default function AutopsyCard({
  causeOfDeath,
  turningPointDate,
  epitaph,
  wasItPreventable,
  healthScore,
}: AutopsyCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const mint = '#34d399';
  const teal = '#2dd4bf';
  const rose = '#fb7185';
  const amber = '#fbbf24';
  const textSecondary = '#94a3b8';

  const isCritical = (healthScore ?? 0) < 30;
  const healthColor = isCritical ? rose : (healthScore ?? 0) >= 60 ? mint : amber;

  // Glassmorphism reusable styles
  const glassPanel: React.CSSProperties = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.12)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
    borderRight: '1px solid rgba(255, 255, 255, 0.02)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(180deg, #090e17 0%, #02040a 100%)"
    >
      {/* Laboratory dot grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '12px 12px',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Spatial ambient glows */}
      <div
        style={{
          position: 'absolute',
          top: '-5%',
          left: '20%',
          width: 250,
          height: 250,
          background: `radial-gradient(circle, ${teal}1A 0%, transparent 70%)`,
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '-10%',
          width: 300,
          height: 300,
          background: `radial-gradient(circle, ${healthColor}1A 0%, transparent 70%)`,
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main content */}
      <div
        style={{
          padding: '36px 24px 28px 24px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Header with spatial medical cross */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div
            style={{
              ...glassPanel,
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M8 0H12V8H20V12H12V20H8V12H0V8H8V0Z"
                fill="url(#crossGrad)"
                opacity={0.9}
              />
              <defs>
                <linearGradient id="crossGrad" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ffffff" />
                  <stop offset="1" stopColor={teal} />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '0.2em',
              color: '#cdd5e0',
              textTransform: 'uppercase' as const,
              margin: '0 0 6px 0',
            }}
          >
            Raport Z Sekcji
          </div>
          <div
            style={{
              fontSize: '0.65rem',
              color: textSecondary,
              letterSpacing: '0.15em',
              textTransform: 'uppercase' as const,
              fontWeight: 600,
            }}
          >
            Analiza Kliniczna
          </div>
        </div>

        {/* Cause of Death — glass panel */}
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: '0.55rem',
              color: textSecondary,
              letterSpacing: '0.15em',
              marginBottom: 8,
              textTransform: 'uppercase' as const,
              fontWeight: 700,
              paddingLeft: 8,
            }}
          >
            Bezpośrednia Przyczyna
          </div>
          <div
            style={{
              ...glassPanel,
              padding: '18px 20px',
              borderLeft: `3px solid ${isCritical ? rose : teal}`,
            }}
          >
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '0.95rem',
                color: '#ffffff',
                lineHeight: 1.5,
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const,
              }}
            >
              {causeOfDeath}
            </div>
          </div>
        </div>

        {/* Data grid: Turning Point + Preventable */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, ...glassPanel, padding: 16 }}>
            <div
              style={{
                fontSize: '0.5rem',
                color: textSecondary,
                letterSpacing: '0.15em',
                marginBottom: 8,
                textTransform: 'uppercase' as const,
                fontWeight: 700,
              }}
            >
              Punkt Zwrotny
            </div>
            <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>
              {turningPointDate}
            </div>
          </div>

          <div style={{ flex: 1, ...glassPanel, padding: 16 }}>
            <div
              style={{
                fontSize: '0.5rem',
                color: textSecondary,
                letterSpacing: '0.15em',
                marginBottom: 8,
                textTransform: 'uppercase' as const,
                fontWeight: 700,
              }}
            >
              Zapobiegalne
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 800,
                color: wasItPreventable ? rose : teal,
                textShadow: `0 0 16px ${wasItPreventable ? rose : teal}60`,
              }}
            >
              {wasItPreventable ? 'TAK' : 'NIE'}
            </div>
          </div>
        </div>

        {/* Health gauge — volumetric pill */}
        {healthScore !== undefined && (
          <div style={{ ...glassPanel, marginBottom: 24, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span
                style={{
                  fontSize: '0.55rem',
                  color: textSecondary,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                  fontWeight: 700,
                }}
              >
                Witalność Relacji
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  color: healthColor,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {getHealthLabel(healthScore)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  flex: 1,
                  height: 10,
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(255,255,255,0.05)',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, healthScore))}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${healthColor}40 0%, ${healthColor} 100%)`,
                    borderRadius: 10,
                    boxShadow: `0 0 12px ${healthColor}90`,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  minWidth: 44,
                  textAlign: 'right' as const,
                }}
              >
                {healthScore}
                <span style={{ fontSize: '0.75rem', color: textSecondary, marginLeft: 2 }}>%</span>
              </div>
            </div>
          </div>
        )}

        {/* Epitaph — immersive quote */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 24px',
            position: 'relative',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              fontSize: '0.9rem',
              color: '#cbd5e1',
              lineHeight: 1.7,
              fontStyle: 'italic',
              position: 'relative',
              zIndex: 1,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical' as const,
            }}
          >
            &ldquo;{epitaph}&rdquo;
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '0.5rem',
              letterSpacing: '0.3em',
              color: textSecondary,
              opacity: 0.5,
              textTransform: 'uppercase' as const,
              fontWeight: 700,
            }}
          >
            Podtekst.app
          </span>
        </div>
      </div>
    </ShareCardShell>
  );
}
