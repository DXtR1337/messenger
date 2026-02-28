'use client';

import { useRef, useState, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import type { PersonProfile } from '@/lib/analysis/types';

interface MBTICardProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
}

const MBTI_POLISH: Record<string, string> = {
  INTJ: 'Architekt',
  INTP: 'Logik',
  ENTJ: 'Dowodca',
  ENTP: 'Debater',
  INFJ: 'Adwokat',
  INFP: 'Mediator',
  ENFJ: 'Protagonista',
  ENFP: 'Aktywista',
  ISTJ: 'Logistyk',
  ISFJ: 'Obronca',
  ESTJ: 'Dyrektor',
  ESFJ: 'Konsul',
  ISTP: 'Wirtuoz',
  ISFP: 'Poszukiwacz',
  ESTP: 'Przedsiebiorca',
  ESFP: 'Animator',
};

const LOVE_LANG_SHORT: Record<string, string> = {
  words_of_affirmation: 'WA',
  quality_time: 'QT',
  acts_of_service: 'AS',
  gifts_pebbling: 'GP',
  physical_touch: 'PT',
};

const DIM_COLORS: Record<string, { left: string; right: string }> = {
  ie: { left: '#2563eb', right: '#7c3aed' },
  sn: { left: '#059669', right: '#d97706' },
  tf: { left: '#0891b2', right: '#e11d48' },
  jp: { left: '#4f46e5', right: '#ea580c' },
};

export default function MBTICard({ profiles, participants }: MBTICardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-mbti', { backgroundColor: '#ffffff' });

  const participantsWithMBTI = participants.filter(
    (name) => profiles[name]?.mbti,
  );

  const [selectedIdx, setSelectedIdx] = useState(0);

  const flightCode = useMemo(() => {
    const num = Math.floor(Math.random() * 900) + 100;
    return num;
  }, []);

  if (participantsWithMBTI.length === 0) return null;

  const currentName = participantsWithMBTI[selectedIdx] ?? participantsWithMBTI[0];
  const profile = profiles[currentName];
  const mbti = profile?.mbti;
  if (!mbti) return null;

  const polishName = MBTI_POLISH[mbti.type] ?? mbti.type;
  const attachmentStyle = profile.attachment_indicators?.primary_style ?? '???';
  const loveLang = profile.love_language?.primary
    ? LOVE_LANG_SHORT[profile.love_language.primary] ?? '??'
    : '??';

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: 'linear-gradient(180deg, #f0f5ff 0%, #ffffff 30%, #ffffff 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* Left stub (tear-off) */}
        <div
          style={{
            width: 70,
            flexShrink: 0,
            borderRight: '2px dashed #c0c8d8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 6px',
            background: 'linear-gradient(180deg, #dfe6f2 0%, #eaeff7 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Perforated holes */}
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                right: -5,
                top: 20 + i * 34,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f0f5ff',
                border: '1px solid #d0d8e8',
              }}
            />
          ))}

          {/* PODTEKST AIR vertical */}
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: '#0055a4',
              letterSpacing: '0.14em',
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              marginBottom: 16,
            }}
          >
            PODTEKST AIR
          </div>

          {/* MBTI type large */}
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1.5rem',
              color: '#0055a4',
              letterSpacing: '0.06em',
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {mbti.type}
          </div>

          {/* KLASA: attachment */}
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: '#7a8599',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            KLASA
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.68rem',
              color: '#0055a4',
              textAlign: 'center',
              fontWeight: 600,
              marginTop: 2,
              textTransform: 'capitalize',
              maxWidth: 58,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {attachmentStyle}
          </div>
        </div>

        {/* Main ticket area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top bar: blue with KARTA POKLADOWA */}
          <div
            style={{
              background: '#0055a4',
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 800,
                fontSize: '1.0rem',
                color: '#ffffff',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              KARTA POKLADOWA
            </span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.78rem',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              BOARDING PASS
            </span>
          </div>

          {/* Route display: FROM -> airplane -> TO */}
          <div
            style={{
              padding: '14px 14px 10px',
              borderBottom: '1px solid #e4e8ef',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              {/* FROM */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: '#7a8599',
                    letterSpacing: '0.08em',
                    marginBottom: 2,
                  }}
                >
                  FROM
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: '#1a1a2e',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 90,
                  }}
                >
                  {currentName}
                </div>
              </div>

              {/* Airplane route line */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, #0055a4, #c0c8d8)' }} />
                <span style={{ fontSize: '1rem', color: '#0055a4', lineHeight: 1 }}>&#9992;&#65039;</span>
                <div style={{ width: 20, height: 1, background: 'linear-gradient(90deg, #c0c8d8, #0055a4)' }} />
              </div>

              {/* TO */}
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: '#7a8599',
                    letterSpacing: '0.08em',
                    marginBottom: 2,
                  }}
                >
                  TO
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: '#0055a4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {polishName}
                </div>
              </div>
            </div>
          </div>

          {/* 4 dimension bars */}
          <div
            style={{
              padding: '12px 14px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 14,
              borderBottom: '1px solid #e4e8ef',
            }}
          >
            {(['ie', 'sn', 'tf', 'jp'] as const).map((dim) => {
              const d = mbti.reasoning[dim];
              const dimLabels: Record<string, [string, string]> = {
                ie: ['E', 'I'],
                sn: ['S', 'N'],
                tf: ['T', 'F'],
                jp: ['J', 'P'],
              };
              const labels = dimLabels[dim];
              const colors = DIM_COLORS[dim];
              const isFirst = d.letter === labels[0];
              const position = isFirst
                ? Math.max(5, 50 - (d.confidence / 2))
                : Math.min(95, 50 + (d.confidence / 2));

              return (
                <div key={dim}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-syne)',
                        fontWeight: d.letter === labels[0] ? 800 : 500,
                        fontSize: '0.78rem',
                        color: d.letter === labels[0] ? colors.left : '#aab4c4',
                      }}
                    >
                      {labels[0]}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-syne)',
                        fontWeight: d.letter === labels[1] ? 800 : 500,
                        fontSize: '0.78rem',
                        color: d.letter === labels[1] ? colors.right : '#aab4c4',
                      }}
                    >
                      {labels[1]}
                    </span>
                  </div>
                  {/* Bar with confidence label */}
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 5,
                        background: `linear-gradient(90deg, ${colors.left}20, #f0f2f5, ${colors.right}20)`,
                        border: '1px solid #e0e4ec',
                        position: 'relative',
                      }}
                    >
                      {/* Position marker dot */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: `${position}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: isFirst ? colors.left : colors.right,
                          border: '2px solid #ffffff',
                          boxShadow: `0 1px 4px rgba(0,0,0,0.15), 0 0 0 1px ${isFirst ? colors.left : colors.right}33`,
                        }}
                      />
                      {/* Center line */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: '50%',
                          width: 1,
                          height: '100%',
                          background: '#d0d4dc',
                        }}
                      />
                    </div>
                    {/* Confidence percentage label */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: `${position}%`,
                        transform: 'translateX(-50%) translateY(-50%)',
                        fontSize: '0.63rem',
                        fontFamily: 'var(--font-geist-mono)',
                        color: isFirst ? colors.left : colors.right,
                        fontWeight: 600,
                        opacity: 0.85,
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.confidence}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Flight details grid */}
          <div
            style={{
              padding: '10px 14px',
              display: 'flex',
              gap: 0,
              borderBottom: '1px solid #e4e8ef',
            }}
          >
            {[
              { label: 'LOT', value: `PT-${mbti.type}` },
              { label: 'DATA', value: dateStr },
              { label: 'GATE', value: loveLang },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  borderLeft: i > 0 ? '1px solid #e4e8ef' : 'none',
                  padding: '0 6px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.63rem',
                    color: '#7a8599',
                    letterSpacing: '0.08em',
                    marginBottom: 3,
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-syne)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: '#1a1a2e',
                  }}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Person picker (tabs) if multiple participants */}
          {participantsWithMBTI.length > 1 && (
            <div
              style={{
                padding: '8px 14px',
                display: 'flex',
                gap: 6,
                borderBottom: '1px solid #e4e8ef',
              }}
            >
              {participantsWithMBTI.map((name, i) => {
                const isSelected = i === selectedIdx;
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedIdx(i)}
                    style={{
                      flex: 1,
                      padding: '5px 6px',
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '0.63rem',
                      fontWeight: isSelected ? 700 : 400,
                      color: isSelected ? '#ffffff' : '#7a8599',
                      background: isSelected ? '#0055a4' : 'transparent',
                      border: isSelected ? 'none' : '1px solid #d0d8e8',
                      borderRadius: 4,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Barcode-like decoration */}
          <div
            style={{
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              background: 'linear-gradient(180deg, rgba(240,245,255,0) 0%, rgba(224,232,248,0.4) 30%, rgba(224,232,248,0.4) 70%, rgba(240,245,255,0) 100%)',
            }}
          >
            {Array.from({ length: 40 }).map((_, i) => {
              const w = (i * 7 + 13) % 3 === 0 ? 3 : (i * 11 + 7) % 4 === 0 ? 2 : 1;
              return (
                <div
                  key={i}
                  style={{
                    width: w,
                    height: 20,
                    background: '#1a1a2e',
                    opacity: 0.9,
                  }}
                />
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '4px 14px 10px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: '#7a8599',
                letterSpacing: '0.04em',
              }}
            >
              Życzymy milego lotu! — PodTeksT Airlines
            </div>
            <div
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: '#aab4c4',
                marginTop: 2,
              }}
            >
              podtekst.app | LOT PT-{flightCode}
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
