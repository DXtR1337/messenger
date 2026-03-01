'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface ForecastCardProps {
  willTheyComeBack: number;
  perPerson: Record<string, {
    reboundRisk: number;
    growthPotential: number;
  }>;
}

function getReturnLabel(pct: number): string {
  if (pct >= 80) return 'Prawie pewne';
  if (pct >= 60) return 'Bardzo prawdopodobne';
  if (pct >= 40) return 'Możliwe';
  if (pct >= 20) return 'Mało prawdopodobne';
  return 'Zapomnij';
}

function getReturnColor(pct: number): string {
  if (pct >= 60) return '#e879f9';
  if (pct >= 40) return '#c084fc';
  if (pct >= 20) return '#a855f7';
  return '#7e22ce';
}

export default function ForecastCard({
  willTheyComeBack,
  perPerson,
}: ForecastCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const personEntries = Object.entries(perPerson).slice(0, 2);
  const returnColor = getReturnColor(willTheyComeBack);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(160deg, #0b0214 0%, #07000d 50%, #030008 100%)"
    >
      {/* Stone noise texture */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none', zIndex: 0, mixBlendMode: 'overlay' as const }}>
        <filter id="forecastNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={3} stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#forecastNoise)" />
      </svg>

      {/* Mystical nebula glows */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(124, 58, 237, 0.05) 40%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-5%',
          right: '-10%',
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232, 121, 249, 0.1) 0%, transparent 60%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          padding: '36px 24px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#d8b4fe',
              letterSpacing: '0.2em',
              marginBottom: 8,
              textTransform: 'uppercase' as const,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            Analiza Predykcyjna
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.6rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: '#ffffff',
              textTransform: 'uppercase' as const,
              textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(216, 180, 254, 0.6)',
              margin: 0,
            }}
          >
            Prognoza Powrotu
          </div>
        </div>

        {/* Holographic crystal ball SVG */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24, filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.2))' }}>
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <defs>
              <radialGradient id="auraGlow" cx="50%" cy="45%" r="50%">
                <stop offset="0%" stopColor="#e879f9" stopOpacity={0.4} />
                <stop offset="40%" stopColor="#a855f7" stopOpacity={0.1} />
                <stop offset="100%" stopColor="transparent" stopOpacity={0} />
              </radialGradient>
              <linearGradient id="ringGlow" x1="0" y1="0" x2="120" y2="120">
                <stop offset="0%" stopColor="#d8b4fe" />
                <stop offset="50%" stopColor="#7e22ce" />
                <stop offset="100%" stopColor="#3b0764" />
              </linearGradient>
            </defs>

            {/* Outer aura */}
            <circle cx="60" cy="50" r="45" fill="url(#auraGlow)" />

            {/* Holographic orbit rings */}
            <ellipse cx="60" cy="50" rx="42" ry="14" stroke="url(#ringGlow)" strokeWidth="1.5" fill="none" transform="rotate(-20 60 50)" opacity={0.6} />
            <ellipse cx="60" cy="50" rx="42" ry="14" stroke="#a855f7" strokeWidth="0.5" fill="none" transform="rotate(40 60 50)" opacity={0.4} />

            {/* Glass ball core */}
            <circle cx="60" cy="50" r="32" stroke="#c084fc" strokeWidth="1" opacity={0.5} fill="rgba(147, 51, 234, 0.05)" />
            <circle cx="60" cy="50" r="30" stroke="#d8b4fe" strokeWidth="0.5" opacity={0.3} strokeDasharray="2 4" />

            {/* Inner shimmer and stars */}
            <ellipse cx="50" cy="40" rx="14" ry="8" fill="#f5d0fe" opacity={0.15} transform="rotate(-15 50 40)" />
            <circle cx="45" cy="42" r="1.5" fill="#fdf4ff" opacity={0.8} />
            <circle cx="70" cy="35" r="1" fill="#e879f9" opacity={0.6} />
            <circle cx="65" cy="62" r="2" fill="#d8b4fe" opacity={0.4} />

            {/* Mystical base */}
            <path d="M 38,88 Q 38,82 46,82 L 74,82 Q 82,82 82,88 L 82,92 Q 82,96 74,96 L 46,96 Q 38,96 38,92 Z" fill="#2e1065" stroke="#7e22ce" strokeWidth="1" opacity={0.8} />
            <ellipse cx="60" cy="82" rx="18" ry="4" fill="#a855f7" opacity={0.3} />
          </svg>
        </div>

        {/* Giant percentage — the viral hook */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '4.8rem',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: '-0.05em',
              textShadow: `0 4px 12px rgba(0,0,0,0.8), 0 0 30px ${returnColor}, 0 0 80px ${returnColor}`,
              marginBottom: 8,
            }}
          >
            {willTheyComeBack}%
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#f3e8ff',
              fontStyle: 'italic',
              letterSpacing: '0.05em',
              textShadow: '0 2px 6px rgba(0,0,0,0.9)',
            }}
          >
            {getReturnLabel(willTheyComeBack)}
          </div>
        </div>

        {/* Per-person glassmorphism stat cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {personEntries.map(([name, stats]) => (
            <div
              key={name}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(192, 132, 252, 0.1)',
                borderRadius: 12,
                padding: 16,
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
              }}
            >
              {/* Name */}
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: 14,
                  letterSpacing: '0.05em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                {name}
              </div>

              {/* Rebound risk */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#e9d5ff',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase' as const,
                      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                    }}
                  >
                    Ryzyko powrotu
                  </span>
                  <span
                    style={{
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: '0.8rem',
                      color: '#ffffff',
                      fontWeight: 800,
                      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                    }}
                  >
                    {stats.reboundRisk}%
                  </span>
                </div>
                {/* Neon tube bar */}
                <div
                  style={{
                    height: 6,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 4,
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: 1,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, stats.reboundRisk)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #9333ea, #e879f9)',
                      borderRadius: 2,
                      boxShadow: '0 0 10px rgba(232, 121, 249, 0.8)',
                    }}
                  />
                </div>
              </div>

              {/* Growth potential */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#e9d5ff',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase' as const,
                      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                    }}
                  >
                    Potencjał rozwoju
                  </span>
                  <span
                    style={{
                      fontFamily: '"Courier New", Courier, monospace',
                      fontSize: '0.8rem',
                      color: '#ffffff',
                      fontWeight: 800,
                      textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                    }}
                  >
                    {stats.growthPotential}%
                  </span>
                </div>
                {/* Neon tube bar — green */}
                <div
                  style={{
                    height: 6,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: 4,
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    padding: 1,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, stats.growthPotential)}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #059669, #34d399)',
                      borderRadius: 2,
                      boxShadow: '0 0 10px rgba(52, 211, 153, 0.8)',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Brand footer */}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: 0.9,
          }}
        >
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.4em',
              color: '#d8b4fe',
              textTransform: 'uppercase' as const,
              textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(168,85,247,0.6)',
            }}
          >
            Podtekst.app
          </div>
        </div>
      </div>
    </ShareCardShell>
  );
}
