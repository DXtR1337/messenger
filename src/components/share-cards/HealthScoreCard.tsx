'use client';

import { useRef, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import type { Pass4Result } from '@/lib/analysis/types';

interface HealthScoreCardProps {
  pass4: Pass4Result;
  participants: string[];
}

const COMPONENT_LABELS: Record<string, string> = {
  balance: 'Homeostaza',
  reciprocity: 'Reciprocitas',
  response_pattern: 'Reaktywność',
  emotional_safety: 'Securitas Em.',
  growth_trajectory: 'Trajectoria',
};

function getScoreColor(val: number): string {
  if (val >= 80) return '#16a34a';
  if (val >= 60) return '#ca8a04';
  if (val >= 40) return '#ea580c';
  return '#dc2626';
}

function getStatusText(val: number): string {
  if (val >= 80) return 'NORMA';
  if (val >= 60) return 'PODWYŻSZONY';
  if (val >= 40) return 'OSTRZEŻENIE';
  return 'KRYTYCZNY';
}

function getStatusDot(val: number): string {
  if (val >= 80) return '#16a34a';
  if (val >= 60) return '#ca8a04';
  if (val >= 40) return '#ea580c';
  return '#dc2626';
}

function getRecommendation(score: number): string {
  if (score >= 80) return 'Relacja w doskonałym stanie. Kontynuować dotychczasowe wzorce komunikacji.';
  if (score >= 60) return 'Parametry w normie z lekkim odchyleniem. Zalecana większa uwaga na wzajemność.';
  if (score >= 40) return 'Wykryto niepokojące wzorce. Zalecana konsultacja i rewizja dynamiki rozmów.';
  return 'Stan krytyczny. Pilna interwencja komunikacyjna wymagana. Rozważyć szczerą rozmowę.';
}

export default function HealthScoreCard({ pass4, participants }: HealthScoreCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-health-score', {
    backgroundColor: '#f8fafc',
  });

  const { health_score } = pass4;
  const score = health_score.overall;
  const scoreColor = getScoreColor(score);

  const patientNames = participants.join(' & ');
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

  const cardId = useMemo(() => {
    return `PT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }, []);

  const components = Object.entries(health_score.components) as [string, number][];

  // SVG gauge arc parameters
  const gaugeR = 82;
  const gaugeCx = 130;
  const gaugeCy = 100;
  // Arc from 225deg to -45deg (270 degree sweep) going clockwise
  const startAngle = 135; // degrees from positive x-axis (bottom-left)
  const sweepAngle = 270; // total sweep
  const scoreAngle = startAngle + (score / 100) * sweepAngle;
  // Build the arc path
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcStartX = gaugeCx + gaugeR * Math.cos(toRad(startAngle));
  const arcStartY = gaugeCy + gaugeR * Math.sin(toRad(startAngle));
  const arcEndX = gaugeCx + gaugeR * Math.cos(toRad(startAngle + sweepAngle));
  const arcEndY = gaugeCy + gaugeR * Math.sin(toRad(startAngle + sweepAngle));

  // Score arc endpoint
  const scoreEndX = gaugeCx + gaugeR * Math.cos(toRad(scoreAngle));
  const scoreEndY = gaugeCy + gaugeR * Math.sin(toRad(scoreAngle));

  const largeArcFull = sweepAngle > 180 ? 1 : 0;
  const scoreSweep = (score / 100) * sweepAngle;
  const largeArcScore = scoreSweep > 180 ? 1 : 0;

  const bgArcPath = `M ${arcStartX} ${arcStartY} A ${gaugeR} ${gaugeR} 0 ${largeArcFull} 1 ${arcEndX} ${arcEndY}`;
  const scoreArcPath = `M ${arcStartX} ${arcStartY} A ${gaugeR} ${gaugeR} 0 ${largeArcScore} 1 ${scoreEndX} ${scoreEndY}`;

  const syne = 'var(--font-syne)';
  const mono = 'var(--font-geist-mono)';
  const grotesk = 'var(--font-space-grotesk)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: '#f8fafc',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: mono,
        }}
      >
        {/* Blue header bar */}
        <div
          style={{
            background: '#0066cc',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Red cross icon */}
            <svg width={18} height={18} viewBox="0 0 18 18">
              <rect x={7} y={2} width={4} height={14} rx={0.5} fill="#dc2626" />
              <rect x={2} y={7} width={14} height={4} rx={0.5} fill="#dc2626" />
            </svg>
            <span
              style={{
                fontFamily: syne,
                fontWeight: 800,
                fontSize: '1.0rem',
                color: '#ffffff',
                letterSpacing: '0.12em',
              }}
            >
              KARTA PACJENTA
            </span>
          </div>
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.06em',
            }}
          >
            PODTEKST LAB
          </span>
        </div>

        {/* Patient info section */}
        <div
          style={{
            padding: '10px 16px 8px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: mono, fontSize: '0.68rem', color: '#64748b' }}>
                Pacjent: <span style={{ color: '#1e293b', fontWeight: 600 }}>{patientNames}</span>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#94a3b8' }}>
                Data badania: {dateStr}
              </span>
              <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#94a3b8' }}>
                Nr karty: {cardId}
              </span>
            </div>
          </div>
        </div>

        {/* Main score gauge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 16px 6px',
          }}
        >
          <div style={{ position: 'relative', width: 260, height: 160 }}>
            <svg width={260} height={160} viewBox="0 0 260 160">
              {/* Background arc */}
              <path
                d={bgArcPath}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={10}
                strokeLinecap="round"
              />
              {/* Score arc */}
              {score > 0 && (
                <path
                  d={scoreArcPath}
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth={10}
                  strokeLinecap="round"
                />
              )}
              {/* Tick marks at 0, 25, 50, 75, 100 */}
              {[0, 25, 50, 75, 100].map((tick) => {
                const tickAngle = startAngle + (tick / 100) * sweepAngle;
                const innerR = gaugeR - 14;
                const outerR = gaugeR - 8;
                const x1 = gaugeCx + innerR * Math.cos(toRad(tickAngle));
                const y1 = gaugeCy + innerR * Math.sin(toRad(tickAngle));
                const x2 = gaugeCx + outerR * Math.cos(toRad(tickAngle));
                const y2 = gaugeCy + outerR * Math.sin(toRad(tickAngle));
                const labelR = gaugeR - 22;
                const lx = gaugeCx + labelR * Math.cos(toRad(tickAngle));
                const ly = gaugeCy + labelR * Math.sin(toRad(tickAngle));
                return (
                  <g key={tick}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={1} />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#94a3b8"
                      fontSize="7.5"
                      fontFamily={mono}
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}
            </svg>
            {/* Score number in center */}
            <div
              style={{
                position: 'absolute',
                top: '52%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: syne,
                  fontWeight: 900,
                  fontSize: '3rem',
                  lineHeight: 1,
                  color: scoreColor,
                }}
              >
                {score}
              </div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: '0.63rem',
                  color: '#94a3b8',
                  marginTop: 2,
                  letterSpacing: '0.06em',
                }}
              >
                / 100
              </div>
            </div>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#64748b',
              letterSpacing: '0.14em',
              marginTop: 0,
            }}
          >
            OGÓLNY STAN RELACJI
          </div>
        </div>

        {/* Lab results table */}
        <div style={{ padding: '6px 16px 0', flex: 1 }}>
          {/* Table header */}
          <div
            style={{
              display: 'flex',
              padding: '5px 8px',
              borderBottom: '2px solid #0066cc',
              marginBottom: 0,
            }}
          >
            <span
              style={{
                flex: 2.2,
                fontFamily: mono,
                fontSize: '0.63rem',
                fontWeight: 700,
                color: '#0066cc',
                letterSpacing: '0.1em',
              }}
            >
              PARAMETR
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: mono,
                fontSize: '0.63rem',
                fontWeight: 700,
                color: '#0066cc',
                letterSpacing: '0.1em',
                textAlign: 'center',
              }}
            >
              WYNIK
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: mono,
                fontSize: '0.63rem',
                fontWeight: 700,
                color: '#0066cc',
                letterSpacing: '0.1em',
                textAlign: 'center',
              }}
            >
              NORMA
            </span>
            <span
              style={{
                flex: 1,
                fontFamily: mono,
                fontSize: '0.63rem',
                fontWeight: 700,
                color: '#0066cc',
                letterSpacing: '0.1em',
                textAlign: 'center',
              }}
            >
              STATUS
            </span>
          </div>

          {/* Table rows */}
          {components.map(([key, value], i) => {
            const label = COMPONENT_LABELS[key] ?? key;
            const dotColor = getStatusDot(value);
            const status = getStatusText(value);
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '7px 8px',
                  background: i % 2 === 0 ? '#f1f5f9' : '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <span
                  style={{
                    flex: 2.2,
                    fontFamily: mono,
                    fontSize: '0.68rem',
                    color: '#334155',
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: mono,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#1e293b',
                    textAlign: 'center',
                  }}
                >
                  {value}
                  <span style={{ fontSize: '0.63rem', color: '#94a3b8', fontWeight: 400 }}>/100</span>
                </span>
                <span
                  style={{
                    flex: 1,
                    fontFamily: mono,
                    fontSize: '0.63rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                  }}
                >
                  60-100
                </span>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: dotColor,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: '0.68rem',
                      color: dotColor,
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Doctor's note */}
        <div
          style={{
            padding: '10px 16px 6px',
            borderTop: '1px dashed #cbd5e1',
            margin: '4px 16px 0',
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#64748b',
              fontWeight: 700,
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}
          >
            ZALECENIE LEKARSKIE:
          </div>
          <div
            style={{
              fontFamily: grotesk,
              fontSize: '0.68rem',
              color: '#475569',
              fontStyle: 'italic',
              lineHeight: 1.5,
              marginBottom: 6,
            }}
          >
            {getRecommendation(score)}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#94a3b8',
              textAlign: 'right',
              fontStyle: 'italic',
            }}
          >
            lek. AI Gemini, spec. konwersatologii
          </div>
        </div>

        {/* Footer stamp */}
        <div
          style={{
            padding: '8px 16px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Blue circular stamp */}
          <svg width={52} height={52} viewBox="0 0 52 52">
            <circle cx={26} cy={26} r={23} fill="none" stroke="#0066cc" strokeWidth={1.5} opacity={0.5} />
            <circle cx={26} cy={26} r={19} fill="none" stroke="#0066cc" strokeWidth={0.5} opacity={0.5} />
            <text
              x={26}
              y={21}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#0066cc"
              fontSize="5.5"
              fontFamily={mono}
              fontWeight={700}
              letterSpacing="0.1em"
              opacity={0.7}
            >
              PODTEKST
            </text>
            <text
              x={26}
              y={27}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#0066cc"
              fontSize="4.2"
              fontFamily={mono}
              opacity={0.5}
            >
              LABORATORIUM
            </text>
            <text
              x={26}
              y={32}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#0066cc"
              fontSize="4.2"
              fontFamily={mono}
              opacity={0.5}
            >
              ANALIZ
            </text>
          </svg>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.63rem',
                color: '#94a3b8',
                letterSpacing: '0.06em',
              }}
            >
              podtekst.app
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.63rem',
                color: '#cbd5e1',
                marginTop: 2,
              }}
            >
              Dokument wygenerowany automatycznie
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: grotesk,
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
        {isDownloading ? 'Pobieranie...' : 'Pobierz karte'}
      </button>
    </div>
  );
}
