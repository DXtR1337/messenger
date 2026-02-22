'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import ShareCardShell from './ShareCardShell';
import type { ViralScores } from '@/lib/parsers/types';

interface CompatibilityCardV2Props {
  viralScores: ViralScores;
  participants: string[];
}

function getVerdict(score: number): { text: string; emoji: string } {
  if (score >= 90) return { text: 'Bratnie dusze', emoji: '\u{1F4AB}' };
  if (score >= 75) return { text: 'Idealny duet', emoji: '\u{1F495}' };
  if (score >= 60) return { text: 'Dobre wibracje', emoji: '\u{2728}' };
  if (score >= 45) return { text: 'Mo\u017Ce si\u0119 uda', emoji: '\u{1F937}' };
  if (score >= 30) return { text: 'To skomplikowane', emoji: '\u{1F62C}' };
  return { text: 'Tykaj\u0105ca bomba', emoji: '\u{1F4A3}' };
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#eab308';
  if (score >= 30) return '#f97316';
  return '#ef4444';
}

export default function CompatibilityCardV2({ viralScores, participants }: CompatibilityCardV2Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-compatibility');

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

  // SVG ring dimensions
  const r = 88;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);

  // Outer decorative ring
  const rOuter = 96;
  const circOuter = 2 * Math.PI * rOuter;
  const offsetOuter = circOuter * 0.25; // decorative partial arc

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <ShareCardShell cardRef={cardRef}>
        {/* Glow — centered, larger and more visible */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${scoreColor}25 0%, transparent 70%)`,
            filter: 'blur(50px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Title */}
        <div
          style={{
            fontFamily: syne,
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.25em',
            textTransform: 'uppercase' as const,
            color: 'rgba(255,255,255,0.45)',
            textAlign: 'center',
            marginBottom: 4,
            position: 'relative',
            zIndex: 1,
          }}
        >
          KOMPATYBILNO\u015A\u0106
        </div>

        {/* Dramatic tagline */}
        <div
          style={{
            fontFamily: grotesk,
            fontSize: '0.63rem',
            fontWeight: 600,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.35)',
            textAlign: 'center',
            marginBottom: 20,
            letterSpacing: '0.06em',
            position: 'relative',
            zIndex: 1,
          }}
        >
          Czy to match?
        </div>

        {/* Names row with larger avatar circles and gradient border rings */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            marginBottom: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Person A avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6d9fff, #4a6fcc)',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6d9fff, #4a6fcc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: syne,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#fff',
                  boxShadow: '0 0 20px rgba(109,159,255,0.3)',
                }}
              >
                {nameA[0]}
              </div>
            </div>
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#6d9fff', fontWeight: 600 }}>{nameA}</span>
          </div>

          <span
            style={{
              fontFamily: mono,
              fontSize: '0.7rem',
              color: '#444',
              letterSpacing: '0.1em',
              marginBottom: 16,
            }}
          >
            &times;
          </span>

          {/* Person B avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #b38cff, #8a5fd4)',
                padding: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #b38cff, #8a5fd4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: syne,
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#fff',
                  boxShadow: '0 0 20px rgba(179,140,255,0.3)',
                }}
              >
                {nameB[0]}
              </div>
            </div>
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#b38cff', fontWeight: 600 }}>{nameB}</span>
          </div>
        </div>

        {/* Score ring with decorative outer gradient ring */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
          <svg width={210} height={210} style={{ display: 'block' }}>
            <defs>
              <linearGradient id="outerRingGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            {/* Decorative outer gradient ring */}
            <circle
              cx={105}
              cy={105}
              r={rOuter}
              fill="none"
              stroke="url(#outerRingGrad)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={circOuter}
              strokeDashoffset={offsetOuter}
              transform={`rotate(-90 105 105)`}
              opacity={0.35}
            />
            {/* Background circle */}
            <circle
              cx={105}
              cy={105}
              r={r}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth={10}
            />
            {/* Score arc */}
            <circle
              cx={105}
              cy={105}
              r={r}
              fill="none"
              stroke={scoreColor}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform={`rotate(-90 105 105)`}
              style={{ filter: `drop-shadow(0 0 12px ${scoreColor}50)` }}
            />
          </svg>
          {/* Score text — bigger, white with colored shadow */}
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
                fontSize: '4rem',
                fontWeight: 900,
                color: '#ffffff',
                lineHeight: 1,
                textShadow: `0 0 30px ${scoreColor}, 0 0 60px ${scoreColor}80`,
              }}
            >
              {score}
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.7rem', color: '#555', marginTop: 2 }}>/ 100</div>
          </div>
        </div>

        {/* Verdict with gradient background pill */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 24,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: grotesk,
              fontSize: '1.2rem',
              fontWeight: 600,
              color: '#fff',
              textAlign: 'center',
              padding: '8px 24px',
              borderRadius: 9999,
              background: `linear-gradient(135deg, ${scoreColor}18, ${scoreColor}08)`,
              border: `1px solid ${scoreColor}25`,
              backdropFilter: 'blur(4px)',
            }}
          >
            {verdict.emoji} {verdict.text}
          </div>
        </div>

        {/* Interest bars — taller, with glow and percentage overlay */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#6d9fff', width: 50, textAlign: 'right', fontWeight: 600 }}>
              {nameA}
            </span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#1a1a1a', overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${interestA}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4a6fcc, #6d9fff)',
                  borderRadius: 4,
                  boxShadow: '0 0 10px rgba(109,159,255,0.4)',
                  position: 'relative',
                }}
              />
            </div>
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#6d9fff', width: 28, fontWeight: 700 }}>
              {interestA}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#b38cff', width: 50, textAlign: 'right', fontWeight: 600 }}>
              {nameB}
            </span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#1a1a1a', overflow: 'hidden', position: 'relative' }}>
              <div
                style={{
                  width: `${interestB}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8a5fd4, #b38cff)',
                  borderRadius: 4,
                  boxShadow: '0 0 10px rgba(179,140,255,0.4)',
                  position: 'relative',
                }}
              />
            </div>
            <span style={{ fontFamily: mono, fontSize: '0.63rem', color: '#b38cff', width: 28, fontWeight: 700 }}>
              {interestB}%
            </span>
          </div>
          <div style={{ fontFamily: mono, fontSize: '0.63rem', color: '#444', textAlign: 'center', marginTop: 4 }}>
            poziom zainteresowania
          </div>
        </div>
      </ShareCardShell>

      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '\u{1F4E5} Pobierz kart\u0119'}
      </button>
    </div>
  );
}
