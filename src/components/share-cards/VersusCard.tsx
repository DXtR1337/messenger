'use client';

import { useRef, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import { computeVersusCards } from '@/lib/analysis/story-data';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface VersusCardProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

function getWinner(cards: ReturnType<typeof computeVersusCards>): { name: string; wins: number; loserWins: number; loserName: string } {
  const tally: Record<string, number> = {};
  for (const card of cards) {
    const winner = card.personAPercent >= card.personBPercent ? card.personAName : card.personBName;
    tally[winner] = (tally[winner] ?? 0) + 1;
  }
  const entries = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const winnerName = entries[0]?.[0] ?? '';
  const winnerWins = entries[0]?.[1] ?? 0;
  const loserName = entries[1]?.[0] ?? '';
  const loserWins = entries[1]?.[1] ?? 0;
  return { name: winnerName, wins: winnerWins, loserWins, loserName };
}

export default function VersusCard({ quantitative, participants }: VersusCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-versus', {
    backgroundColor: '#f8f5ef',
  });

  const versusCards = computeVersusCards(quantitative, participants);

  const nameA = participants[0] ?? 'A';
  const nameB = participants[1] ?? 'B';

  const caseId = useMemo(() => {
    return `PT/2026/${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }, []);

  const winner = useMemo(() => getWinner(versusCards), [versusCards]);

  const syne = 'var(--font-syne)';
  const mono = 'var(--font-geist-mono)';
  const grotesk = 'var(--font-space-grotesk)';

  const blueA = '#3b5998';
  const purpleB = '#6b3fa0';
  const darkInk = '#1a1a1a';
  const sealRed = '#8b0000';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: '#f8f5ef',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Subtle paper texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 28px,
              rgba(0,0,0,0.015) 28px,
              rgba(0,0,0,0.015) 29px
            )`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '14px 16px 8px',
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: syne,
                fontWeight: 900,
                fontSize: '1.1rem',
                color: darkInk,
                letterSpacing: '0.06em',
                lineHeight: 1.1,
              }}
            >
              AKT OSKARZENIA
            </div>
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.63rem',
                color: '#94a3b8',
                marginTop: 4,
                letterSpacing: '0.06em',
              }}
            >
              Sygn. akt: {caseId}
            </div>
          </div>

          {/* Red seal stamp in top-right */}
          <svg width={44} height={44} viewBox="0 0 44 44" style={{ flexShrink: 0, marginTop: -2 }}>
            <circle cx={22} cy={22} r={20} fill="none" stroke={sealRed} strokeWidth={2} opacity={0.5} />
            <circle cx={22} cy={22} r={16} fill="none" stroke={sealRed} strokeWidth={0.8} opacity={0.3} />
            <circle cx={22} cy={22} r={12} fill={sealRed} opacity={0.12} />
            <text
              x={22}
              y={19}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sealRed}
              fontSize="6"
              fontFamily={mono}
              fontWeight={700}
              opacity={0.6}
            >
              SAD
            </text>
            <text
              x={22}
              y={25}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sealRed}
              fontSize="4.5"
              fontFamily={mono}
              opacity={0.5}
            >
              REJONOWY
            </text>
          </svg>
        </div>

        {/* Two-column names header */}
        <div
          style={{
            display: 'flex',
            padding: '4px 16px 8px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Person A */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: syne,
                fontWeight: 800,
                fontSize: '0.92rem',
                color: blueA,
                maxWidth: 140,
                margin: '0 auto',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nameA}
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.63rem', color: '#94a3b8', marginTop: 1 }}>
              OSKARZONA/Y
            </div>
          </div>

          {/* Center VS divider */}
          <div
            style={{
              width: 36,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: '#fee2e2',
                border: `1.5px solid ${sealRed}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: syne,
                  fontWeight: 900,
                  fontSize: '0.78rem',
                  color: sealRed,
                }}
              >
                VS
              </span>
            </div>
          </div>

          {/* Person B */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                fontFamily: syne,
                fontWeight: 800,
                fontSize: '0.92rem',
                color: purpleB,
                maxWidth: 140,
                margin: '0 auto',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nameB}
            </div>
            <div style={{ fontFamily: mono, fontSize: '0.63rem', color: '#94a3b8', marginTop: 1 }}>
              OSKARZONA/Y
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            height: 1,
            margin: '0 16px',
            background: '#d4c9a8',
            position: 'relative',
            zIndex: 2,
          }}
        />

        {/* Charges — versus metrics */}
        <div
          style={{
            flex: 1,
            padding: '6px 12px 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            position: 'relative',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {versusCards.map((card) => {
            const aWins = card.personAPercent >= card.personBPercent;
            const aVal = Math.round(card.personAPercent);
            const bVal = Math.round(card.personBPercent);

            return (
              <div
                key={card.label}
                style={{
                  padding: '5px 6px',
                  borderBottom: '1px solid #ebe5d6',
                }}
              >
                {/* Charge label */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: '0.72rem' }}>{card.emoji}</span>
                  <span
                    style={{
                      fontFamily: mono,
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      color: '#64748b',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase' as const,
                    }}
                  >
                    {card.labelPl}
                  </span>
                </div>

                {/* Two-column values with bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '0 2px' }}>
                  {/* A value */}
                  <span
                    style={{
                      fontFamily: syne,
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      color: aWins ? blueA : '#b0b0b0',
                      width: 44,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {aVal}%
                  </span>

                  {/* Bar A (right-aligned, grows left) */}
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 1,
                      background: '#ebe5d6',
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        width: `${aVal}%`,
                        height: '100%',
                        background: aWins ? blueA : `${blueA}55`,
                        borderRadius: 1,
                      }}
                    />
                  </div>

                  {/* Center dashed divider */}
                  <div
                    style={{
                      width: 0,
                      height: 14,
                      borderLeft: '1px dashed #d4c9a8',
                      flexShrink: 0,
                    }}
                  />

                  {/* Bar B (left-aligned, grows right) */}
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 1,
                      background: '#ebe5d6',
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: `${bVal}%`,
                        height: '100%',
                        background: !aWins ? purpleB : `${purpleB}55`,
                        borderRadius: 1,
                      }}
                    />
                  </div>

                  {/* B value */}
                  <span
                    style={{
                      fontFamily: syne,
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      color: !aWins ? purpleB : '#b0b0b0',
                      width: 44,
                      textAlign: 'left',
                      flexShrink: 0,
                    }}
                  >
                    {bVal}%
                  </span>
                </div>

                {/* Evidence text */}
                <div
                  style={{
                    fontFamily: grotesk,
                    fontSize: '0.63rem',
                    color: '#94a3b8',
                    textAlign: 'center',
                    fontStyle: 'normal',
                    marginTop: 2,
                  }}
                >
                  {card.evidence}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verdict section */}
        <div
          style={{
            margin: '6px 12px 0',
            padding: '8px 10px',
            background: '#fef9f0',
            border: '1px solid #d4c9a8',
            borderRadius: 2,
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Secondary seal (left) */}
          <svg width={40} height={40} viewBox="0 0 50 50" style={{ flexShrink: 0, opacity: 0.6 }}>
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * 2 * Math.PI;
              const r = 21 + (i % 2 === 0 ? 3 : 0);
              const cx = 25 + r * Math.cos(angle);
              const cy = 25 + r * Math.sin(angle);
              return <circle key={i} cx={cx} cy={cy} r={4} fill={sealRed} opacity={0.25} />;
            })}
            <circle cx={25} cy={25} r={19} fill={sealRed} opacity={0.2} />
            <circle cx={25} cy={25} r={16} fill="none" stroke={sealRed} strokeWidth={0.8} opacity={0.4} />
            <text
              x={25}
              y={23}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sealRed}
              fontSize="5.5"
              fontFamily={mono}
              fontWeight={700}
              letterSpacing="0.05em"
              opacity={0.65}
            >
              PODTEKST
            </text>
            <text
              x={25}
              y={29}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sealRed}
              fontSize="4.5"
              fontFamily={mono}
              opacity={0.5}
            >
              SAD
            </text>
          </svg>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: syne,
                fontWeight: 900,
                fontSize: '0.82rem',
                color: darkInk,
                letterSpacing: '0.08em',
                marginBottom: 3,
              }}
            >
              WYROK:
            </div>
            <div
              style={{
                fontFamily: grotesk,
                fontSize: '0.68rem',
                color: '#475569',
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontWeight: 700, color: winner.name === nameA ? blueA : purpleB }}>
                {winner.name}
              </span>
              {' '}wygrywa {winner.wins} z {versusCards.length} kategorii.{' '}
              {winner.loserName && (
                <>
                  <span style={{ fontWeight: 700, color: winner.loserName === nameA ? blueA : purpleB }}>
                    {winner.loserName}
                  </span>
                  {' '}wygrywa {winner.loserWins}.
                </>
              )}
            </div>
          </div>

          {/* Wax seal "ROZSTRZYGNIETE" */}
          <svg width={50} height={50} viewBox="0 0 50 50" style={{ flexShrink: 0 }}>
            {/* Wax seal with wavy edge */}
            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i / 16) * 2 * Math.PI;
              const r = 21 + (i % 2 === 0 ? 3 : 0);
              const cx = 25 + r * Math.cos(angle);
              const cy = 25 + r * Math.sin(angle);
              return <circle key={i} cx={cx} cy={cy} r={4} fill={sealRed} opacity={0.25} />;
            })}
            <circle cx={25} cy={25} r={19} fill={sealRed} opacity={0.2} />
            <circle cx={25} cy={25} r={16} fill="none" stroke={sealRed} strokeWidth={0.8} opacity={0.4} />
            <text
              x={25}
              y={22}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sealRed}
              fontSize="5"
              fontFamily={mono}
              fontWeight={700}
              letterSpacing="0.05em"
              opacity={0.65}
            >
              ROZSTRZYG-
            </text>
            <text
              x={25}
              y={28}
              textAnchor="middle"
              dominantBaseline="central"
              fill={sealRed}
              fontSize="5"
              fontFamily={mono}
              fontWeight={700}
              letterSpacing="0.05em"
              opacity={0.65}
            >
              NIETE
            </text>
          </svg>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 16px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#94a3b8',
              letterSpacing: '0.04em',
            }}
          >
            Sad Rejonowy PodTeksT
          </span>
          <span
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#cbd5e1',
            }}
          >
            Wydzial Konwersacyjny
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
        {isDownloading ? 'Pobieranie...' : 'Pobierz karte'}
      </button>
    </div>
  );
}
