'use client';

import { useRef } from 'react';
import ShareCardShell from '@/components/share-cards/ShareCardShell';

interface DecayPhasesCardProps {
  phases: Array<{
    name: string;
    periodStart: string;
    periodEnd: string;
  }>;
}

function getPhaseColor(index: number, total: number): string {
  if (total <= 1) return 'hsl(10, 80%, 40%)';
  const t = index / (total - 1);
  const hue = Math.round(45 - t * 45);
  const lightness = Math.round(65 - t * 30);
  return `hsl(${hue}, 90%, ${lightness}%)`;
}

export default function DecayPhasesCard({ phases }: DecayPhasesCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const displayPhases = phases.slice(0, 6);

  return (
    <ShareCardShell
      cardRef={cardRef}
      gradient="linear-gradient(180deg, #120505 0%, #080101 50%, #030000 100%)"
    >
      {/* Grain texture */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.25,
          pointerEvents: 'none',
          zIndex: 0,
          borderRadius: 20,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="noiseDecay">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseDecay)" />
      </svg>

      {/* Blood nebula left */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '-10%',
          width: 250,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(153,27,27,0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Blood nebula bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(220,38,38,0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 6, position: 'relative', zIndex: 1 }}>
        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1.6rem',
            fontWeight: 400,
            letterSpacing: '0.25em',
            color: '#fca5a5',
            textTransform: 'uppercase' as const,
            textShadow: '0 0 24px rgba(248,113,113,0.6)',
            marginBottom: 6,
          }}
        >
          Fazy Rozpadu
        </h1>
        <div
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '0.6rem',
            color: '#991b1b',
            letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
          }}
        >
          Chronologia Upadku
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3), transparent)',
          marginBottom: 32,
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Vertical timeline */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          paddingLeft: 8,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {displayPhases.map((phase, i) => {
          const color = getPhaseColor(i, displayPhases.length);
          const nextColor = getPhaseColor(Math.min(i + 1, displayPhases.length - 1), displayPhases.length);
          const isLast = i === displayPhases.length - 1;

          return (
            <div key={i} style={{ display: 'flex', gap: 20, position: 'relative', minHeight: 64 }}>
              {/* Node + connector line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                {/* Glowing dot */}
                <div
                  style={{
                    position: 'relative',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  {/* Outer glow */}
                  <div
                    style={{
                      position: 'absolute',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: color,
                      filter: 'blur(8px)',
                      opacity: 0.6,
                    }}
                  />
                  {/* Ring */}
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      border: `2px solid ${color}`,
                      background: '#0a0000',
                      zIndex: 1,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {/* Inner ember */}
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: color,
                        boxShadow: `0 0 4px ${color}`,
                      }}
                    />
                  </div>
                </div>

                {/* Gradient connector line */}
                {!isLast && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      marginTop: 4,
                      marginBottom: 4,
                      background: `linear-gradient(180deg, ${color}, ${nextColor})`,
                      opacity: 0.5,
                      boxShadow: `0 0 8px ${color}`,
                    }}
                  />
                )}
              </div>

              {/* Phase content */}
              <div
                style={{
                  paddingBottom: isLast ? 0 : 24,
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  paddingTop: 1,
                }}
              >
                <div
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '1.05rem',
                    fontWeight: 400,
                    color: color,
                    marginBottom: 6,
                    lineHeight: 1.2,
                    textShadow: `0 0 12px ${color}`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '0.02em',
                  }}
                >
                  {phase.name}
                </div>
                <div
                  style={{
                    fontFamily: '"Courier New", Courier, monospace',
                    fontSize: '0.65rem',
                    color: '#7f1d1d',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                  }}
                >
                  {phase.periodStart} &mdash; {phase.periodEnd}
                </div>
              </div>
            </div>
          );
        })}

        {/* Skull terminus */}
        <div style={{ display: 'flex', gap: 20, position: 'relative', marginTop: 8 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 20,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                color: '#7f1d1d',
                textShadow: '0 0 16px rgba(220,38,38,0.8)',
              }}
            >
              {'\u2620'}
            </div>
          </div>
          <div
            style={{
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: '0.7rem',
              color: '#7f1d1d',
              fontStyle: 'italic',
              paddingTop: 4,
              letterSpacing: '0.1em',
              textTransform: 'uppercase' as const,
            }}
          >
            Terminus
          </div>
        </div>
      </div>

      {/* Brand watermark */}
      <div style={{ marginTop: 'auto', paddingTop: 32, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <span
          style={{
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase' as const,
            color: '#450a0a',
          }}
        >
          PodTeksT
        </span>
      </div>
    </ShareCardShell>
  );
}
