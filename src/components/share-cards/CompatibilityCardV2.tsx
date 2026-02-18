'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { ViralScores } from '@/lib/parsers/types';

interface CompatibilityCardV2Props {
  viralScores: ViralScores;
  participants: string[];
}

function getVerdict(score: number): { text: string; emoji: string } {
  if (score >= 90) return { text: 'Bratnie dusze', emoji: '💫' };
  if (score >= 75) return { text: 'Idealny duet', emoji: '💕' };
  if (score >= 60) return { text: 'Dobre wibracje', emoji: '✨' };
  if (score >= 45) return { text: 'Może się uda', emoji: '🤷' };
  if (score >= 30) return { text: 'To skomplikowane', emoji: '😬' };
  return { text: 'Tykająca bomba', emoji: '💣' };
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#eab308';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

export default function CompatibilityCardV2({ viralScores, participants }: CompatibilityCardV2Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'chatscope-compatibility');

  const score = viralScores.compatibilityScore;
  const verdict = getVerdict(score);
  const scoreColor = getScoreColor(score);
  const nameA = participants[0]?.split(' ')[0] ?? 'A';
  const nameB = participants[1]?.split(' ')[0] ?? 'B';
  const interestA = viralScores.interestScores?.[participants[0]] ?? 50;
  const interestB = viralScores.interestScores?.[participants[1]] ?? 50;

  const syne = 'var(--font-syne)';
  const mono = 'var(--font-geist-mono)';
  const grotesk = 'var(--font-space-grotesk)';

  // SVG ring
  const r = 72;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 360,
          background: '#0a0a0a',
          borderRadius: 16,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          border: '2px solid #1a1a1a',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${scoreColor}15 0%, transparent 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Names row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Person A avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6d9fff, #4a6fcc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: syne,
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {nameA[0]}
          </div>

          <span
            style={{
              fontFamily: mono,
              fontSize: '0.5rem',
              color: '#444',
              letterSpacing: '0.1em',
            }}
          >
            ×
          </span>

          {/* Person B avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #b38cff, #8a5fd4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: syne,
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {nameB[0]}
          </div>
        </div>

        {/* Score ring */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 12 }}>
          <svg width={170} height={170} style={{ display: 'block' }}>
            {/* Background circle */}
            <circle
              cx={85}
              cy={85}
              r={r}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth={8}
            />
            {/* Score arc */}
            <circle
              cx={85}
              cy={85}
              r={r}
              fill="none"
              stroke={scoreColor}
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform={`rotate(-90 85 85)`}
              style={{ filter: `drop-shadow(0 0 6px ${scoreColor}40)` }}
            />
          </svg>
          {/* Score text */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: syne,
                fontSize: '2.8rem',
                fontWeight: 900,
                color: scoreColor,
                lineHeight: 1,
              }}
            >
              {score}
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.5rem', color: '#555' }}>/ 100</div>
          </div>
        </div>

        {/* Verdict */}
        <div
          style={{
            fontFamily: grotesk,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#ddd',
            textAlign: 'center',
            marginBottom: 14,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {verdict.emoji} {verdict.text}
        </div>

        {/* Interest bars */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#6d9fff', width: 50, textAlign: 'right' }}>
              {nameA}
            </span>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
              <div style={{ width: `${interestA}%`, height: '100%', background: '#6d9fff', borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#6d9fff', width: 28 }}>
              {interestA}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#b38cff', width: 50, textAlign: 'right' }}>
              {nameB}
            </span>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
              <div style={{ width: `${interestB}%`, height: '100%', background: '#b38cff', borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: mono, fontSize: '0.5rem', color: '#b38cff', width: 28 }}>
              {interestB}%
            </span>
          </div>
          <div style={{ fontFamily: mono, fontSize: '0.42rem', color: '#444', textAlign: 'center', marginTop: 2 }}>
            poziom zainteresowania
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            fontFamily: mono,
            fontSize: '0.42rem',
            color: 'rgba(255,255,255,0.15)',
            letterSpacing: '0.12em',
          }}
        >
          chatscope.app
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '📥 Pobierz kartę'}
      </button>
    </div>
  );
}
