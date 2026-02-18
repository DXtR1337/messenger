'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { RedFlag, GreenFlag } from '@/lib/analysis/types';

interface FlagsCardProps {
  redFlags: RedFlag[];
  greenFlags: GreenFlag[];
}

const SEVERITY_BG: Record<string, string> = {
  mild: '#fbbf24',
  moderate: '#fb923c',
  severe: '#ff3333',
};

export default function FlagsCard({ redFlags, greenFlags }: FlagsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'chatscope-flags');

  const displayGreen = greenFlags.slice(0, 4);
  const displayRed = redFlags.slice(0, 4);

  const caseNumber = `CF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#1a1812',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cork board texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 30% 20%, rgba(180,150,100,0.08), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(180,150,100,0.06), transparent 50%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        {/* Grain */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header — manila folder tab */}
        <div
          style={{
            padding: '14px 16px 12px',
            background: '#221f17',
            borderBottom: '2px solid #3a3528',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  color: '#e8d5a3',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                AKTA SPRAWY
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.42rem',
                  color: '#7a7060',
                  letterSpacing: '0.1em',
                  marginTop: 2,
                }}
              >
                {caseNumber} • FLAGI RELACJI
              </div>
            </div>
            {/* Stamp */}
            <div
              style={{
                padding: '4px 10px',
                border: '2px solid #dc262688',
                borderRadius: 2,
                transform: 'rotate(-4deg)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 900,
                  fontSize: '0.58rem',
                  color: '#dc2626',
                  letterSpacing: '0.12em',
                }}
              >
                DOWODY
              </span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: 12, position: 'relative', zIndex: 2 }}>
          {/* Green flags — pinned notes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.5rem',
                  color: '#10b981',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                ZIELONE FLAGI ({displayGreen.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {displayGreen.map((flag, i) => {
                const rotation = i % 2 === 0 ? -1.2 : 0.8;
                return (
                  <div
                    key={i}
                    style={{
                      background: '#f5f0d8',
                      padding: '8px 10px',
                      borderRadius: 1,
                      transform: `rotate(${rotation}deg)`,
                      boxShadow: '2px 2px 6px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
                      borderLeft: '3px solid #10b981',
                      position: 'relative',
                    }}
                  >
                    {/* Pin */}
                    <div
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: 12,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      }}
                    />
                    <p
                      style={{
                        fontFamily: 'var(--font-space-grotesk)',
                        fontSize: '0.54rem',
                        color: '#2a2518',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {flag.pattern}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider — string/thread */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, #5a5040 20%, #7a7060 50%, #5a5040 80%, transparent)',
              margin: '2px 0',
            }}
          />

          {/* Red flags — pinned notes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#dc2626',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.5rem',
                  color: '#dc2626',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                CZERWONE FLAGI ({displayRed.length})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {displayRed.map((flag, i) => {
                const sevColor = SEVERITY_BG[flag.severity] ?? '#fbbf24';
                const rotation = i % 2 === 0 ? 0.6 : -0.9;
                return (
                  <div
                    key={i}
                    style={{
                      background: '#f5f0d8',
                      padding: '8px 10px 6px',
                      borderRadius: 1,
                      transform: `rotate(${rotation}deg)`,
                      boxShadow: '2px 2px 6px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
                      borderLeft: `3px solid ${sevColor}`,
                      position: 'relative',
                    }}
                  >
                    {/* Pin */}
                    <div
                      style={{
                        position: 'absolute',
                        top: -3,
                        left: 14,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#dc2626',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      }}
                    />
                    <p
                      style={{
                        fontFamily: 'var(--font-space-grotesk)',
                        fontSize: '0.54rem',
                        color: '#2a2518',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {flag.pattern}
                    </p>
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.42rem',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        background: sevColor,
                        borderRadius: 2,
                        padding: '1px 6px',
                        marginTop: 4,
                      }}
                    >
                      {flag.severity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px 14px',
            borderTop: '2px solid #3a3528',
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
              fontSize: '0.42rem',
              color: '#7a7060',
            }}
          >
            chatscope.app
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#7a7060',
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
