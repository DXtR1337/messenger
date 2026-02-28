'use client';

import { useRef, useMemo } from 'react';
import { useCardDownload } from './useCardDownload';
import { computeMegaStats } from '@/lib/analysis/story-data';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

interface StatsCardProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
  participants: string[];
}

export default function StatsCard({ quantitative, conversation, participants }: StatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-stats', { backgroundColor: '#060608' });

  const megaStats = computeMegaStats(quantitative, conversation);

  const reportId = useMemo(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
      if (i === 3) id += '-';
    }
    return id;
  }, []);

  const avgResponseMs = (() => {
    const times = Object.values(quantitative.timing.perPerson).map(
      (p) => p.medianResponseTimeMs,
    );
    if (times.length === 0) return 0;
    return times.reduce((sum, t) => sum + t, 0) / times.length;
  })();
  const avgResponseLabel = avgResponseMs < 60_000
    ? `${Math.round(avgResponseMs / 1_000)}s`
    : avgResponseMs < 3_600_000
      ? `${Math.round(avgResponseMs / 60_000)}m`
      : `${(avgResponseMs / 3_600_000).toFixed(1)}h`;

  const totalSessions = quantitative.engagement.totalSessions;

  const totalReactions = Object.values(quantitative.perPerson).reduce(
    (sum, p) => sum + p.reactionsGiven,
    0,
  );

  const totalLateNight = Object.values(quantitative.timing.lateNightMessages).reduce(
    (sum: number, v: number) => sum + v,
    0,
  );

  const emojiByPerson = participants.map((name) => {
    const personMetrics = quantitative.perPerson[name];
    if (!personMetrics) return { name, emojis: [] };
    const topEmoji = personMetrics.topEmojis.slice(0, 3);
    return { name, emojis: topEmoji };
  });

  const gridItems = [
    { label: 'SR. CZAS ODP.', value: avgResponseLabel, color: '#00ff88' },
    { label: 'SESJE LOTU', value: String(totalSessions), color: '#ff8c00' },
    { label: 'REAKCJE', value: String(totalReactions), color: '#00ff88' },
    { label: 'NOCNE TRANSMISJE', value: String(totalLateNight), color: '#ff3333' },
  ];

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const flightTitle = conversation.title
    ? conversation.title.substring(0, 24)
    : participants.join(' & ').substring(0, 24);

  const durationDays = conversation.metadata.durationDays;
  const durationLabel = durationDays > 365
    ? `${(durationDays / 365.25).toFixed(1)} lat`
    : durationDays > 30
      ? `${Math.round(durationDays / 30.44)} mies.`
      : `${durationDays} dni`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 'min(360px, 100vw - 2rem)',
          height: 640,
          background: '#060608',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Scanline overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,140,0,0.03) 2px, rgba(255,140,0,0.03) 4px)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />

        {/* SVG noise grain */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 11, opacity: 0.02 }}>
          <filter id="stats-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#stats-noise)" />
        </svg>

        {/* Header: WARNING + CZARNA SKRZYNKA */}
        <div
          style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(255,140,0,0.2)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>&#9888;&#65039;</span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#ff8c00',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              CZARNA SKRZYNKA — RAPORT
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: 'rgba(255,140,0,0.5)',
              letterSpacing: '0.08em',
            }}
          >
            NR {reportId}
          </div>
        </div>

        {/* Flight data section */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,140,0,0.12)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {[
            { label: 'LOT', value: flightTitle },
            { label: 'ZALOGA', value: participants.map(n => n.substring(0, 14)).join(', ') },
            { label: 'CZAS LOTU', value: durationLabel },
            { label: 'WIADOMOSCI', value: conversation.metadata.totalMessages.toLocaleString('pl-PL') },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  color: 'rgba(255,140,0,0.6)',
                  letterSpacing: '0.06em',
                  width: 80,
                  flexShrink: 0,
                }}
              >
                {item.label}:
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.7rem',
                  color: '#ff8c00',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Main data grid 2x2 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            margin: '12px 16px',
            background: 'rgba(255,140,0,0.1)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {gridItems.map((item) => (
            <div
              key={item.label}
              style={{
                background: '#0a0a0c',
                padding: '12px 10px 10px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 900,
                  fontSize: '2rem',
                  lineHeight: 1,
                  color: item.color,
                  textShadow: `0 0 12px ${item.color}33`,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  color: 'rgba(255,140,0,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: 6,
                }}
              >
                {item.label}
              </div>
              {/* Colored accent bar at bottom */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${item.color}, transparent)`,
                  opacity: 0.6,
                }}
              />
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            margin: '4px 16px 8px',
            background: 'linear-gradient(90deg, transparent, rgba(255,140,0,0.2), transparent)',
            position: 'relative',
            zIndex: 2,
          }}
        />

        {/* Per-person mini readout: Name + emoji top 3 */}
        <div
          style={{
            padding: '4px 16px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: 'rgba(255,140,0,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}
          >
            SYGNAL EMOJI NA OSOBE
          </div>
          {emojiByPerson.map((person, i) => (
            <div
              key={person.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 6,
                padding: '6px 8px',
                background: i === 0 ? 'rgba(255,140,0,0.04)' : 'rgba(255,51,51,0.04)',
                border: `1px solid ${i === 0 ? 'rgba(255,140,0,0.1)' : 'rgba(255,51,51,0.1)'}`,
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === 0 ? '#ff8c00' : '#ff3333',
                  boxShadow: `0 0 6px ${i === 0 ? '#ff8c00' : '#ff3333'}44`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.68rem',
                  color: i === 0 ? '#ff8c00' : '#ff3333',
                  fontWeight: 600,
                  width: 90,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {person.name}
              </span>
              <span style={{ fontSize: '1rem', display: 'flex', gap: 4 }}>
                {person.emojis.length > 0
                  ? person.emojis.map((e) => (
                      <span key={e.emoji}>{e.emoji}</span>
                    ))
                  : <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '0.63rem', color: '#444' }}>BRAK</span>
                }
              </span>
            </div>
          ))}
        </div>

        {/* Mega stats summary row */}
        <div
          style={{
            padding: '8px 16px',
            display: 'flex',
            gap: 12,
            borderTop: '1px solid rgba(255,140,0,0.1)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {megaStats.map((stat) => (
            <div key={stat.label} style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  color: '#00ff88',
                }}
              >
                {stat.value.toLocaleString('pl-PL')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.63rem',
                  color: 'rgba(255,140,0,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginTop: 2,
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer: REC + timestamp */}
        <div
          style={{
            padding: '8px 16px 12px',
            borderTop: '1px solid rgba(255,140,0,0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#ff3333',
                boxShadow: '0 0 6px #ff3333, 0 0 12px rgba(255,51,51,0.4)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#ff3333',
                letterSpacing: '0.1em',
              }}
            >
              REC
            </span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.63rem',
                color: 'rgba(255,140,0,0.4)',
              }}
            >
              {timestamp}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.63rem',
              color: 'rgba(255,140,0,0.35)',
              letterSpacing: '0.04em',
            }}
          >
            podtekst.app
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
        {isDownloading ? 'Pobieranie...' : 'Pobierz karte'}
      </button>
    </div>
  );
}
