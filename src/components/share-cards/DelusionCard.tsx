'use client';

import { useRef, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import type { DelusionQuizResult } from '@/lib/analysis/delusion-quiz';

interface DelusionCardProps {
  result: DelusionQuizResult;
  participants: string[];
}

function getZoneColor(index: number): string {
  if (index <= 33) return '#16a34a';
  if (index <= 66) return '#ca8a04';
  return '#dc2626';
}

function getZoneLabel(index: number): string {
  if (index <= 33) return 'PRAWDA';
  if (index <= 66) return 'POLPRAWDA';
  return 'KLAMSTWO';
}

function getExaminerNote(index: number, label: string): string {
  if (index <= 20) return `Podmiot wykazuje wysoki poziom samoświadomości. Klasyfikacja: ${label}. Brak oznak konfabulacji.`;
  if (index <= 40) return `Podmiot przeważnie realistyczny, z drobnymi odchyleniami percepcji. Klasyfikacja: ${label}.`;
  if (index <= 60) return `Wykryto znaczące rozbieżności między percepcją a danymi. Klasyfikacja: ${label}. Zalecana rewizja.`;
  if (index <= 80) return `Podmiot wykazuje istotne zniekształcenia poznawcze. Klasyfikacja: ${label}. Wynik niepokojący.`;
  return `Odczyty wariografu wskazują na całkowite oderwanie od rzeczywistości. Klasyfikacja: ${label}.`;
}

export default function DelusionCard({ result, participants }: DelusionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-delusion', {
    backgroundColor: '#f5f0e6',
  });

  const { delusionIndex, label, score, answers } = result;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const wrongCount = answers.length - correctCount;
  const zoneColor = getZoneColor(delusionIndex);

  const nameA = participants[0]?.split(' ')[0] ?? 'Podmiot';

  const syne = 'var(--font-syne)';
  const mono = 'var(--font-geist-mono)';
  const grotesk = 'var(--font-space-grotesk)';

  // Generate polygraph trace data using delusion index as seed for amplitude
  const traceData = useMemo(() => {
    const amplitude = 0.36 + (delusionIndex / 100) * 0.84; // higher delusion = wilder traces (boosted 20%)
    const points = 80;

    // GSR trace (red) - erratic, amplitude from delusion score
    const gsrPoints: string[] = [];
    for (let i = 0; i < points; i++) {
      const x = (i / (points - 1)) * 310 + 10;
      const base = 25;
      const noise = Math.sin(i * 0.8) * 8 * amplitude
        + Math.sin(i * 2.1 + 1) * 4 * amplitude
        + Math.cos(i * 0.3) * 6 * amplitude
        + (Math.sin(i * 5.5) > 0.7 ? 12 * amplitude : 0);
      const y = base + noise;
      gsrPoints.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${Math.max(5, Math.min(45, y)).toFixed(1)}`);
    }

    // Breathing trace (blue) - smoother sine wave
    const breathPoints: string[] = [];
    for (let i = 0; i < points; i++) {
      const x = (i / (points - 1)) * 310 + 10;
      const base = 25;
      const wave = Math.sin(i * 0.15 + 0.5) * 12 * (0.5 + amplitude * 0.5)
        + Math.sin(i * 0.4 + 2) * 3 * amplitude;
      const y = base + wave;
      breathPoints.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${Math.max(5, Math.min(45, y)).toFixed(1)}`);
    }

    // Heart rate trace (green) - sharp peaks
    const heartPoints: string[] = [];
    for (let i = 0; i < points; i++) {
      const x = (i / (points - 1)) * 310 + 10;
      const base = 25;
      const cycle = i % 12;
      let spike = 0;
      if (cycle === 4) spike = -15 * amplitude;
      else if (cycle === 5) spike = 18 * amplitude;
      else if (cycle === 6) spike = -8 * amplitude;
      else if (cycle === 7) spike = 4 * amplitude;
      else spike = (Math.random() - 0.5) * 2;
      const y = base + spike;
      heartPoints.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${Math.max(3, Math.min(47, y)).toFixed(1)}`);
    }

    return {
      gsr: gsrPoints.join(' '),
      breath: breathPoints.join(' '),
      heart: heartPoints.join(' '),
    };
  }, [delusionIndex]);

  // Semicircular gauge for score
  const gaugeR = 52;
  const gaugeCx = 70;
  const gaugeCy = 58;
  const startAngle = 180;
  const sweepAngle = 180;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Arrow pointing to score on semicircle
  const scoreAngle = startAngle + (delusionIndex / 100) * sweepAngle;
  const arrowR = gaugeR - 8;
  const arrowX = gaugeCx + arrowR * Math.cos(toRad(scoreAngle));
  const arrowY = gaugeCy + arrowR * Math.sin(toRad(scoreAngle));

  // Arc paths for background and zones
  const makeArc = (startDeg: number, endDeg: number) => {
    const sx = gaugeCx + gaugeR * Math.cos(toRad(startDeg));
    const sy = gaugeCy + gaugeR * Math.sin(toRad(startDeg));
    const ex = gaugeCx + gaugeR * Math.cos(toRad(endDeg));
    const ey = gaugeCy + gaugeR * Math.sin(toRad(endDeg));
    const sweep = endDeg - startDeg;
    const large = sweep > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${gaugeR} ${gaugeR} 0 ${large} 1 ${ex} ${ey}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: '#f5f0e6',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Dark header bar */}
        <div
          style={{
            background: '#1a1a1a',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: syne,
                fontWeight: 800,
                fontSize: '1.0rem',
                color: '#dc2626',
                letterSpacing: '0.1em',
              }}
            >
              TEST WARIOGRAFEM
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.63rem',
                color: '#888888',
                marginTop: 2,
                letterSpacing: '0.06em',
              }}
            >
              Podmiot: {nameA.toUpperCase()}
            </div>
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#555555',
              textAlign: 'right',
              letterSpacing: '0.04em',
            }}
          >
            <div>POUFNE</div>
            <div style={{ color: '#dc2626' }}>REC</div>
          </div>
        </div>

        {/* Polygraph traces with grid paper background */}
        <div
          style={{
            margin: '8px 12px 0',
            background: '#fcf9f0',
            border: '1px solid #d4c9a8',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* Three trace channels */}
          {[
            { label: 'GSR', path: traceData.gsr, color: '#dc2626' },
            { label: 'ODDECH', path: traceData.breath, color: '#2563eb' },
            { label: 'TETNO', path: traceData.heart, color: '#16a34a' },
          ].map((trace) => (
            <div
              key={trace.label}
              style={{
                position: 'relative',
                height: 50,
                borderBottom: '1px solid #e8dfc8',
              }}
            >
              {/* Grid lines */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 330 50"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0 }}
              >
                {/* Horizontal grid */}
                {[10, 20, 30, 40].map((y) => (
                  <line key={`h-${y}`} x1={0} y1={y} x2={330} y2={y} stroke="#e8dfc8" strokeWidth={0.3} />
                ))}
                {/* Vertical grid */}
                {Array.from({ length: 33 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i * 10 + 10} y1={0} x2={i * 10 + 10} y2={50} stroke="#e8dfc8" strokeWidth={0.3} />
                ))}
              </svg>
              {/* Trace line */}
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 330 50"
                preserveAspectRatio="none"
                style={{ position: 'absolute', inset: 0 }}
              >
                <path
                  d={trace.path}
                  fill="none"
                  stroke={trace.color}
                  strokeWidth={1.2}
                  opacity={0.8}
                />
              </svg>
              {/* Channel label */}
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  left: 6,
                  fontFamily: mono,
                  fontSize: '0.68rem',
                  color: trace.color,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  opacity: 0.7,
                }}
              >
                {trace.label}
              </div>
            </div>
          ))}
        </div>

        {/* Truth zone indicator bar */}
        <div
          style={{
            margin: '8px 12px 0',
            display: 'flex',
            height: 16,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #d4c9a8',
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#16a34a', fontWeight: 700, letterSpacing: '0.08em' }}>
              PRAWDA
            </span>
          </div>
          <div
            style={{
              flex: 1,
              background: '#fef9c3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#ca8a04', fontWeight: 700, letterSpacing: '0.08em' }}>
              POLPRAWDA
            </span>
          </div>
          <div
            style={{
              flex: 1,
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#dc2626', fontWeight: 700, letterSpacing: '0.08em' }}>
              KLAMSTWO
            </span>
          </div>
          {/* Position indicator arrow */}
          <div
            style={{
              position: 'absolute',
              left: `calc(12px + ${(delusionIndex / 100) * 100}% * (336 / 360))`,
              top: -1,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Score section with semicircular gauge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px 4px',
            gap: 16,
          }}
        >
          {/* Semicircular gauge */}
          <div style={{ position: 'relative' }}>
            <svg width={140} height={70} viewBox="0 0 140 65">
              {/* Green zone (0-33) */}
              <path d={makeArc(180, 240)} fill="none" stroke="#16a34a" strokeWidth={8} opacity={0.3} />
              {/* Yellow zone (33-66) */}
              <path d={makeArc(240, 300)} fill="none" stroke="#ca8a04" strokeWidth={8} opacity={0.3} />
              {/* Red zone (66-100) */}
              <path d={makeArc(300, 360)} fill="none" stroke="#dc2626" strokeWidth={8} opacity={0.3} />
              {/* Arrow indicator */}
              <circle cx={arrowX} cy={arrowY} r={4} fill={zoneColor} />
              <line
                x1={gaugeCx}
                y1={gaugeCy}
                x2={arrowX}
                y2={arrowY}
                stroke={zoneColor}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <circle cx={gaugeCx} cy={gaugeCy} r={3} fill="#1a1a1a" />
              {/* Zone labels */}
              <text x={18} y={56} fill="#16a34a" fontSize="7" fontFamily={mono} opacity={0.6}>0</text>
              <text x={65} y={10} fill="#ca8a04" fontSize="7" fontFamily={mono} opacity={0.6}>50</text>
              <text x={116} y={56} fill="#dc2626" fontSize="7" fontFamily={mono} opacity={0.6}>100</text>
            </svg>
          </div>

          {/* Score display */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.63rem',
                color: '#94a3b8',
                letterSpacing: '0.1em',
                marginBottom: 2,
              }}
            >
              INDEKS SAMOŚWIADOMOŚCI
            </div>
            <div
              style={{
                fontFamily: syne,
                fontWeight: 900,
                fontSize: '2.8rem',
                lineHeight: 1,
                color: zoneColor,
              }}
            >
              {delusionIndex}
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.63rem',
                color: '#64748b',
                marginTop: 2,
              }}
            >
              / 100
            </div>
            <div
              style={{
                marginTop: 4,
                display: 'inline-block',
                padding: '2px 10px',
                background: `${zoneColor}18`,
                border: `1px solid ${zoneColor}40`,
                borderRadius: 2,
              }}
            >
              <span
                style={{
                  fontFamily: mono,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: zoneColor,
                  letterSpacing: '0.08em',
                }}
              >
                {label}
              </span>
            </div>
          </div>
        </div>

        {/* Results box */}
        <div
          style={{
            margin: '6px 12px',
            padding: '8px 12px',
            background: '#fcf9f0',
            border: '1px solid #d4c9a8',
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: syne, fontWeight: 800, fontSize: '1.2rem', color: '#16a34a' }}>
              {correctCount}
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.63rem', color: '#64748b', letterSpacing: '0.08em' }}>
              PRAWDA
            </div>
          </div>
          <div style={{ width: 1, background: '#d4c9a8' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: syne, fontWeight: 800, fontSize: '1.2rem', color: '#dc2626' }}>
              {wrongCount}
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.63rem', color: '#64748b', letterSpacing: '0.08em' }}>
              FALSZ
            </div>
          </div>
          <div style={{ width: 1, background: '#d4c9a8' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: syne, fontWeight: 800, fontSize: '1.2rem', color: '#1e293b' }}>
              {score}
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>/15</span>
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.63rem', color: '#64748b', letterSpacing: '0.08em' }}>
              TRAFIONE
            </div>
          </div>
        </div>

        {/* 15-question dot strip */}
        <div
          style={{
            padding: '4px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#94a3b8',
              letterSpacing: '0.1em',
              marginBottom: 4,
            }}
          >
            PRZEBIEG TESTU (15 PYTAN)
          </div>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
            {answers.map((answer, i) => (
              <div
                key={i}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: answer.isCorrect ? '#dcfce7' : '#fee2e2',
                  border: `1.5px solid ${answer.isCorrect ? '#16a34a' : '#dc2626'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: '0.63rem',
                    fontWeight: 700,
                    color: answer.isCorrect ? '#16a34a' : '#dc2626',
                  }}
                >
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Examiner note */}
        <div
          style={{
            margin: '6px 12px 0',
            padding: '8px 12px',
            borderTop: '1px dashed #d4c9a8',
            flex: 1,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#94a3b8',
              letterSpacing: '0.08em',
              marginBottom: 4,
            }}
          >
            UWAGI EGZAMINATORA:
          </div>
          <div
            style={{
              fontFamily: grotesk,
              fontSize: '0.72rem',
              color: '#475569',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}
          >
            {getExaminerNote(delusionIndex, label)}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 16px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#94a3b8' }}>
            podtekst.app
          </span>
          <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#d4c9a8' }}>
            Wynik poufny. Nie udostepniac osobom trzecim.
          </span>
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
        {isDownloading ? 'Pobieranie...' : 'Pobierz kartę'}
      </button>
    </div>
  );
}
