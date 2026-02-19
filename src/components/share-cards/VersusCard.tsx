'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import { computeVersusCards } from '@/lib/analysis/story-data';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface VersusCardProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

export default function VersusCard({ quantitative, participants }: VersusCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-versus');

  const versusCards = computeVersusCards(quantitative, participants);

  const nameA = participants[0] ?? 'A';
  const nameB = participants[1] ?? 'B';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#080808',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Dramatic light rays */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 400,
            height: 300,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04), transparent 70%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header — fight night poster */}
        <div
          style={{
            padding: '16px 16px 8px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#dc2626',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            PODTEKST PREZENTUJE
          </div>
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1.3rem',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            NOC WALKI
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#3a3a3a',
              letterSpacing: '0.1em',
              marginTop: 4,
            }}
          >
            PORÓWNANIE ZAWODNIKÓW
          </div>
        </div>

        {/* Fighters header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Fighter A */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #3b6bff, #6d9fff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 6px',
                boxShadow: '0 0 20px rgba(109,159,255,0.3)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>
                {nameA.charAt(0).toUpperCase()}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '0.62rem',
                color: '#6d9fff',
                maxWidth: 90,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nameA}
            </div>
          </div>

          {/* VS */}
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '1.8rem',
              color: '#dc2626',
              textShadow: '0 0 30px rgba(220,38,38,0.5)',
              lineHeight: 1,
            }}
          >
            VS
          </div>

          {/* Fighter B */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #8b5cf6, #b38cff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 6px',
                boxShadow: '0 0 20px rgba(179,140,255,0.3)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>
                {nameB.charAt(0).toUpperCase()}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '0.62rem',
                color: '#b38cff',
                maxWidth: 90,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nameB}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            margin: '4px 20px 8px',
            background: 'linear-gradient(90deg, #6d9fff33, #dc262644, #b38cff33)',
          }}
        />

        {/* Fight stats — tale of the tape */}
        <div style={{ flex: 1, padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 2 }}>
          {versusCards.map((card) => {
            const aWins = card.personAPercent >= card.personBPercent;

            return (
              <div key={card.label}>
                {/* Category header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontSize: '0.75rem' }}>{card.emoji}</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-syne)',
                      fontWeight: 800,
                      fontSize: '0.58rem',
                      color: '#888888',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {card.labelPl}
                  </span>
                </div>

                {/* Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* A percent */}
                  <span
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontWeight: 700,
                      fontSize: '0.62rem',
                      color: aWins ? '#6d9fff' : '#3a3a4a',
                      width: 30,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(card.personAPercent)}%
                  </span>

                  {/* Progress bar */}
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      borderRadius: 2,
                      overflow: 'hidden',
                      display: 'flex',
                      background: '#1a1a1a',
                    }}
                  >
                    <div
                      style={{
                        width: `${card.personAPercent}%`,
                        height: '100%',
                        background: aWins ? '#6d9fff' : '#6d9fff66',
                        boxShadow: aWins ? '0 0 8px rgba(109,159,255,0.4)' : 'none',
                      }}
                    />
                    <div
                      style={{
                        width: `${card.personBPercent}%`,
                        height: '100%',
                        background: !aWins ? '#b38cff' : '#b38cff66',
                        boxShadow: !aWins ? '0 0 8px rgba(179,140,255,0.4)' : 'none',
                      }}
                    />
                  </div>

                  {/* B percent */}
                  <span
                    style={{
                      fontFamily: 'var(--font-geist-mono)',
                      fontWeight: 700,
                      fontSize: '0.62rem',
                      color: !aWins ? '#b38cff' : '#3a3a4a',
                      width: 30,
                      textAlign: 'left',
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(card.personBPercent)}%
                  </span>
                </div>

                {/* Evidence */}
                <div
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.42rem',
                    color: '#3a3a4a',
                    textAlign: 'center',
                    marginTop: 2,
                  }}
                >
                  {card.evidence}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#3a3a3a' }}>
            podtekst.app
          </span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#dc2626', textShadow: '0 0 6px rgba(220,38,38,0.3)' }}>
            🥊 TYLKO DZIŚ WIECZOREM
          </span>
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
        {isDownloading ? 'Pobieranie...' : 'Pobierz kartę'}
      </button>
    </div>
  );
}
