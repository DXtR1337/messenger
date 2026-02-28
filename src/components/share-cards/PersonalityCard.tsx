'use client';

import { useRef, useState } from 'react';
import { useCardDownload } from './useCardDownload';
import type { PersonProfile } from '@/lib/analysis/types';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface PersonalityCardProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
  quantitative: QuantitativeAnalysis;
}

// ============================================================
// Constants
// ============================================================

const BG = '#0a0520';
const GOLD = '#d4a847';
const PURPLE_GLOW = '#7c3aed';
const STAR_WHITE = 'rgba(255,255,255,0.85)';
const SYNE = 'var(--font-syne)';
const MONO = 'var(--font-geist-mono)';
const GROTESK = 'var(--font-space-grotesk)';

// Mystical Polish names for attachment styles
const ATTACHMENT_MYSTICAL: Record<string, string> = {
  secure: 'Strażnik',
  anxious: 'Szukacz',
  avoidant: 'Unikacz',
  disorganized: 'Chaotyk',
  insufficient_data: 'Mgła',
};

// Archetype emoji mapping
const ARCHETYPE_EMOJIS: Record<string, string> = {
  // Communication styles
  direct: '\u2694\uFE0F',
  indirect: '\uD83C\uDF19',
  mixed: '\u2696\uFE0F',
  // Attachment styles
  secure: '\uD83D\uDEE1\uFE0F',
  anxious: '\uD83D\uDC94',
  avoidant: '\uD83D\uDE36\u200D\uD83C\uDF2B\uFE0F',
  disorganized: '\uD83C\uDF00',
  insufficient_data: '\u2753',
};

// Love language symbols
const LOVE_SYMBOLS: Record<string, string> = {
  words_of_affirmation: '\uD83D\uDCAC',
  quality_time: '\u231B',
  acts_of_service: '\uD83E\uDD1D',
  gifts_pebbling: '\uD83C\uDF81',
  physical_touch: '\uD83E\uDEF6',
};

// Big Five short labels (Polish abbreviations)
const BIG_FIVE_LABELS = ['Otw.', 'Sum.', 'Ekstr.', 'Ugod.', 'Neur.'];
const BIG_FIVE_KEYS: Array<keyof PersonProfile['big_five_approximation']> = [
  'openness',
  'conscientiousness',
  'extraversion',
  'agreeableness',
  'neuroticism',
];

// Deterministic star-field positions
const STAR_FIELD = [
  { x: 15, y: 25, o: 0.015 }, { x: 85, y: 42, o: 0.02 }, { x: 340, y: 35, o: 0.012 },
  { x: 290, y: 18, o: 0.018 }, { x: 45, y: 95, o: 0.01 }, { x: 320, y: 88, o: 0.015 },
  { x: 70, y: 155, o: 0.02 }, { x: 300, y: 148, o: 0.012 }, { x: 25, y: 215, o: 0.018 },
  { x: 338, y: 205, o: 0.01 }, { x: 55, y: 290, o: 0.015 }, { x: 310, y: 275, o: 0.02 },
  { x: 18, y: 365, o: 0.012 }, { x: 345, y: 350, o: 0.018 }, { x: 42, y: 430, o: 0.01 },
  { x: 325, y: 440, o: 0.015 }, { x: 60, y: 510, o: 0.02 }, { x: 290, y: 520, o: 0.012 },
  { x: 30, y: 580, o: 0.018 }, { x: 335, y: 570, o: 0.01 }, { x: 180, y: 50, o: 0.012 },
  { x: 200, y: 130, o: 0.01 }, { x: 160, y: 320, o: 0.015 }, { x: 230, y: 480, o: 0.012 },
  { x: 120, y: 600, o: 0.01 }, { x: 250, y: 610, o: 0.015 },
  { x: 95, y: 170, o: 0.2 }, { x: 275, y: 340, o: 0.18 },
  { x: 145, y: 555, o: 0.15 }, { x: 310, y: 115, o: 0.25 },
];

// Pentagon points for trait constellation (center at 130,130, radius ~70)
function getPentagonPoints(cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
  return Array.from({ length: 5 }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

// ============================================================
// Component
// ============================================================

export default function PersonalityCard({
  profiles,
  participants,
  quantitative,
}: PersonalityCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-personality', {
    backgroundColor: BG,
  });

  // Person picker state
  const availableParticipants = participants.filter((name) => profiles[name]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedName = availableParticipants[selectedIdx] ?? availableParticipants[0] ?? '';
  const profile = profiles[selectedName];

  if (!profile) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: MONO, fontSize: '0.72rem', textAlign: 'center', padding: 40 }}>
        Brak danych osobowości
      </div>
    );
  }

  const bigFive = profile.big_five_approximation;
  const attachment = profile.attachment_indicators?.primary_style ?? 'insufficient_data';
  const loveLanguage = profile.love_language;
  const commStyle = profile.communication_profile?.style ?? 'mixed';
  const mbti = profile.mbti;

  // Compute trait scores (average of range, scaled to 0-100)
  const traitScores = BIG_FIVE_KEYS.map((key) => {
    const trait = bigFive[key];
    const avg = (trait.range[0] + trait.range[1]) / 2;
    return Math.round((avg / 10) * 100);
  });

  // Archetype: use mystical attachment name or communication style as fallback
  const archetypeName = attachment !== 'insufficient_data'
    ? (ATTACHMENT_MYSTICAL[attachment] ?? attachment.charAt(0).toUpperCase() + attachment.slice(1))
    : commStyle.charAt(0).toUpperCase() + commStyle.slice(1);
  const archetypeEmoji = ARCHETYPE_EMOJIS[attachment] ?? ARCHETYPE_EMOJIS[commStyle] ?? '\u2728';

  // Pentagon constellation
  const pentCenter = { x: 130, y: 120 };
  const pentRadius = 68;
  const pentPoints = getPentagonPoints(pentCenter.x, pentCenter.y, pentRadius);

  // Attachment style label (Polish)
  const attachmentLabels: Record<string, string> = {
    secure: 'Bezpieczny',
    anxious: 'Lękowy',
    avoidant: 'Unikający',
    disorganized: 'Zdezorganizowany',
    insufficient_data: 'Brak danych',
  };

  // Love language label (Polish)
  const loveLabels: Record<string, string> = {
    words_of_affirmation: 'Słowa',
    quality_time: 'Czas',
    acts_of_service: 'Czyny',
    gifts_pebbling: 'Prezenty',
    physical_touch: 'Dotyk',
  };

  // Communication style label
  const commLabels: Record<string, string> = {
    direct: 'Bezpośredni',
    indirect: 'Pośredni',
    mixed: 'Mieszany',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: BG,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Radial glow background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 40%, ${PURPLE_GLOW}18 0%, ${PURPLE_GLOW}06 35%, transparent 65%)`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Star-field texture */}
        <svg
          width="360"
          height="640"
          viewBox="0 0 360 640"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
        >
          {STAR_FIELD.map((s, i) => (
            <circle key={`sf-${i}`} cx={s.x} cy={s.y} r={s.o >= 0.15 ? 1.5 : 1} fill="#ffffff" opacity={s.o} />
          ))}
        </svg>

        {/* Gold double border */}
        <div
          style={{
            position: 'absolute',
            inset: 10,
            border: `2px solid ${GOLD}55`,
            borderRadius: 8,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 14,
            border: `1px solid ${GOLD}33`,
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            padding: '18px 20px 14px',
          }}
        >
          {/* Header arch */}
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <svg width="260" height="36" viewBox="0 0 260 36" style={{ display: 'block', margin: '0 auto' }}>
              {/* Semi-circular arch */}
              <path
                d="M 10,35 Q 10,5 130,5 Q 250,5 250,35"
                fill="none"
                stroke={`${GOLD}55`}
                strokeWidth="1"
              />
              {/* Stars on arch */}
              <text x="30" y="22" fill={GOLD} fontSize="6" opacity="0.6" textAnchor="middle">{'\u2727'}</text>
              <text x="70" y="12" fill={GOLD} fontSize="5" opacity="0.5" textAnchor="middle">{'\u2726'}</text>
              <text x="130" y="8" fill={GOLD} fontSize="7" opacity="0.7" textAnchor="middle">{'\u2727'}</text>
              <text x="190" y="12" fill={GOLD} fontSize="5" opacity="0.5" textAnchor="middle">{'\u2726'}</text>
              <text x="230" y="22" fill={GOLD} fontSize="6" opacity="0.6" textAnchor="middle">{'\u2727'}</text>
            </svg>
            <div
              style={{
                fontFamily: SYNE,
                fontWeight: 900,
                fontSize: '1.1rem',
                color: GOLD,
                letterSpacing: '0.14em',
                textTransform: 'uppercase' as const,
                marginTop: -4,
                textShadow: `0 0 12px ${GOLD}33`,
              }}
            >
              KARTA TAROTA
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: `${GOLD}66`,
                letterSpacing: '0.1em',
                marginTop: 2,
              }}
            >
              PODTEKST {'\u2022'} ANALIZA OSOBOWOŚCI
            </div>
          </div>

          {/* Person picker (gold circles with initials) */}
          {availableParticipants.length > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              {availableParticipants.map((name, i) => {
                const isSelected = i === selectedIdx;
                const initial = name.charAt(0).toUpperCase();
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedIdx(i)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? GOLD : `${GOLD}44`}`,
                      background: isSelected ? `${GOLD}22` : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: isSelected ? `0 0 8px ${GOLD}33` : 'none',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: SYNE,
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        color: isSelected ? GOLD : `${GOLD}88`,
                      }}
                    >
                      {initial}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Archetype zone (center) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              marginBottom: 4,
            }}
          >
            {/* Glowing halo behind emoji */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${GOLD}25 0%, ${GOLD}08 50%, transparent 80%)`,
                  filter: 'blur(8px)',
                  pointerEvents: 'none',
                }}
              />
              <span style={{ fontSize: '3rem', lineHeight: 1, position: 'relative', zIndex: 1 }}>
                {archetypeEmoji}
              </span>
            </div>
            <div
              style={{
                fontFamily: SYNE,
                fontWeight: 800,
                fontSize: '1.0rem',
                color: GOLD,
                letterSpacing: '0.08em',
                textShadow: `0 0 10px ${GOLD}33`,
              }}
            >
              {archetypeName}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.04em',
              }}
            >
              {selectedName}
            </div>
          </div>

          {/* Trait constellation - Big Five as pentagon */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 4,
            }}
          >
            <div style={{ position: 'relative', width: 260, height: 200 }}>
              <svg width="260" height="200" viewBox="0 0 260 240" style={{ display: 'block' }}>
                {/* Pentagon outline */}
                <polygon
                  points={pentPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={`${GOLD}22`}
                  strokeWidth="0.5"
                />
                {/* Inner pentagon (50% scale) */}
                {(() => {
                  const innerPoints = getPentagonPoints(pentCenter.x, pentCenter.y, pentRadius * 0.5);
                  return (
                    <polygon
                      points={innerPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={`${GOLD}15`}
                      strokeWidth="0.5"
                    />
                  );
                })()}
                {/* Connecting lines from center to each vertex */}
                {pentPoints.map((p, i) => (
                  <line
                    key={`line-${i}`}
                    x1={pentCenter.x}
                    y1={pentCenter.y}
                    x2={p.x}
                    y2={p.y}
                    stroke={`${GOLD}15`}
                    strokeWidth="0.5"
                  />
                ))}
                {/* Filled area based on trait scores */}
                {(() => {
                  const dataPoints = traitScores.map((score, i) => {
                    const frac = score / 100;
                    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                    return {
                      x: pentCenter.x + pentRadius * frac * Math.cos(angle),
                      y: pentCenter.y + pentRadius * frac * Math.sin(angle),
                    };
                  });
                  return (
                    <polygon
                      points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill={`${GOLD}18`}
                      stroke={GOLD}
                      strokeWidth="1"
                      opacity={0.8}
                    />
                  );
                })()}
                {/* Star dots at each vertex */}
                {pentPoints.map((p, i) => {
                  const score = traitScores[i];
                  const opacity = 0.3 + (score / 100) * 0.7;
                  const size = 2.5 + (score / 100) * 2.5;
                  return (
                    <g key={`star-${i}`}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={size}
                        fill={GOLD}
                        opacity={opacity}
                      />
                      {/* Glow behind star */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={size + 4}
                        fill={GOLD}
                        opacity={opacity * 0.15}
                      />
                    </g>
                  );
                })}
              </svg>
              {/* Trait labels positioned outside pentagon */}
              {pentPoints.map((p, i) => {
                const labelOffset = 18;
                const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                const lx = pentCenter.x + (pentRadius + labelOffset) * Math.cos(angle);
                const ly = pentCenter.y + (pentRadius + labelOffset) * Math.sin(angle);
                return (
                  <div
                    key={`label-${i}`}
                    style={{
                      position: 'absolute',
                      left: lx,
                      top: ly,
                      transform: 'translate(-50%, -50%)',
                      fontFamily: MONO,
                      fontSize: '0.63rem',
                      color: `${GOLD}88`,
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                    }}
                  >
                    <div>{BIG_FIVE_LABELS[i]}</div>
                    <div style={{ fontSize: '0.63rem', color: STAR_WHITE, opacity: 0.5, marginTop: 1 }}>
                      {traitScores[i]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom section: attachment, love language, communication, MBTI */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 5,
              marginBottom: 8,
            }}
          >
            {/* Attachment style */}
            <div
              style={{
                background: `${GOLD}0a`,
                border: `1px solid ${GOLD}22`,
                borderRadius: 4,
                padding: '4px 8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.63rem',
                  color: `${GOLD}66`,
                  letterSpacing: '0.08em',
                  marginBottom: 2,
                }}
              >
                PRZYWIĄZANIE
              </div>
              <div
                style={{
                  fontFamily: GROTESK,
                  fontSize: '0.72rem',
                  color: STAR_WHITE,
                  fontWeight: 500,
                }}
              >
                {ARCHETYPE_EMOJIS[attachment] ?? ''} {ATTACHMENT_MYSTICAL[attachment] ?? attachmentLabels[attachment] ?? attachment}
              </div>
            </div>

            {/* Love language */}
            {loveLanguage && (
              <div
                style={{
                  background: `${GOLD}0a`,
                  border: `1px solid ${GOLD}22`,
                  borderRadius: 4,
                  padding: '4px 8px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: '0.63rem',
                    color: `${GOLD}66`,
                    letterSpacing: '0.08em',
                    marginBottom: 2,
                  }}
                >
                  JĘZYK MIŁOŚCI
                </div>
                <div
                  style={{
                    fontFamily: GROTESK,
                    fontSize: '0.72rem',
                    color: STAR_WHITE,
                    fontWeight: 500,
                  }}
                >
                  {LOVE_SYMBOLS[loveLanguage.primary] ?? ''} {loveLabels[loveLanguage.primary] ?? loveLanguage.primary}
                </div>
              </div>
            )}

            {/* Communication style */}
            <div
              style={{
                background: `${GOLD}0a`,
                border: `1px solid ${GOLD}22`,
                borderRadius: 4,
                padding: '4px 8px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: '0.63rem',
                  color: `${GOLD}66`,
                  letterSpacing: '0.08em',
                  marginBottom: 2,
                }}
              >
                KOMUNIKACJA
              </div>
              <div
                style={{
                  fontFamily: GROTESK,
                  fontSize: '0.72rem',
                  color: STAR_WHITE,
                  fontWeight: 500,
                }}
              >
                {commLabels[commStyle] ?? commStyle}
              </div>
            </div>

            {/* MBTI */}
            {mbti && (
              <div
                style={{
                  background: `${GOLD}0a`,
                  border: `1px solid ${GOLD}33`,
                  borderRadius: 4,
                  padding: '4px 10px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: '0.63rem',
                    color: `${GOLD}66`,
                    letterSpacing: '0.08em',
                    marginBottom: 2,
                  }}
                >
                  MBTI
                </div>
                <div
                  style={{
                    fontFamily: SYNE,
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: GOLD,
                    letterSpacing: '0.1em',
                    textShadow: `0 0 8px ${GOLD}22`,
                  }}
                >
                  {mbti.type}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 'auto' }}>
            <div
              style={{
                fontFamily: GROTESK,
                fontSize: '0.72rem',
                fontStyle: 'italic',
                color: `${GOLD}88`,
                letterSpacing: '0.04em',
              }}
            >
              ~ odkryj swój archetyp ~
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: '0.63rem',
                color: 'rgba(255,255,255,0.35)',
                marginTop: 4,
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0,
              }}
            >
              <svg width={14} height={10} viewBox="0 0 580 370" fill="none" aria-hidden="true" style={{ opacity: 0.4, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}>
                <defs>
                  <linearGradient id="ptpersonality" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                <path d="M 0,0 L 240,0 Q 310,0 310,70 L 310,130 Q 310,200 240,200 L 85,200 L 85,370 L 0,370 Z" fill="url(#ptpersonality)" />
                <path d="M 330,0 L 580,0 L 580,85 L 497,85 L 497,370 L 413,370 L 413,85 L 330,85 Z" fill="url(#ptpersonality)" />
              </svg>
              podtekst.app
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
