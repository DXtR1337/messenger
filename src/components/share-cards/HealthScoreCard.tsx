'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { Pass4Result } from '@/lib/analysis/types';

interface HealthScoreCardProps {
  pass4: Pass4Result;
  participants: string[];
}

const COMPONENT_DATA: Record<string, { label: string; unit: string; icon: string }> = {
  balance: { label: 'BAL', unit: 'mmHg', icon: '⚖️' },
  reciprocity: { label: 'REC', unit: 'bpm', icon: '🔥' },
  response_pattern: { label: 'RSP', unit: 'mL/s', icon: '💬' },
  emotional_safety: { label: 'SAF', unit: 'SpO₂', icon: '🛡️' },
  growth_trajectory: { label: 'GRW', unit: '°C', icon: '📈' },
};

function getVitalStatus(val: number): { color: string; status: string } {
  if (val >= 75) return { color: '#00ff88', status: 'NORMA' };
  if (val >= 50) return { color: '#fbbf24', status: 'PODWYŻSZONY' };
  if (val >= 30) return { color: '#ff8c00', status: 'OSTRZEŻENIE' };
  return { color: '#ff3333', status: 'KRYTYCZNY' };
}

export default function HealthScoreCard({ pass4, participants }: HealthScoreCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-health-score');

  const { health_score } = pass4;
  const score = health_score.overall;

  const mainStatus = getVitalStatus(score);

  const verdict =
    score >= 80
      ? 'PACJENT STABILNY'
      : score >= 60
        ? 'POD OBSERWACJĄ'
        : score >= 40
          ? 'STAN POWAŻNY'
          : 'STAN KRYTYCZNY';

  const nameA = participants[0] ?? 'Osoba A';
  const nameB = participants[1] ?? 'Osoba B';

  const components = Object.entries(health_score.components) as [string, number][];

  // Generate ECG-like path
  const ecgWidth = 328;
  const ecgHeight = 50;
  const ecgPoints: string[] = [];
  const segments = 40;
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * ecgWidth;
    let y = ecgHeight / 2;
    const pos = i % 10;
    if (pos === 3) y = ecgHeight * 0.8;
    else if (pos === 4) y = ecgHeight * 0.1;
    else if (pos === 5) y = ecgHeight * 0.9;
    else if (pos === 6) y = ecgHeight * 0.4;
    else y = ecgHeight / 2 + (Math.random() - 0.5) * 4;
    ecgPoints.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const ecgPath = ecgPoints.join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#050510',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header — hospital monitor style */}
        <div
          style={{
            padding: '14px 16px 10px',
            borderBottom: '2px solid #1a1a2e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: mainStatus.color,
                  boxShadow: `0 0 8px ${mainStatus.color}`,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#ededed',
                  letterSpacing: '0.06em',
                }}
              >
                PODTEKST
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.42rem',
                color: '#555577',
                letterSpacing: '0.08em',
              }}
            >
              MONITOR PARAMETRÓW RELACJI
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: mainStatus.color,
              textAlign: 'right',
              letterSpacing: '0.06em',
            }}
          >
            <div>♥ {60 + Math.round(score * 0.4)} BPM</div>
            <div style={{ color: '#555577' }}>SALA 42</div>
          </div>
        </div>

        {/* Patient info strip */}
        <div
          style={{
            padding: '8px 16px',
            background: '#0a0a1a',
            borderBottom: '1px solid #1a1a2e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.46rem', color: '#6d9fff' }}>
              PT.A: {nameA.substring(0, 12).toUpperCase()}
            </span>
            <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.46rem', color: '#b38cff' }}>
              PT.B: {nameB.substring(0, 12).toUpperCase()}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#555577',
            }}
          >
            ID: {Math.random().toString(36).substring(2, 8).toUpperCase()}
          </span>
        </div>

        {/* ECG trace */}
        <div
          style={{
            padding: '8px 16px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <svg width={ecgWidth} height={ecgHeight} viewBox={`0 0 ${ecgWidth} ${ecgHeight}`}>
            <path
              d={ecgPath}
              fill="none"
              stroke={mainStatus.color}
              strokeWidth={1.5}
              opacity={0.6}
            />
          </svg>
        </div>

        {/* Main score — large */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '8px 16px 16px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Score glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${mainStatus.color}22, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontWeight: 900,
              fontSize: '4rem',
              lineHeight: 1,
              color: mainStatus.color,
              textShadow: `0 0 40px ${mainStatus.color}44`,
              position: 'relative',
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.52rem',
              color: '#555577',
              marginTop: 4,
            }}
          >
            / 100 INDEKS ZDROWIA
          </span>
          <div
            style={{
              marginTop: 8,
              padding: '4px 16px',
              border: `1px solid ${mainStatus.color}44`,
              borderRadius: 2,
              background: `${mainStatus.color}11`,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.58rem',
                fontWeight: 700,
                color: mainStatus.color,
                letterSpacing: '0.12em',
              }}
            >
              ■ {verdict}
            </span>
          </div>
        </div>

        {/* Vitals grid */}
        <div
          style={{
            flex: 1,
            padding: '0 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#555577',
              letterSpacing: '0.12em',
              marginBottom: 2,
            }}
          >
            ROZKŁAD PARAMETRÓW
          </div>
          {components.map(([key, value]) => {
            const data = COMPONENT_DATA[key];
            const vital = getVitalStatus(value);
            if (!data) return null;
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: '#0a0a1a',
                  border: `1px solid ${vital.color}22`,
                  borderLeft: `3px solid ${vital.color}`,
                  borderRadius: 2,
                }}
              >
                <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>{data.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.52rem',
                        color: '#888899',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {data.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.42rem',
                        color: vital.color,
                        letterSpacing: '0.08em',
                      }}
                    >
                      {vital.status}
                    </span>
                  </div>
                  {/* Value bar */}
                  <div
                    style={{
                      height: 3,
                      borderRadius: 2,
                      background: '#1a1a2e',
                      marginTop: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${value}%`,
                        height: '100%',
                        background: vital.color,
                        borderRadius: 2,
                        boxShadow: `0 0 6px ${vital.color}44`,
                      }}
                    />
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: vital.color,
                    flexShrink: 0,
                    width: 28,
                    textAlign: 'right',
                  }}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px 14px',
            borderTop: '1px solid #1a1a2e',
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
              color: '#555577',
            }}
          >
            podtekst.app
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: mainStatus.color,
            }}
          >
            ● MONITOROWANIE
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
