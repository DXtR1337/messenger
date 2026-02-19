'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import { computeCharacterData } from '@/lib/analysis/story-data';
import type { PersonProfile } from '@/lib/analysis/types';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface PersonalityCardProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
  quantitative: QuantitativeAnalysis;
}

const STAT_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS'];

const CLASS_ICONS: Record<string, string> = {
  Guardian: '🛡️',
  Empath: '💜',
  'Lone Wolf': '🐺',
  Wildcard: '🃏',
  Mystery: '❓',
};

const PERSON_COLORS = ['#6d9fff', '#b38cff'];

export default function PersonalityCard({
  profiles,
  participants,
  quantitative,
}: PersonalityCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-personality', { backgroundColor: '#1a170f' });

  const characters = participants
    .map((name, i) => {
      const profile = profiles[name];
      if (!profile) return null;
      return computeCharacterData(profile, name, quantitative, i);
    })
    .filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#1a170f',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Parchment texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(200,180,140,0.06), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(200,180,140,0.04), transparent 50%)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Header */}
        <div
          style={{
            padding: '14px 16px 10px',
            borderBottom: '2px solid #2a2518',
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 900,
              fontSize: '0.92rem',
              color: '#e8d5a3',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            ⚔️ KARTA POSTACI
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#6a6050',
              letterSpacing: '0.08em',
              marginTop: 2,
            }}
          >
            PODTEKST RPG • ANALIZA OSOBOWOŚCI
          </div>
        </div>

        {/* Characters */}
        <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 2 }}>
          {characters.map((char) => {
            if (!char) return null;
            const color = PERSON_COLORS[char.colorIndex] ?? PERSON_COLORS[0];
            const classIcon = CLASS_ICONS[char.className] ?? '❓';

            return (
              <div
                key={char.name}
                style={{
                  background: '#221f14',
                  border: '1px solid #3a3528',
                  borderRadius: 4,
                  padding: 12,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Corner decoration */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: `2px solid ${color}44`, borderLeft: `2px solid ${color}44` }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: `2px solid ${color}44`, borderRight: `2px solid ${color}44` }} />

                {/* Name + class row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        background: `${color}22`,
                        border: `2px solid ${color}`,
                        borderRadius: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 900, fontSize: '0.85rem', color }}>{char.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '0.68rem', color: '#e8d5a3' }}>
                        {char.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.46rem', color }}>
                        {classIcon} {char.className} • Lv.{char.level}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: `${color}22`,
                      border: `1px solid ${color}44`,
                      borderRadius: 2,
                      padding: '2px 8px',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.72rem', fontWeight: 900, color }}>
                      {char.level}
                    </span>
                  </div>
                </div>

                {/* Stat bars — RPG style */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {char.stats.map((stat, si) => {
                    const pct = (stat.value / stat.max) * 100;
                    return (
                      <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-geist-mono)',
                            fontSize: '0.46rem',
                            color: '#8a7a60',
                            width: 24,
                            letterSpacing: '0.04em',
                          }}
                        >
                          {STAT_LABELS[si]}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 8,
                            background: '#1a170f',
                            border: '1px solid #3a3528',
                            borderRadius: 1,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${color}88, ${color})`,
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-geist-mono)',
                            fontSize: '0.46rem',
                            color: '#c8b888',
                            width: 22,
                            textAlign: 'right',
                          }}
                        >
                          {stat.value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Traits */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {char.traits.slice(0, 3).map((trait) => (
                    <span
                      key={trait}
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '0.42rem',
                        color: '#e8d5a3',
                        background: '#2a2518',
                        border: '1px solid #3a3528',
                        padding: '2px 6px',
                        borderRadius: 2,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {trait}
                    </span>
                  ))}
                </div>

                {/* Special ability */}
                <div
                  style={{
                    marginTop: 8,
                    padding: '4px 8px',
                    background: `${color}11`,
                    borderLeft: `2px solid ${color}66`,
                    borderRadius: '0 2px 2px 0',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#8a7a60' }}>
                    SPECJALNA:
                  </span>{' '}
                  <span style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: '0.46rem', color: '#c8b888', lineHeight: 1.3 }}>
                    {char.specialAbility}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px 14px',
            borderTop: '2px solid #2a2518',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#6a6050' }}>
            podtekst.app
          </span>
          <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.42rem', color: '#6a6050' }}>
            ⚔️ RZUĆ NA INICJATYWĘ
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
