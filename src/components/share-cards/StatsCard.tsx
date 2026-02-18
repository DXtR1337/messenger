'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import { computeMegaStats } from '@/lib/analysis/story-data';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

interface StatsCardProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
  participants: string[];
}

const GRID_EMOJI: Record<string, string> = {
  'ŚR. ODP.': '⏱️',
  'SESJE': '📅',
  'REAKCJE': '💬',
  'NOCNE': '🌙',
};

export default function StatsCard({ quantitative, conversation, participants }: StatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'chatscope-stats');

  const megaStats = computeMegaStats(quantitative, conversation);

  const avgResponseMs = (() => {
    const times = Object.values(quantitative.timing.perPerson).map(
      (p) => p.medianResponseTimeMs,
    );
    if (times.length === 0) return 0;
    return times.reduce((sum, t) => sum + t, 0) / times.length;
  })();
  const avgResponseMin = Math.round(avgResponseMs / 60_000);

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
    { label: 'ŚR. ODP.', value: `${avgResponseMin}m`, change: avgResponseMin > 30 ? '▲ WOLNO' : '▼ SZYBKO', positive: avgResponseMin <= 30 },
    { label: 'SESJE', value: String(totalSessions), change: totalSessions > 100 ? '▲ DUŻO' : '— NORMA', positive: totalSessions > 100 },
    { label: 'REAKCJE', value: String(totalReactions), change: totalReactions > 200 ? '▲ EKSPRESJA' : '— SPOKÓJ', positive: totalReactions > 200 },
    { label: 'NOCNE', value: String(totalLateNight), change: totalLateNight > 100 ? '🔥 GORĄCO' : '— LUZ', positive: totalLateNight > 100 },
  ];

  const now = new Date();
  const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: '#0a0a0a',
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
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.015) 2px, rgba(0,255,0,0.015) 4px)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        />

        {/* Terminal header */}
        <div
          style={{
            padding: '12px 16px 8px',
            borderBottom: '1px solid #1a3a1a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#ff8c00',
                letterSpacing: '0.04em',
              }}
            >
              CHATSCOPE
            </span>
            <span
              style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '0.5rem',
                color: '#3a7a3a',
                letterSpacing: '0.06em',
              }}
            >
              TERMINAL
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.5rem',
              color: '#3a7a3a',
            }}
          >
            {timestamp}
          </span>
        </div>

        {/* Ticker bar */}
        <div
          style={{
            padding: '6px 16px',
            background: '#0d1a0d',
            borderBottom: '1px solid #1a3a1a',
            display: 'flex',
            gap: 16,
            overflow: 'hidden',
          }}
        >
          {participants.map((name, i) => {
            const msgs = quantitative.perPerson[name]?.totalMessages ?? 0;
            const color = i === 0 ? '#6d9fff' : '#b38cff';
            return (
              <span
                key={name}
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.5rem',
                  color,
                  whiteSpace: 'nowrap',
                }}
              >
                {name.substring(0, 10).toUpperCase()} {msgs.toLocaleString('pl-PL')} MSG
              </span>
            );
          })}
        </div>

        {/* Mega stats — hero numbers */}
        <div style={{ padding: '16px 16px 12px', flex: '0 0 auto' }}>
          {megaStats.map((stat) => (
            <div key={stat.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontWeight: 900,
                    fontSize: '2rem',
                    lineHeight: 1,
                    color: '#00ff88',
                    textShadow: '0 0 20px rgba(0,255,136,0.3)',
                  }}
                >
                  {stat.value.toLocaleString('pl-PL')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.5rem',
                    color: '#ff8c00',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  {stat.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.46rem',
                    color: '#3a7a3a',
                  }}
                >
                  — {stat.comparison}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            margin: '0 16px',
            background: 'linear-gradient(90deg, transparent, #1a3a1a, #3a7a3a, #1a3a1a, transparent)',
          }}
        />

        {/* Grid — secondary stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            margin: '12px 16px',
            background: '#1a3a1a',
            border: '1px solid #1a3a1a',
          }}
        >
          {gridItems.map((item) => (
            <div
              key={item.label}
              style={{
                background: '#0a0a0a',
                padding: '10px 10px 8px',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.42rem',
                  color: '#3a7a3a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 4,
                }}
              >
                {GRID_EMOJI[item.label] ?? ''} {item.label}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: '#ededed',
                  lineHeight: 1,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '0.42rem',
                  color: item.positive ? '#00ff88' : '#ff8c00',
                  marginTop: 3,
                }}
              >
                {item.change}
              </div>
            </div>
          ))}
        </div>

        {/* Top emoji per person */}
        <div style={{ padding: '8px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#3a7a3a',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}
          >
            TOP EMOJI NA OSOBĘ
          </div>
          {emojiByPerson.map((person, i) => {
            const color = i === 0 ? '#6d9fff' : '#b38cff';
            return (
              <div
                key={person.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-geist-mono)',
                    fontSize: '0.5rem',
                    color,
                    width: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {person.name}
                </span>
                <span style={{ fontSize: '0.9rem', display: 'flex', gap: 4 }}>
                  {person.emojis.map((e) => (
                    <span key={e.emoji}>{e.emoji}</span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 16px 12px',
            borderTop: '1px solid #1a3a1a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#3a7a3a',
            }}
          >
            chatscope.app
          </span>
          <span
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.42rem',
              color: '#3a7a3a',
            }}
          >
            ■ DANE NA ŻYWO
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
