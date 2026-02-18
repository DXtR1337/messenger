'use client';

import { useRef, useState } from 'react';
import { useCardDownload } from './useCardDownload';
import {
  type SCIDResult,
  SCID_DISORDERS,
  SCID_DISCLAIMER,
  getTopDisorders,
  getOverallRiskLevel,
} from '@/lib/analysis/scid-ii';

// ============================================================
// TYPES
// ============================================================

interface SCIDCardProps {
  scidResult: SCIDResult;
  participantName: string;
}

// ============================================================
// RISK LEVEL CONFIG
// ============================================================

const RISK_CONFIG = {
  low: { label: 'NISKIE', color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
  moderate: { label: 'UMIARKOWANE', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.3)' },
  high: { label: 'PODWYŻSZONE', color: '#f97316', glow: 'rgba(249, 115, 22, 0.3)' },
  very_high: { label: 'WYSOKIE', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
} as const;

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SCIDCard({ scidResult, participantName }: SCIDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, `chatscope-scid-${participantName}`);
  const [consented, setConsented] = useState(false);

  const topDisorders = getTopDisorders(scidResult.disorders, 4);
  const riskLevel = getOverallRiskLevel(scidResult.disorders);
  const riskInfo = RISK_CONFIG[riskLevel.level];
  const dateStr = new Date(scidResult.analyzedAt).toLocaleDateString('pl-PL');

  const mono = 'var(--font-geist-mono)';
  const syne = 'var(--font-syne)';
  const body = 'var(--font-space-grotesk)';

  // --------------------------------------------------------
  // Consent gate (Tailwind/className allowed here)
  // --------------------------------------------------------
  if (!consented) {
    return (
      <div className="flex flex-col items-center gap-3 max-w-[360px] mx-auto">
        <div className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center text-2xl">
            🧠
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-1">
              Profil SCID-II: {participantName}
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Wyniki przesiewu SCID-II zawierają wrażliwe informacje
              o wzorcach osobowości. Udostępnianie wymaga wyraźnej zgody.
            </p>
          </div>
          <button
            onClick={() => setConsented(true)}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-orange-500/15 text-orange-400 border border-orange-500/25 hover:bg-orange-500/25 transition-colors cursor-pointer"
          >
            Pokaż wyniki SCID-II
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // Downloadable card — ALL inline styles
  // --------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: mono,
          color: '#e5e5e5',
        }}
      >
        {/* Subtle background grain / radial glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 500,
            height: 300,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.04), transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Top border accent line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${riskInfo.color}, transparent)`,
            zIndex: 3,
          }}
        />

        {/* ============ HEADER ============ */}
        <div
          style={{
            padding: '20px 20px 12px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Lab identifier line */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.42rem',
                color: '#555',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              CHATSCOPE RAPORT LABORATORYJNY
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.42rem',
                color: '#444',
                letterSpacing: '0.05em',
              }}
            >
              {dateStr}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: syne,
              fontWeight: 900,
              fontSize: '0.95rem',
              color: '#ffffff',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            SCID-II OSOBOWOŚĆ
          </div>
          <div
            style={{
              fontFamily: syne,
              fontWeight: 900,
              fontSize: '0.95rem',
              color: '#ffffff',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            PRZESIEW
          </div>

          {/* Patient line */}
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.5rem',
                color: '#555',
                letterSpacing: '0.1em',
              }}
            >
              OSOBA:
            </div>
            <div
              style={{
                fontFamily: body,
                fontSize: '0.7rem',
                color: '#ccc',
                fontWeight: 600,
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {participantName}
            </div>
          </div>

          {/* Separator */}
          <div
            style={{
              marginTop: 12,
              height: 1,
              background: 'linear-gradient(90deg, #333, transparent)',
            }}
          />
        </div>

        {/* ============ RISK LEVEL INDICATOR ============ */}
        <div
          style={{
            padding: '0 20px 14px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${riskInfo.color}22`,
              borderRadius: 4,
            }}
          >
            {/* Glowing risk dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: riskInfo.color,
                boxShadow: `0 0 10px ${riskInfo.glow}, 0 0 20px ${riskInfo.glow}`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: '0.48rem',
                  color: '#666',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 1,
                }}
              >
                OGÓLNY POZIOM RYZYKA
              </div>
              <div
                style={{
                  fontFamily: syne,
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: riskInfo.color,
                  letterSpacing: '0.06em',
                }}
              >
                {riskInfo.label}
              </div>
            </div>
            {/* Threshold count */}
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: riskInfo.color,
                  lineHeight: 1,
                }}
              >
                {Object.values(scidResult.disorders).filter(r => r.meetsThreshold).length}
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: '0.38rem',
                  color: '#555',
                  letterSpacing: '0.05em',
                  marginTop: 1,
                }}
              >
                PROGI PRZEKROCZONE
              </div>
            </div>
          </div>
        </div>

        {/* ============ TOP 4 DISORDER BARS ============ */}
        <div
          style={{
            padding: '0 20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.45rem',
              color: '#555',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            GŁÓWNE WSKAŹNIKI
          </div>

          {topDisorders.map(({ disorder, result }) => {
            const barWidth = Math.min(result.percentage, 100);
            const isOver = result.meetsThreshold;

            return (
              <div key={disorder.key}>
                {/* Disorder label row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: disorder.color,
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        fontFamily: body,
                        fontSize: '0.62rem',
                        color: '#ccc',
                        fontWeight: 500,
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {disorder.nameEn}
                    </div>
                    {isOver && (
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: '0.36rem',
                          color: '#ef4444',
                          letterSpacing: '0.08em',
                          padding: '1px 5px',
                          border: '1px solid rgba(239,68,68,0.3)',
                          borderRadius: 2,
                          fontWeight: 700,
                        }}
                      >
                        PRÓG
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: isOver ? '#ef4444' : disorder.color,
                    }}
                  >
                    {result.percentage}%
                  </div>
                </div>

                {/* Bar background */}
                <div
                  style={{
                    width: '100%',
                    height: 8,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {/* Threshold marker line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '100%',
                      top: 0,
                      bottom: 0,
                      width: 1,
                      background: 'rgba(255,255,255,0.1)',
                      zIndex: 1,
                    }}
                  />
                  {/* Filled bar */}
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, ${disorder.color}99, ${disorder.color})`,
                      borderRadius: 2,
                      boxShadow: isOver ? `0 0 8px ${disorder.color}44` : 'none',
                    }}
                  />
                </div>

                {/* Sub-stats row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 3,
                  }}
                >
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: '0.38rem',
                      color: '#555',
                    }}
                  >
                    {result.yesCount}/{result.threshold} wskaźników
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: '0.38rem',
                      color: '#555',
                    }}
                  >
                    pewność: {result.confidence}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ============ CONFIDENCE METER ============ */}
        <div
          style={{
            padding: '12px 20px 0',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 4,
              border: '1px solid #1a1a1a',
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.42rem',
                color: '#555',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              PEWNOŚĆ ANALIZY
            </div>
            <div
              style={{
                flex: 1,
                height: 4,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.round(scidResult.overallConfidence)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, #555, ${riskInfo.color})`,
                  borderRadius: 2,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.55rem',
                fontWeight: 700,
                color: riskInfo.color,
                flexShrink: 0,
              }}
            >
              {Math.round(scidResult.overallConfidence)}%
            </div>
          </div>
        </div>

        {/* ============ DISCLAIMER ============ */}
        <div
          style={{
            padding: '10px 20px 0',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              padding: '8px 10px',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.12)',
              borderRadius: 4,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
              }}
            >
              <span style={{ fontSize: '0.65rem', lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
                &#9888;&#65039;
              </span>
              <div
                style={{
                  fontFamily: body,
                  fontSize: '0.42rem',
                  color: 'rgba(239, 68, 68, 0.7)',
                  lineHeight: 1.5,
                }}
              >
                {SCID_DISCLAIMER}
              </div>
            </div>
          </div>
        </div>

        {/* ============ FOOTER ============ */}
        <div
          style={{
            padding: '10px 20px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.42rem',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.2)',
            }}
          >
            chatscope.app
          </span>
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.38rem',
              color: '#333',
              letterSpacing: '0.05em',
            }}
          >
            SCID-II PRZESIEW v1.0
          </span>
        </div>
      </div>

      {/* ============ DOWNLOAD BUTTON (outside card) ============ */}
      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: body,
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
