'use client';

import { useRef, useState } from 'react';
import { useCardDownload } from './useCardDownload';
import ShareCardShell from './ShareCardShell';
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
      evidence: `${dtA > dtB ? a.split(' ')[0] : b.split(' ')[0]} wysłał(a) ${Math.max(dtA, dtB)} double tekstów`,
      emoji: '\u{1FAE0}',
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
      emoji: '\u{1F989}',
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
      emoji: '\u{1F47B}',
    });
  }

  // Emoji addict
  if (pa.emojiCount + pb.emojiCount > 50) {
    cats.push({
      question: 'KTO JEST UZALEŻNIONY OD EMOJI?',
      valuesA: pa.emojiCount,
      valuesB: pb.emojiCount,
      evidence: `${pa.emojiCount > pb.emojiCount ? a.split(' ')[0] : b.split(' ')[0]}: ${Math.max(pa.emojiCount, pb.emojiCount)} emoji`,
      emoji: '\u{1F92A}',
    });
  }

  // Overthinker (questions asked)
  if (pa.questionsAsked + pb.questionsAsked > 20) {
    cats.push({
      question: 'KTO BARDZIEJ OVERTHINKUJE?',
      valuesA: pa.questionsAsked,
      valuesB: pb.questionsAsked,
      evidence: `${pa.questionsAsked > pb.questionsAsked ? a.split(' ')[0] : b.split(' ')[0]}: ${Math.max(pa.questionsAsked, pb.questionsAsked)} pytań`,
      emoji: '\u{1F914}',
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
      emoji: '\u{26A1}',
    });
  }

  // Message volume
  cats.push({
    question: 'KTO WIĘCEJ GADA?',
    valuesA: pa.totalMessages,
    valuesB: pb.totalMessages,
    evidence: `${pa.totalMessages > pb.totalMessages ? a.split(' ')[0] : b.split(' ')[0]}: ${Math.max(pa.totalMessages, pb.totalMessages).toLocaleString('pl-PL')} wiad.`,
    emoji: '\u{1F4AC}',
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
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-versus');

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

  const winnerIsA = pctA > pctB;
  const winnerIsB = pctB > pctA;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Category selector — outside ShareCardShell */}
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

      <ShareCardShell cardRef={cardRef}>
        {/* Emoji watermark */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '12rem',
            opacity: 0.04,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          {cat.emoji}
        </div>

        {/* Title section */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 22,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: syne,
              fontSize: '1.7rem',
              fontWeight: 900,
              letterSpacing: '0.15em',
              background: 'linear-gradient(135deg, #6d9fff, #b38cff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1,
              textShadow: '0 0 40px rgba(109,159,255,0.3), 0 0 80px rgba(179,140,255,0.2)',
              filter: 'drop-shadow(0 0 20px rgba(109,159,255,0.25))',
            }}
          >
            POJEDYNEK
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              color: '#555',
              letterSpacing: '0.08em',
              marginTop: 6,
            }}
          >
            kto wygrywa ten chat?
          </div>
        </div>

        {/* Question with glow/shadow */}
        <div
          style={{
            fontFamily: syne,
            fontSize: '1.3rem',
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            letterSpacing: '0.02em',
            lineHeight: 1.2,
            marginBottom: 28,
            position: 'relative',
            zIndex: 1,
            textShadow: '0 0 30px rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {cat.question}
        </div>

        {/* Names row with VS circle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Person A name */}
          <div
            style={{
              fontFamily: grotesk,
              fontSize: '0.95rem',
              fontWeight: 700,
              color: colorA,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {nameA}
          </div>

          {/* VS circle — larger with double border and outer glow */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(109,159,255,0.2), rgba(179,140,255,0.2))',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 0 0 3px rgba(109,159,255,0.12), 0 0 0 6px rgba(179,140,255,0.08), 0 0 24px rgba(109,159,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: syne,
                fontSize: '1rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #6d9fff, #b38cff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              VS
            </span>
          </div>

          {/* Person B name */}
          <div
            style={{
              fontFamily: grotesk,
              fontSize: '0.95rem',
              fontWeight: 700,
              color: colorB,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flex: 1,
              textAlign: 'right',
            }}
          >
            {nameB}
          </div>
        </div>

        {/* Percentages with crown for winner and text-shadow glow */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: syne,
              fontSize: '2.8rem',
              fontWeight: 900,
              color: colorA,
              lineHeight: 1,
              textShadow: winnerIsA ? `0 0 20px ${colorA}60, 0 0 40px ${colorA}30` : 'none',
            }}
          >
            {winnerIsA ? '\u{1F451}' : ''}{pctA}%
          </div>
          <div
            style={{
              fontFamily: syne,
              fontSize: '2.8rem',
              fontWeight: 900,
              color: colorB,
              lineHeight: 1,
              textShadow: winnerIsB ? `0 0 20px ${colorB}60, 0 0 40px ${colorB}30` : 'none',
            }}
          >
            {pctB}%{winnerIsB ? '\u{1F451}' : ''}
          </div>
        </div>

        {/* Progress bar — taller with inner shine */}
        <div
          style={{
            width: '100%',
            height: 14,
            borderRadius: 7,
            background: '#1a1a1a',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: 28,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: `${pctA}%`,
              height: '100%',
              background: colorA,
              borderRadius: '7px 0 0 7px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 0 12px ${colorA}40`,
            }}
          >
            {/* Inner shine overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)',
                borderRadius: '7px 0 0 0',
              }}
            />
          </div>
          <div
            style={{
              width: `${pctB}%`,
              height: '100%',
              background: colorB,
              borderRadius: '0 7px 7px 0',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 0 12px ${colorB}40`,
            }}
          >
            {/* Inner shine overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.2), transparent)',
                borderRadius: '0 7px 0 0',
              }}
            />
          </div>
        </div>

        {/* Evidence with more visible border */}
        <div
          style={{
            fontFamily: mono,
            fontSize: '0.7rem',
            color: '#888',
            textAlign: 'center',
            lineHeight: 1.5,
            marginTop: 'auto',
            position: 'relative',
            zIndex: 1,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 8,
            padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {cat.evidence}
        </div>
      </ShareCardShell>

      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '\u{1F4E5} Pobierz kartę'}
      </button>
    </div>
  );
}
