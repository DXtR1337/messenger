'use client';

import { useRef } from 'react';
import ShareCardShell from './ShareCardShell';
import { useCardDownload } from './useCardDownload';
import {
  type CPSResult,
  CPS_PATTERNS,
  getOverallRiskLevel,
} from '@/lib/analysis/communication-patterns';

interface CPSCardProps {
  cpsResult: CPSResult;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  niski: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10b981' },
  umiarkowany: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
  'podwyższony': { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', text: '#f97316' },
  wysoki: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
};

const RISK_LABELS: Record<string, string> = {
  niski: 'NISKIE',
  umiarkowany: 'UMIARKOWANE',
  'podwyższony': 'PODWYŻSZONE',
  wysoki: 'WYSOKIE',
};

export default function CPSCard({ cpsResult }: CPSCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-cps');

  const risk = getOverallRiskLevel(cpsResult.patterns);
  const riskStyle = RISK_COLORS[risk.level] ?? RISK_COLORS.niski;
  const riskLabel = RISK_LABELS[risk.level] ?? 'NISKIE';
  const thresholdCount = Object.values(cpsResult.patterns).filter(r => r.meetsThreshold).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <ShareCardShell
        cardRef={cardRef}
        gradient="linear-gradient(160deg, #0a0a1a 0%, #1a0a0e 30%, #12082a 60%, #0a0818 100%)"
      >
        {/* Title section */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div
            style={{
              fontFamily: 'var(--font-jetbrains-mono)',
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#f97316',
              textShadow: '0 0 12px rgba(249,115,22,0.3)',
            }}
          >
            WZORCE KOMUNIKACJI
          </div>
          <div
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.6rem',
              color: 'rgba(255,255,255,0.4)',
              marginTop: 6,
            }}
          >
            Analiza dla: {cpsResult.participantName}
          </div>
        </div>

        {/* Pattern bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          {CPS_PATTERNS.map(pattern => {
            const result = cpsResult.patterns[pattern.key];
            if (!result) return null;

            return (
              <div
                key={pattern.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 6px',
                  borderRadius: 4,
                  border: result.meetsThreshold ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                  background: result.meetsThreshold ? 'rgba(239,68,68,0.05)' : 'transparent',
                }}
              >
                {/* Pattern name */}
                <div
                  style={{
                    width: 100,
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.48rem',
                    color: result.meetsThreshold ? '#fca5a5' : 'rgba(255,255,255,0.55)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {pattern.name}
                </div>

                {/* Bar track */}
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, result.percentage)}%`,
                      height: '100%',
                      borderRadius: 4,
                      background: result.meetsThreshold
                        ? `linear-gradient(90deg, ${pattern.color}, #ef4444)`
                        : pattern.color,
                      boxShadow: result.percentage > 50
                        ? `0 0 6px ${pattern.color}44`
                        : 'none',
                    }}
                  />
                </div>

                {/* Score */}
                <div
                  style={{
                    width: 30,
                    textAlign: 'right',
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: '0.46rem',
                    fontWeight: 600,
                    color: result.meetsThreshold ? '#fca5a5' : 'rgba(255,255,255,0.45)',
                    flexShrink: 0,
                  }}
                >
                  {result.yesCount}/{result.total}
                </div>
              </div>
            );
          })}
        </div>

        {/* Risk summary */}
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            borderRadius: 8,
            background: riskStyle.bg,
            border: `1px solid ${riskStyle.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontWeight: 800,
                fontSize: '0.52rem',
                letterSpacing: '0.1em',
                color: riskStyle.text,
                textTransform: 'uppercase',
              }}
            >
              RYZYKO: {riskLabel}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.44rem',
                color: 'rgba(255,255,255,0.35)',
                marginTop: 2,
              }}
            >
              {thresholdCount > 0
                ? `${thresholdCount} ${thresholdCount === 1 ? 'wzorzec wymaga' : 'wzorce wymagają'} uwagi`
                : 'Brak wzorców powyżej progu'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontWeight: 800,
                fontSize: '1.1rem',
                color: riskStyle.text,
                lineHeight: 1,
              }}
            >
              {cpsResult.overallConfidence}%
            </div>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.38rem',
                color: 'rgba(255,255,255,0.3)',
                marginTop: 2,
              }}
            >
              PEWNOŚĆ
            </div>
          </div>
        </div>
      </ShareCardShell>

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
