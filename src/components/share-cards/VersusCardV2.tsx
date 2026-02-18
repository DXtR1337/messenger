'use client';

import { useRef, useState } from 'react';
import { useCardDownload } from './useCardDownload';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface VersusCardV2Props {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

interface VersusCategory {
  question: string;
  valuesA: number;
  valuesB: number;
  evidence: string;
  emoji: string;
}

function buildCategories(q: QuantitativeAnalysis, names: string[]): VersusCategory[] {
  const [a, b] = names;
  const pa = q.perPerson[a];
  const pb = q.perPerson[b];
  if (!pa || !pb) return [];

  const cats: VersusCategory[] = [];

  // Clingy (double texts + message ratio)
  const dtA = q.engagement?.doubleTexts?.[a] ?? 0;
  const dtB = q.engagement?.doubleTexts?.[b] ?? 0;
  if (dtA + dtB > 5) {
    cats.push({
      question: 'KTO JEST BARDZIEJ NATRĘTNY?',
      valuesA: dtA + pa.totalMessages,
      valuesB: dtB + pb.totalMessages,
      evidence: `${dtA > dtB ? a.split(' ')[0] : b.split(' ')[0]} wysłał(a) ${Math.max(dtA, dtB)} double textów`,
      emoji: '🫠',
    });
  }

  // Night Owl
  const nightA = q.timing?.lateNightMessages?.[a] ?? 0;
  const nightB = q.timing?.lateNightMessages?.[b] ?? 0;
  if (nightA + nightB > 10) {
    cats.push({
      question: 'KTO JEST NOCNĄ SOWĄ?',
      valuesA: nightA,
      valuesB: nightB,
      evidence: `${nightA > nightB ? a.split(' ')[0] : b.split(' ')[0]}: ${Math.max(nightA, nightB)} wiad. po 22:00`,
      emoji: '🦉',
    });
  }

  // Ghost
  const ghostA = q.viralScores?.ghostRisk?.[a]?.score ?? 0;
  const ghostB = q.viralScores?.ghostRisk?.[b]?.score ?? 0;
  if (ghostA + ghostB > 30) {
    cats.push({
      question: 'KTO BARDZIEJ GHOSTUJE?',
      valuesA: ghostA,
      valuesB: ghostB,
      evidence: `Ghost risk: ${a.split(' ')[0]} ${ghostA}% vs ${b.split(' ')[0]} ${ghostB}%`,
      emoji: '👻',
    });
  }

  // Emoji addict
  if (pa.emojiCount + pb.emojiCount > 50) {
    cats.push({
      question: 'KTO JEST UZALEŻNIONY OD EMOJI?',
      valuesA: pa.emojiCount,
      valuesB: pb.emojiCount,
      evidence: `${pa.emojiCount > pb.emojiCount ? a.split(' ')[0] : b.split(' ')[0]}: ${Math.max(pa.emojiCount, pb.emojiCount)} emoji`,
      emoji: '🤪',
    });
  }

  // Overthinker (questions asked)
  if (pa.questionsAsked + pb.questionsAsked > 20) {
    cats.push({
      question: 'KTO BARDZIEJ OVERTHINKUJE?',
      valuesA: pa.questionsAsked,
      valuesB: pb.questionsAsked,
      evidence: `${pa.questionsAsked > pb.questionsAsked ? a.split(' ')[0] : b.split(' ')[0]}: ${Math.max(pa.questionsAsked, pb.questionsAsked)} pytań`,
      emoji: '🤔',
    });
  }

  // Speed demon (faster responder)
  const rtA = q.timing?.perPerson?.[a]?.medianResponseTimeMs ?? 0;
  const rtB = q.timing?.perPerson?.[b]?.medianResponseTimeMs ?? 0;
  if (rtA > 0 && rtB > 0) {
    cats.push({
      question: 'KTO ODPOWIADA SZYBCIEJ?',
      valuesA: rtB > 0 ? Math.round(1000000 / rtA) : 0, // Inverse so higher = faster
      valuesB: rtA > 0 ? Math.round(1000000 / rtB) : 0,
      evidence: `${rtA < rtB ? a.split(' ')[0] : b.split(' ')[0]}: ${formatMs(Math.min(rtA, rtB))} mediana`,
      emoji: '⚡',
    });
  }

  // Message volume
  cats.push({
    question: 'KTO WIĘCEJ GADA?',
    valuesA: pa.totalMessages,
    valuesB: pb.totalMessages,
    evidence: `${pa.totalMessages > pb.totalMessages ? a.split(' ')[0] : b.split(' ')[0]}: ${Math.max(pa.totalMessages, pb.totalMessages).toLocaleString('pl-PL')} wiad.`,
    emoji: '💬',
  });

  return cats;
}

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}min`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export default function VersusCardV2({ quantitative, participants }: VersusCardV2Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'chatscope-versus');

  const categories = buildCategories(quantitative, participants);
  const [catIdx, setCatIdx] = useState(0);

  if (categories.length === 0) return null;

  const cat = categories[catIdx % categories.length];
  const total = cat.valuesA + cat.valuesB;
  const pctA = total > 0 ? Math.round((cat.valuesA / total) * 100) : 50;
  const pctB = 100 - pctA;

  const nameA = participants[0]?.split(' ')[0] ?? 'A';
  const nameB = participants[1]?.split(' ')[0] ?? 'B';

  const syne = 'var(--font-syne)';
  const mono = 'var(--font-geist-mono)';
  const grotesk = 'var(--font-space-grotesk)';
  const colorA = '#6d9fff';
  const colorB = '#b38cff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Category selector */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 360 }}>
        {categories.map((c, i) => (
          <button
            key={i}
            onClick={() => setCatIdx(i)}
            className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-card-hover"
            style={{
              background: i === catIdx % categories.length ? 'rgba(99,102,241,0.2)' : undefined,
              borderColor: i === catIdx % categories.length ? '#6366f1' : undefined,
              color: i === catIdx % categories.length ? '#a5b4fc' : '#888',
            }}
          >
            {c.emoji}
          </button>
        ))}
      </div>

      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 360,
          background: '#0a0a0a',
          borderRadius: 8,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          border: '2px solid #1a1a1a',
        }}
      >
        {/* Emoji watermark */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '8rem',
            opacity: 0.04,
            pointerEvents: 'none',
          }}
        >
          {cat.emoji}
        </div>

        {/* Question */}
        <div
          style={{
            fontFamily: syne,
            fontSize: '1.1rem',
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            letterSpacing: '0.02em',
            lineHeight: 1.2,
            marginBottom: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {cat.question}
        </div>

        {/* Names + percentages */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 10,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontFamily: syne,
                fontSize: '2.2rem',
                fontWeight: 900,
                color: colorA,
                lineHeight: 1,
              }}
            >
              {pctA}%
            </div>
            <div
              style={{
                fontFamily: grotesk,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: colorA,
                opacity: 0.8,
                marginTop: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {nameA}
            </div>
          </div>

          <div
            style={{
              fontFamily: mono,
              fontSize: '0.6rem',
              color: '#444',
              letterSpacing: '0.1em',
            }}
          >
            VS
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: syne,
                fontSize: '2.2rem',
                fontWeight: 900,
                color: colorB,
                lineHeight: 1,
              }}
            >
              {pctB}%
            </div>
            <div
              style={{
                fontFamily: grotesk,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: colorB,
                opacity: 0.8,
                marginTop: 4,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {nameB}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: 8,
            borderRadius: 4,
            background: '#1a1a1a',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: `${pctA}%`,
              height: '100%',
              background: colorA,
              borderRadius: '4px 0 0 4px',
            }}
          />
          <div
            style={{
              width: `${pctB}%`,
              height: '100%',
              background: colorB,
              borderRadius: '0 4px 4px 0',
            }}
          />
        </div>

        {/* Evidence */}
        <div
          style={{
            fontFamily: mono,
            fontSize: '0.55rem',
            color: '#666',
            textAlign: 'center',
            lineHeight: 1.4,
            marginTop: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {cat.evidence}
        </div>

        {/* Footer */}
        <div
          style={{
            fontFamily: mono,
            fontSize: '0.42rem',
            color: 'rgba(255,255,255,0.15)',
            textAlign: 'center',
            letterSpacing: '0.12em',
            marginTop: 8,
            position: 'relative',
            zIndex: 1,
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
