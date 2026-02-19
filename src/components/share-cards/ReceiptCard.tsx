'use client';

import { useRef } from 'react';
import { useCardDownload } from './useCardDownload';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

interface ReceiptCardProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
}

interface ReceiptItem {
  emoji: string;
  label: string;
}

function buildReceiptItems(q: QuantitativeAnalysis, c: ParsedConversation): ReceiptItem[] {
  const participants = c.participants.map((p) => p.name);
  const items: ReceiptItem[] = [];

  // Message ratio imbalance
  const counts = participants.map((n) => q.perPerson[n]?.totalMessages ?? 0);
  const maxCount = counts.reduce((a, b) => a > b ? a : b, counts[0]);
  const minCount = Math.max(counts.reduce((a, b) => a < b ? a : b, counts[0]), 1);
  const ratio = maxCount / minCount;
  if (ratio > 1.3) {
    const dominant = participants[counts.indexOf(maxCount)];
    const firstName = dominant.split(' ')[0];
    items.push({ emoji: '📢', label: `${firstName} gada ${ratio.toFixed(1)}x więcej` });
  }

  // Double texts
  if (q.engagement?.doubleTexts) {
    const entries = Object.entries(q.engagement.doubleTexts);
    const [topName, topCount] = entries.sort(([, a], [, b]) => b - a)[0] ?? ['', 0];
    if (topCount > 3) {
      items.push({ emoji: '📱', label: `${topCount}x double text (${topName.split(' ')[0]})` });
    }
  }

  // Ghosting (longest silence)
  if (q.timing?.longestSilence) {
    const ms = q.timing.longestSilence.durationMs;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    if (days >= 1) {
      items.push({ emoji: '💀', label: `1x ghosting na ${days}d ${hours}h` });
    }
  }

  // Late night messages
  if (q.timing?.lateNightMessages) {
    const total = Object.values(q.timing.lateNightMessages).reduce((a, b) => a + b, 0);
    if (total > 10) {
      items.push({ emoji: '🌙', label: `${total.toLocaleString('pl-PL')}x pisanie po 22:00` });
    }
  }

  // Unsent messages
  const totalUnsent = Object.values(q.perPerson).reduce((s, p) => s + p.unsentMessages, 0);
  if (totalUnsent > 0) {
    items.push({ emoji: '🗑️', label: `${totalUnsent}x usunięta wiadomość` });
  }

  // Emoji
  const totalEmoji = Object.values(q.perPerson).reduce((s, p) => s + p.emojiCount, 0);
  if (totalEmoji > 50) {
    items.push({ emoji: '😂', label: `${totalEmoji.toLocaleString('pl-PL')} emoji wysłanych` });
  }

  // Reactions
  const totalReactions = Object.values(q.perPerson).reduce((s, p) => s + p.reactionsGiven, 0);
  if (totalReactions > 5) {
    items.push({ emoji: '❤️', label: `${totalReactions.toLocaleString('pl-PL')} reakcji` });
  }

  // Media
  const totalMedia = Object.values(q.perPerson).reduce((s, p) => s + p.mediaShared, 0);
  if (totalMedia > 5) {
    items.push({ emoji: '📸', label: `${totalMedia.toLocaleString('pl-PL')} zdjęć/mediów` });
  }

  // Total messages (always show)
  const totalMsgs = Object.values(q.perPerson).reduce((s, p) => s + p.totalMessages, 0);
  items.push({
    emoji: '📊',
    label: `${totalMsgs.toLocaleString('pl-PL')} wiadomości łącznie`,
  });

  return items.slice(0, 8);
}

function getDelusionVerdict(score: number): string {
  if (score >= 80) return 'BEZNADZIEJNY ROMANTYK 💫';
  if (score >= 60) return 'TROCHĘ LECISZ 🫠';
  if (score >= 40) return 'OPTYMISTA 🤷';
  if (score >= 20) return 'REALIST 😐';
  return 'ZIMNY JAK LÓD 🧊';
}

function getDelusionColor(score: number): string {
  if (score >= 60) return '#dc2626';
  if (score >= 35) return '#d97706';
  return '#16a34a';
}

// Generate deterministic barcode widths from conversation data
function generateBarcode(seed: number): number[] {
  const bars: number[] = [];
  let x = seed;
  for (let i = 0; i < 50; i++) {
    x = ((x * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    bars.push((x % 3) + 1);
  }
  return bars;
}

export default function ReceiptCard({ quantitative, conversation }: ReceiptCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-receipt', {
    backgroundColor: '#faf7f2',
  });

  const participants = conversation.participants.map((p) => p.name);
  const items = buildReceiptItems(quantitative, conversation);
  const delusionScore = quantitative.viralScores?.delusionScore ?? 0;
  const dateStr = new Date().toLocaleDateString('pl-PL');
  const startMs = conversation.metadata.dateRange.start;
  const endMs = conversation.metadata.dateRange.end;
  const durationDays = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24));
  const totalMsgCount = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);
  const barcode = generateBarcode(totalMsgCount);

  const mono = 'var(--font-geist-mono)';
  const syne = 'var(--font-syne)';
  const ink = '#1a1a1a';
  const faded = '#777';
  const paper = '#faf7f2';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 640,
          background: paper,
          borderRadius: 4,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          fontFamily: mono,
          color: ink,
        }}
      >
        {/* Subtle grain overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'256\' height=\'256\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
            backgroundSize: '128px 128px',
            pointerEvents: 'none',
            opacity: 0.5,
          }}
        />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 6, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: syne,
              fontSize: '1.4rem',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: ink,
            }}
          >
            PODTEKST
          </div>
          <div
            style={{
              fontSize: '0.56rem',
              letterSpacing: '0.2em',
              color: faded,
              marginTop: 1,
            }}
          >
            ANALIZA KONWERSACJI
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1.5px dashed #bbb', margin: '8px 0', position: 'relative', zIndex: 1 }} />

        {/* Meta */}
        <div
          style={{
            fontSize: '0.6rem',
            color: '#555',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            marginBottom: 4,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Data:</span>
            <span>{dateStr}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Klienci:</span>
            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
              {participants.join(' & ')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Okres:</span>
            <span>{durationDays} dni</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1.5px dashed #bbb', margin: '8px 0', position: 'relative', zIndex: 1 }} />

        {/* Receipt items */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.72rem',
                lineHeight: 1.3,
              }}
            >
              <span style={{ flexShrink: 0, width: 18, textAlign: 'center' }}>{item.emoji}</span>
              <span style={{ color: '#333' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1.5px dashed #bbb', margin: '8px 0', position: 'relative', zIndex: 1 }} />

        {/* Total Delusion */}
        <div style={{ textAlign: 'center', padding: '4px 0', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontSize: '0.56rem',
              letterSpacing: '0.18em',
              color: faded,
              marginBottom: 4,
            }}
          >
            WYNIK ZŁUDZEŃ
          </div>
          <div
            style={{
              fontFamily: syne,
              fontSize: '2.4rem',
              fontWeight: 900,
              color: getDelusionColor(delusionScore),
              lineHeight: 1,
            }}
          >
            {delusionScore}
          </div>
          <div style={{ fontSize: '0.6rem', color: faded, marginTop: 2 }}>/100</div>
          <div
            style={{
              fontSize: '0.56rem',
              fontWeight: 700,
              color: getDelusionColor(delusionScore),
              marginTop: 6,
              letterSpacing: '0.05em',
            }}
          >
            {getDelusionVerdict(delusionScore)}
          </div>
        </div>

        {/* Separator */}
        <div style={{ borderTop: '1.5px dashed #bbb', margin: '8px 0', position: 'relative', zIndex: 1 }} />

        {/* Footer */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.6rem', color: faded }}>Dziękujemy za zakupy! 🧾</div>
          <div style={{ fontSize: '0.56rem', color: '#aaa', marginTop: 3, letterSpacing: '0.1em' }}>
            podtekst.app
          </div>
        </div>

        {/* Barcode */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: 1,
            marginTop: 10,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {barcode.map((w, i) => (
            <div
              key={i}
              style={{
                width: w,
                height: i % 7 === 0 ? 28 : 22,
                background: ink,
                opacity: 0.6 + (i % 3) * 0.13,
              }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '📥 Pobierz paragon'}
      </button>
    </div>
  );
}
