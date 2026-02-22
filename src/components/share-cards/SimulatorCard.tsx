'use client';

import { useRef } from 'react';
import type { RefObject } from 'react';
import { useCardDownload } from './useCardDownload';

// ============================================================
// Types
// ============================================================

export interface SimulatorExchange {
  role: 'user' | 'target';
  message: string;
}

interface SimulatorCardProps {
  cardRef: RefObject<HTMLDivElement | null>;
  exchanges: SimulatorExchange[];
  targetPerson: string;
  confidence: number;
  totalMessages?: number;
}

// ============================================================
// Helpers
// ============================================================

const GOLD = '#d4a847';
const MYSTIC_BLUE = '#6366f1';
const BG = '#0a0515';
const SYNE = 'var(--font-syne)';
const MONO = 'var(--font-geist-mono)';
const GROTESK = 'var(--font-space-grotesk)';

function getConfidenceTier(c: number): { label: string; filled: number } {
  if (c >= 85) return { label: 'Pewna', filled: 5 };
  if (c >= 70) return { label: 'Wyrazista', filled: 4 };
  if (c >= 50) return { label: 'Przejrzysta', filled: 3 };
  if (c >= 30) return { label: 'Mglisty', filled: 2 };
  return { label: 'Niejasna', filled: 1 };
}

// ============================================================
// Component
// ============================================================

export default function SimulatorCard({
  cardRef,
  exchanges,
  targetPerson,
  confidence,
  totalMessages,
}: SimulatorCardProps) {
  const downloadRef = useRef<HTMLDivElement>(null);
  const actualRef = cardRef ?? downloadRef;
  const { download, isDownloading } = useCardDownload(actualRef, 'podtekst-symulator', {
    backgroundColor: BG,
  });

  const lastUserMsg = [...exchanges].reverse().find((e) => e.role === 'user');
  const lastTargetMsg = [...exchanges].reverse().find((e) => e.role === 'target');

  const userText = lastUserMsg
    ? lastUserMsg.message.length > 80
      ? lastUserMsg.message.slice(0, 77) + '...'
      : lastUserMsg.message
    : '';

  const predictionText = lastTargetMsg
    ? lastTargetMsg.message.length > 120
      ? lastTargetMsg.message.slice(0, 117) + '...'
      : lastTargetMsg.message
    : '';

  const tier = getConfidenceTier(confidence);

  // Star field positions (deterministic)
  const stars = [
    { x: 12, y: 45, s: 1.2 }, { x: 340, y: 80, s: 0.8 }, { x: 25, y: 200, s: 1.0 },
    { x: 335, y: 180, s: 0.7 }, { x: 18, y: 340, s: 0.9 }, { x: 345, y: 300, s: 1.1 },
    { x: 15, y: 450, s: 0.6 }, { x: 340, y: 420, s: 0.8 }, { x: 30, y: 550, s: 1.0 },
    { x: 330, y: 530, s: 0.7 }, { x: 50, y: 100, s: 0.5 }, { x: 310, y: 140, s: 0.6 },
    { x: 45, y: 490, s: 0.5 }, { x: 315, y: 470, s: 0.4 },
  ];

  // Moon phase SVGs along sides
  const moonPhases = [
    { x: 8, y: 130, phase: 'new' },
    { x: 8, y: 270, phase: 'crescent' },
    { x: 8, y: 410, phase: 'half' },
    { x: 344, y: 130, phase: 'half' },
    { x: 344, y: 270, phase: 'gibbous' },
    { x: 344, y: 410, phase: 'full' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={actualRef}
        style={{
          width: 360,
          height: 640,
          background: BG,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cosmic radial gradient background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 35%, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 30%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Star field & zodiac border decorations */}
        <svg
          width="360"
          height="640"
          viewBox="0 0 360 640"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
        >
          {/* Stars */}
          {stars.map((st, i) => (
            <circle
              key={`star-${i}`}
              cx={st.x}
              cy={st.y}
              r={st.s}
              fill={GOLD}
              opacity={0.4 + (i % 3) * 0.15}
            />
          ))}
          {/* Sparkle crosses on some stars */}
          {stars.filter((_, i) => i % 3 === 0).map((st, i) => (
            <g key={`sparkle-${i}`} opacity={0.3}>
              <line x1={st.x - 3} y1={st.y} x2={st.x + 3} y2={st.y} stroke={GOLD} strokeWidth={0.5} />
              <line x1={st.x} y1={st.y - 3} x2={st.x} y2={st.y + 3} stroke={GOLD} strokeWidth={0.5} />
            </g>
          ))}
          {/* Moon phases along sides */}
          {moonPhases.map((mp, i) => {
            const r = 4;
            if (mp.phase === 'new') {
              return (
                <circle key={`moon-${i}`} cx={mp.x} cy={mp.y} r={r} fill="none" stroke={`${GOLD}44`} strokeWidth={0.5} />
              );
            }
            if (mp.phase === 'crescent') {
              return (
                <g key={`moon-${i}`}>
                  <circle cx={mp.x} cy={mp.y} r={r} fill={`${GOLD}22`} />
                  <path d={`M ${mp.x} ${mp.y - r} A ${r} ${r} 0 0 1 ${mp.x} ${mp.y + r} A ${r * 0.5} ${r} 0 0 0 ${mp.x} ${mp.y - r}`} fill={`${GOLD}55`} />
                </g>
              );
            }
            if (mp.phase === 'half') {
              return (
                <g key={`moon-${i}`}>
                  <circle cx={mp.x} cy={mp.y} r={r} fill={`${GOLD}22`} />
                  <path d={`M ${mp.x} ${mp.y - r} A ${r} ${r} 0 0 1 ${mp.x} ${mp.y + r} L ${mp.x} ${mp.y - r}`} fill={`${GOLD}55`} />
                </g>
              );
            }
            if (mp.phase === 'gibbous') {
              return (
                <g key={`moon-${i}`}>
                  <circle cx={mp.x} cy={mp.y} r={r} fill={`${GOLD}55`} />
                  <path d={`M ${mp.x} ${mp.y - r} A ${r * 0.5} ${r} 0 0 0 ${mp.x} ${mp.y + r} A ${r} ${r} 0 0 0 ${mp.x} ${mp.y - r}`} fill={`${GOLD}22`} />
                </g>
              );
            }
            // full
            return (
              <circle key={`moon-${i}`} cx={mp.x} cy={mp.y} r={r} fill={`${GOLD}55`} />
            );
          })}
          {/* Thin zodiac border lines */}
          <line x1={20} y1={30} x2={340} y2={30} stroke={`${GOLD}22`} strokeWidth={0.5} />
          <line x1={20} y1={610} x2={340} y2={610} stroke={`${GOLD}22`} strokeWidth={0.5} />
          <line x1={20} y1={30} x2={20} y2={610} stroke={`${GOLD}22`} strokeWidth={0.5} />
          <line x1={340} y1={30} x2={340} y2={610} stroke={`${GOLD}22`} strokeWidth={0.5} />
        </svg>

        {/* Content container */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '28px 28px 20px',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div
              style={{
                fontFamily: SYNE,
                fontWeight: 800,
                fontSize: '1.0rem',
                color: GOLD,
                letterSpacing: '0.22em',
                textTransform: 'uppercase' as const,
                textShadow: `0 0 12px ${GOLD}44`,
              }}
            >
              {'✧ WYROCZNIA PODTEKST ✧'}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: `${GOLD}88`,
                letterSpacing: '0.12em',
                marginTop: 4,
              }}
            >
              SYMULACJA DLA: {targetPerson.toUpperCase()}
            </div>
          </div>

          {/* Crystal Ball */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
            <div style={{ position: 'relative', width: 130, height: 130 }}>
              {/* Outer glow */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 150,
                  height: 150,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${MYSTIC_BLUE}25 0%, ${MYSTIC_BLUE}08 40%, transparent 70%)`,
                  pointerEvents: 'none',
                }}
              />
              {/* Ball SVG */}
              <svg width="130" height="130" viewBox="0 0 130 130" style={{ display: 'block' }}>
                <defs>
                  {/* Glass gradient */}
                  <radialGradient id="ball-glass" cx="40%" cy="35%" r="60%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                    <stop offset="30%" stopColor="rgba(139,92,246,0.08)" />
                    <stop offset="60%" stopColor="rgba(99,102,241,0.15)" />
                    <stop offset="100%" stopColor="rgba(30,20,60,0.3)" />
                  </radialGradient>
                  {/* Mist layer 1 */}
                  <radialGradient id="mist1" cx="50%" cy="55%" r="45%">
                    <stop offset="0%" stopColor="rgba(139,92,246,0.2)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  {/* Mist layer 2 */}
                  <radialGradient id="mist2" cx="35%" cy="60%" r="35%">
                    <stop offset="0%" stopColor="rgba(99,102,241,0.15)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  {/* Mist layer 3 */}
                  <radialGradient id="mist3" cx="65%" cy="45%" r="30%">
                    <stop offset="0%" stopColor="rgba(168,85,247,0.12)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                  {/* Highlight */}
                  <radialGradient id="highlight" cx="30%" cy="25%" r="25%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
                {/* Ball outline */}
                <circle cx="65" cy="65" r="58" fill="url(#ball-glass)" stroke={`${GOLD}44`} strokeWidth="1.5" />
                {/* Swirling mist layers */}
                <circle cx="65" cy="68" r="50" fill="url(#mist1)" />
                <circle cx="55" cy="72" r="40" fill="url(#mist2)" />
                <circle cx="75" cy="58" r="35" fill="url(#mist3)" />
                {/* Glass highlight */}
                <circle cx="45" cy="40" r="20" fill="url(#highlight)" />
                {/* Inner ring */}
                <circle cx="65" cy="65" r="50" fill="none" stroke={`${MYSTIC_BLUE}22`} strokeWidth="0.5" />
              </svg>
              {/* Prediction text inside ball */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 86,
                  textAlign: 'center',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    fontFamily: GROTESK,
                    fontSize: '0.68rem',
                    lineHeight: 1.35,
                    color: 'rgba(255,255,255,0.75)',
                    display: '-webkit-box',
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical' as const,
                    overflow: 'hidden',
                    wordBreak: 'break-word' as const,
                  }}
                >
                  {predictionText.length > 60 ? predictionText.slice(0, 57) + '...' : predictionText}
                </span>
              </div>
              {/* Ball base / pedestal */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 50,
                  height: 8,
                  borderRadius: '50%',
                  background: `linear-gradient(180deg, ${GOLD}33 0%, ${GOLD}11 100%)`,
                  border: `0.5px solid ${GOLD}44`,
                }}
              />
            </div>
          </div>

          {/* Prediction section */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* PRZEPOWIEDNIA label */}
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.72rem',
                fontWeight: 700,
                color: GOLD,
                letterSpacing: '0.18em',
                textAlign: 'center',
              }}
            >
              PRZEPOWIEDNIA:
            </div>

            {/* Original message box */}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${GOLD}22`,
                borderRadius: 6,
                padding: '8px 12px',
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.63rem',
                  color: `${GOLD}88`,
                  letterSpacing: '0.08em',
                  marginBottom: 4,
                }}
              >
                Pytasz:
              </div>
              <div
                style={{
                  fontFamily: GROTESK,
                  fontSize: '0.72rem',
                  lineHeight: 1.4,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {userText || '...'}
              </div>
            </div>

            {/* Arrow down with sparkles */}
            <div style={{ textAlign: 'center', lineHeight: 1 }}>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: '0.82rem',
                  color: `${GOLD}66`,
                  letterSpacing: '0.3em',
                }}
              >
                {'✧ \u2193 ✧'}
              </span>
            </div>

            {/* Predicted reply - mystical box */}
            <div
              style={{
                background: `linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)`,
                border: `1px solid ${MYSTIC_BLUE}44`,
                borderRadius: 8,
                padding: '10px 14px',
                boxShadow: `0 0 16px ${MYSTIC_BLUE}15, inset 0 0 20px ${MYSTIC_BLUE}08`,
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.63rem',
                  color: `${MYSTIC_BLUE}99`,
                  letterSpacing: '0.08em',
                  marginBottom: 5,
                }}
              >
                {targetPerson} odpowie:
              </div>
              <div
                style={{
                  fontFamily: GROTESK,
                  fontSize: '0.78rem',
                  lineHeight: 1.45,
                  color: 'rgba(255,255,255,0.85)',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{predictionText}&rdquo;
              </div>
            </div>

            {/* Confidence oracle */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.65rem',
                  color: `${GOLD}cc`,
                  letterSpacing: '0.06em',
                }}
              >
                Jasność wizji: {confidence}%
              </div>

              {/* Crystal gems */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((level) => {
                  const filled = level <= tier.filled;
                  return (
                    <svg key={level} width="16" height="20" viewBox="0 0 16 20">
                      <polygon
                        points="8,0 16,7 12,20 4,20 0,7"
                        fill={filled ? GOLD : 'transparent'}
                        stroke={filled ? GOLD : `${GOLD}44`}
                        strokeWidth={0.8}
                        opacity={filled ? 0.85 : 0.3}
                      />
                      {filled && (
                        <polygon
                          points="8,2 14,7 11,18 5,18 2,7"
                          fill="none"
                          stroke="rgba(255,255,255,0.2)"
                          strokeWidth={0.3}
                        />
                      )}
                    </svg>
                  );
                })}
              </div>

              {/* Tier label */}
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.63rem',
                  color: `${GOLD}88`,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase' as const,
                }}
              >
                {tier.label}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <div
              style={{
                fontFamily: GROTESK,
                fontSize: '0.65rem',
                fontStyle: 'italic',
                color: `${GOLD}88`,
                letterSpacing: '0.04em',
              }}
            >
              ~ przyszłość zapisana w wiadomościach ~
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.35)',
                marginTop: 4,
                letterSpacing: '0.06em',
              }}
            >
              podtekst.app
              {totalMessages !== undefined && ` \u2022 ${totalMessages.toLocaleString('pl-PL')} wiadomości`}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        style={{
          fontFamily: GROTESK,
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
