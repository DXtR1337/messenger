'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import {
  type CPSResult,
  CPS_PATTERNS,
  getOverallRiskLevel,
  getTopPatterns,
} from '@/lib/analysis/communication-patterns';

interface CPSCardProps {
  cpsResult: CPSResult;
}

const RISK_COLORS: Record<string, string> = {
  niski: '#00d4ff',
  umiarkowany: '#f5c842',
  'podwyższony': '#f59e0b',
  wysoki: '#ef4444',
};

const RISK_LABELS: Record<string, string> = {
  niski: 'NISKIE',
  umiarkowany: 'UMIARKOWANE',
  'podwyższony': 'PODWYŻSZONE',
  wysoki: 'WYSOKIE',
};

function getHotspotColor(percentage: number): string {
  if (percentage >= 75) return '#ef4444';
  if (percentage >= 50) return '#f59e0b';
  if (percentage >= 25) return '#f5c842';
  return '#00d4ff';
}

export default function CPSCard({ cpsResult }: CPSCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-cps');

  const risk = getOverallRiskLevel(cpsResult.patterns);
  const riskColor = RISK_COLORS[risk.level] ?? '#00d4ff';
  const riskLabel = RISK_LABELS[risk.level] ?? 'NISKIE';
  const thresholdCount = Object.values(cpsResult.patterns).filter(r => r.meetsThreshold).length;
  const totalPatterns = CPS_PATTERNS.length;
  const topPatterns = getTopPatterns(cpsResult.patterns, 6);

  const today = new Date().toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Hotspot positions distributed around a head silhouette
  const hotspotPositions = [
    { x: 180, y: 155, labelX: -40, labelY: -18 },
    { x: 230, y: 190, labelX: 12, labelY: -6 },
    { x: 240, y: 250, labelX: 12, labelY: -6 },
    { x: 180, y: 300, labelX: -40, labelY: 14 },
    { x: 120, y: 250, labelX: -85, labelY: -6 },
    { x: 110, y: 190, labelX: -85, labelY: -6 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          minHeight: 640,
          background: '#050510',
          borderRadius: 20,
          overflow: 'hidden',
          position: 'relative',
          fontFamily: 'var(--font-geist-mono), monospace',
        }}
      >
        {/* Blue-tinted gradient edges */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at top left, rgba(0,212,255,0.06) 0%, transparent 50%), ' +
              'radial-gradient(ellipse at bottom right, rgba(0,212,255,0.06) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Horizontal scan lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.02) 3px, rgba(0,212,255,0.02) 4px)',
            pointerEvents: 'none',
          }}
        />

        {/* Film marker R (top-left) */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'rgba(0,212,255,0.3)',
            letterSpacing: '0.1em',
          }}
        >
          R
        </div>

        {/* Film marker L (top-right) */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.82rem',
            fontWeight: 700,
            color: 'rgba(0,212,255,0.3)',
            letterSpacing: '0.1em',
          }}
        >
          L
        </div>

        {/* Content container */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 20px 20px',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontWeight: 800,
                fontSize: '1.1rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#00d4ff',
                textShadow:
                  '0 0 10px rgba(0,212,255,0.5), 0 0 20px rgba(0,212,255,0.3), 0 0 40px rgba(0,212,255,0.15)',
              }}
            >
              RENTGEN KOMUNIKACJI
            </div>
          </div>

          {/* Patient info bar */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 12,
              paddingBottom: 10,
              borderBottom: '1px solid rgba(0,212,255,0.1)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(0,212,255,0.5)',
                letterSpacing: '0.12em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 280,
                margin: '0 auto',
              }}
            >
              PACJENT: {cpsResult.participantName.toUpperCase()} | PROBKA: WIADOMOSCI | DATA: {today}
            </div>
          </div>

          {/* X-ray scan visualization */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 260,
              marginBottom: 10,
              flexShrink: 0,
            }}
          >
            {/* Central head/brain SVG silhouette */}
            <svg
              viewBox="0 0 360 260"
              fill="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
            >
              {/* Head outline */}
              <ellipse
                cx="180"
                cy="135"
                rx="65"
                ry="80"
                stroke="rgba(0,212,255,0.12)"
                strokeWidth="1"
                fill="none"
              />
              {/* Brain folds - left hemisphere */}
              <path
                d="M 140,100 Q 155,80 175,90 Q 185,95 180,110"
                stroke="rgba(0,212,255,0.08)"
                strokeWidth="0.8"
                fill="none"
              />
              <path
                d="M 135,130 Q 150,115 170,120 Q 185,125 178,140"
                stroke="rgba(0,212,255,0.08)"
                strokeWidth="0.8"
                fill="none"
              />
              {/* Brain folds - right hemisphere */}
              <path
                d="M 220,100 Q 205,80 185,90 Q 178,95 182,110"
                stroke="rgba(0,212,255,0.08)"
                strokeWidth="0.8"
                fill="none"
              />
              <path
                d="M 225,130 Q 210,115 190,120 Q 178,125 182,140"
                stroke="rgba(0,212,255,0.08)"
                strokeWidth="0.8"
                fill="none"
              />
              {/* Central divide */}
              <line
                x1="180"
                y1="60"
                x2="180"
                y2="210"
                stroke="rgba(0,212,255,0.06)"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
              {/* Jaw/chin */}
              <path
                d="M 135,175 Q 145,210 180,220 Q 215,210 225,175"
                stroke="rgba(0,212,255,0.08)"
                strokeWidth="0.8"
                fill="none"
              />
              {/* Neck */}
              <line
                x1="165"
                y1="220"
                x2="160"
                y2="255"
                stroke="rgba(0,212,255,0.06)"
                strokeWidth="0.6"
              />
              <line
                x1="195"
                y1="220"
                x2="200"
                y2="255"
                stroke="rgba(0,212,255,0.06)"
                strokeWidth="0.6"
              />
              {/* Spine indication */}
              <line
                x1="180"
                y1="220"
                x2="180"
                y2="260"
                stroke="rgba(0,212,255,0.05)"
                strokeWidth="0.5"
                strokeDasharray="2 3"
              />

              {/* Hotspots */}
              {topPatterns.map(({ result, pattern }, i) => {
                const pos = hotspotPositions[i];
                if (!pos) return null;
                const color = getHotspotColor(result.percentage);
                const radius = 8 + (result.percentage / 100) * 16;

                return (
                  <g key={pattern.key}>
                    {/* Glow circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius + 4}
                      fill={color}
                      opacity={0.08}
                    />
                    {/* Main circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius}
                      fill={color}
                      opacity={0.2}
                      stroke={color}
                      strokeWidth="1"
                      strokeOpacity={0.5}
                    />
                    {/* Inner dot */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={3}
                      fill={color}
                      opacity={0.8}
                    />
                    {/* Connection line to label */}
                    <line
                      x1={pos.x}
                      y1={pos.y}
                      x2={pos.x + pos.labelX}
                      y2={pos.y + pos.labelY}
                      stroke={color}
                      strokeWidth="0.5"
                      strokeOpacity={0.4}
                      strokeDasharray="2 2"
                    />
                    {/* Label text */}
                    <text
                      x={pos.x + pos.labelX + (pos.labelX > 0 ? 4 : -4)}
                      y={pos.y + pos.labelY + 1}
                      fill={color}
                      fontSize="7"
                      fontFamily="var(--font-geist-mono)"
                      fontWeight="600"
                      textAnchor={pos.labelX > 0 ? 'start' : 'end'}
                      dominantBaseline="middle"
                    >
                      {pattern.name.length > 22
                        ? pattern.name.substring(0, 20) + '\u2026'
                        : pattern.name}
                    </text>
                    {/* Percentage below label */}
                    <text
                      x={pos.x + pos.labelX + (pos.labelX > 0 ? 4 : -4)}
                      y={pos.y + pos.labelY + 9}
                      fill={color}
                      fontSize="6"
                      fontFamily="var(--font-geist-mono)"
                      fontWeight="700"
                      textAnchor={pos.labelX > 0 ? 'start' : 'end'}
                      dominantBaseline="middle"
                      opacity={0.7}
                    >
                      {result.percentage}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Pattern bar list (compact) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              marginBottom: 10,
            }}
          >
            {CPS_PATTERNS.map(pattern => {
              const result = cpsResult.patterns[pattern.key];
              if (!result) return null;

              const barColor = getHotspotColor(result.percentage);

              return (
                <div
                  key={pattern.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 130,
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '0.6rem',
                      color: result.meetsThreshold ? barColor : 'rgba(0,212,255,0.4)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {pattern.name}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: 'rgba(0,212,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, result.percentage)}%`,
                        height: '100%',
                        borderRadius: 2,
                        background: barColor,
                        boxShadow: result.percentage > 50
                          ? `0 0 6px ${barColor}66`
                          : 'none',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 24,
                      textAlign: 'right',
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '0.63rem',
                      fontWeight: 600,
                      color: result.meetsThreshold ? barColor : 'rgba(0,212,255,0.35)',
                      flexShrink: 0,
                    }}
                  >
                    {result.yesCount}/{result.total}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Risk summary panel */}
          <div
            style={{
              background: 'rgba(0,212,255,0.03)',
              border: '1px solid rgba(0,212,255,0.15)',
              borderRadius: 8,
              padding: '10px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    letterSpacing: '0.12em',
                    color: '#00d4ff',
                    marginBottom: 4,
                  }}
                >
                  WYNIK BADANIA:
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    fontFamily: 'var(--font-geist-mono)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    letterSpacing: '0.1em',
                    color: '#050510',
                    background: riskColor,
                    borderRadius: 4,
                    padding: '2px 10px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}
                >
                  {riskLabel}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: 'rgba(0,212,255,0.4)',
                    marginTop: 5,
                  }}
                >
                  Wykryto {thresholdCount} {thresholdCount === 1 ? 'wzorzec' : 'wzorce'} z {totalPatterns} badanych
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 800,
                    fontSize: '2.2rem',
                    color: riskColor,
                    lineHeight: 1,
                    textShadow: `0 0 12px ${riskColor}44`,
                  }}
                >
                  {cpsResult.overallConfidence}%
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: 'rgba(0,212,255,0.35)',
                    letterSpacing: '0.1em',
                    marginTop: 2,
                  }}
                >
                  PEWNOSC
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: 'center',
              marginTop: 10,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(0,212,255,0.2)',
                letterSpacing: '0.08em',
              }}
            >
              RENTGEN CPS v2.0 | PODTEKST DIAGNOSTICS | 2026
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: '#00d4ff',
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.2)',
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
