'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis } from '@/lib/analysis/types';

interface RedFlagCardProps {
  quantitative: QuantitativeAnalysis;
  qualitative?: QualitativeAnalysis;
  participants: string[];
}

interface FlagLine {
  text: string;
  severity: 'mild' | 'moderate' | 'severe';
}

function buildFlags(
  q: QuantitativeAnalysis,
  qual: QualitativeAnalysis | undefined,
  participants: string[],
): FlagLine[] {
  const flags: FlagLine[] = [];

  // From AI analysis red flags
  if (qual?.pass2?.red_flags) {
    for (const rf of qual.pass2.red_flags.slice(0, 3)) {
      flags.push({ text: rf.pattern, severity: rf.severity });
    }
  }

  // From ghost risk data
  if (q.viralScores?.ghostRisk) {
    for (const name of participants) {
      const risk = q.viralScores.ghostRisk[name];
      if (risk && risk.score > 60) {
        flags.push({
          text: `Ryzyko ghostingu ${name.split(' ')[0]}: ${risk.score}/100`,
          severity: risk.score > 80 ? 'severe' : 'moderate',
        });
      }
    }
  }

  // Response time imbalance
  if (q.timing?.perPerson) {
    const times = participants.map((n) => q.timing.perPerson[n]?.medianResponseTimeMs ?? 0);
    if (times.length === 2 && times[0] > 0 && times[1] > 0) {
      const maxTime = times.reduce((a, b) => a > b ? a : b, times[0]);
      const minTime = times.reduce((a, b) => a < b ? a : b, times[0]);
      const ratio = maxTime / Math.max(minTime, 1);
      if (ratio > 3) {
        const slower = participants[times.indexOf(maxTime)];
        flags.push({
          text: `${slower.split(' ')[0]} odpowiada ${ratio.toFixed(1)}x wolniej`,
          severity: ratio > 5 ? 'severe' : 'moderate',
        });
      }
    }
  }

  // Initiation imbalance
  if (q.timing?.conversationInitiations) {
    const inits = participants.map((n) => q.timing.conversationInitiations[n] ?? 0);
    const total = inits.reduce((a, b) => a + b, 0);
    if (total > 10) {
      const maxInit = inits.reduce((a, b) => a > b ? a : b, inits[0]);
      const pct = Math.round((maxInit / total) * 100);
      if (pct > 75) {
        const initiator = participants[inits.indexOf(maxInit)];
        flags.push({
          text: `${initiator.split(' ')[0]} inicjuje ${pct}% rozmów`,
          severity: pct > 85 ? 'severe' : 'moderate',
        });
      }
    }
  }

  return flags.slice(0, 5);
}

function getSeverityLabel(flags: FlagLine[]): { label: string; color: string } {
  const severe = flags.filter((f) => f.severity === 'severe').length;
  const moderate = flags.filter((f) => f.severity === 'moderate').length;
  if (severe >= 2) return { label: 'KRYTYCZNY', color: '#dc2626' };
  if (severe >= 1 || moderate >= 2) return { label: 'POWAŻNY', color: '#ea580c' };
  if (moderate >= 1) return { label: 'UMIARKOWANY', color: '#d97706' };
  return { label: 'NISKI', color: '#16a34a' };
}

function getSeverityDot(severity: 'mild' | 'moderate' | 'severe'): string {
  if (severity === 'severe') return '#dc2626';
  if (severity === 'moderate') return '#d97706';
  return '#eab308';
}

export default function RedFlagCard({ quantitative, qualitative, participants }: RedFlagCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-redflag');

  const flags = buildFlags(quantitative, qualitative, participants);
  const { label: classLabel, color: classColor } = getSeverityLabel(flags);
  const dateStr = new Date().toLocaleDateString('pl-PL');
  const delusionScore = quantitative.viralScores?.delusionScore ?? 0;

  const mono = 'var(--font-geist-mono)';
  const syne = 'var(--font-syne)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#0c0c0c',
          borderRadius: 4,
          padding: '24px 22px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          fontFamily: mono,
          color: '#e5e5e5',
        }}
      >
        {/* Red corner accents */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 60,
            height: 60,
            borderLeft: '3px solid #dc2626',
            borderTop: '3px solid #dc2626',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 60,
            height: 60,
            borderRight: '3px solid #dc2626',
            borderBottom: '3px solid #dc2626',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />

        {/* CLASSIFIED stamp — rotated */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-22deg)',
            fontFamily: syne,
            fontSize: '3.2rem',
            fontWeight: 900,
            color: 'rgba(220, 38, 38, 0.08)',
            letterSpacing: '0.15em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          TAJNE
        </div>

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span
              style={{
                fontFamily: syne,
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#dc2626',
                letterSpacing: '0.05em',
              }}
            >
              RAPORT CZERWONYCH FLAG
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: 2,
              background: 'linear-gradient(90deg, #dc2626, transparent)',
            }}
          />
        </div>

        {/* Document meta */}
        <div
          style={{
            fontSize: '0.63rem',
            color: '#888',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div>
            <span style={{ color: '#555' }}>OSOBY: </span>
            <span style={{ color: '#ccc' }}>{participants.join(' & ')}</span>
          </div>
          <div>
            <span style={{ color: '#555' }}>DATA: </span>
            <span style={{ color: '#ccc' }}>{dateStr}</span>
          </div>
          <div>
            <span style={{ color: '#555' }}>KLASYFIKACJA: </span>
            <span
              style={{
                color: classColor,
                fontWeight: 700,
                padding: '1px 8px',
                border: `1px solid ${classColor}`,
                borderRadius: 3,
                fontSize: '0.63rem',
              }}
            >
              {classLabel}
            </span>
          </div>
        </div>

        {/* Flags list */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: '0.63rem',
              letterSpacing: '0.15em',
              color: '#555',
              marginBottom: 2,
            }}
          >
            WYKRYTE FLAGI:
          </div>
          {flags.map((flag, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 10px',
                background: 'rgba(220, 38, 38, 0.05)',
                border: '1px solid rgba(220, 38, 38, 0.15)',
                borderRadius: 4,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: getSeverityDot(flag.severity),
                  flexShrink: 0,
                  marginTop: 3,
                }}
              />
              <div>
                <div style={{ fontSize: '0.68rem', color: '#ddd', lineHeight: 1.4 }}>
                  {flag.text}
                </div>
                <div
                  style={{
                    fontSize: '0.63rem',
                    color: getSeverityDot(flag.severity),
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginTop: 2,
                  }}
                >
                  {flag.severity}
                </div>
              </div>
            </div>
          ))}

          {flags.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: 20,
                fontSize: '0.7rem',
                color: '#16a34a',
              }}
            >
              ✅ Brak czerwonych flag wykrytych
            </div>
          )}
        </div>

        {/* Verdict */}
        <div
          style={{
            borderTop: '1px solid rgba(220, 38, 38, 0.2)',
            paddingTop: 12,
            marginTop: 12,
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: '0.63rem',
              letterSpacing: '0.15em',
              color: '#555',
              marginBottom: 6,
            }}
          >
            WERDYKT
          </div>
          <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>
            {flags.length >= 3 ? '🚩🚩🚩' : flags.length >= 2 ? '🚩🚩' : flags.length >= 1 ? '🚩' : '✅'}
          </div>
          {delusionScore > 0 && (
            <div
              style={{
                fontSize: '0.63rem',
                color: '#666',
                marginTop: 8,
              }}
            >
              Indeks złudzeń: {delusionScore}/100
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: 10,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: 'rgba(255,255,255,0.35)',
              marginBottom: 4,
              lineHeight: 1.4,
            }}
          >
            Wskaźniki algorytmiczne — nie stanowią profesjonalnej oceny
          </div>
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            podtekst.app
          </span>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '📥 Pobierz raport'}
      </button>
    </div>
  );
}
