'use client';

import { useRef, useState, type ReactElement } from 'react';
import { useCardDownload } from './useCardDownload';
import ShareCardShell from './ShareCardShell';
import type { QualitativeAnalysis } from '@/lib/analysis/types';

interface LabelCardProps {
  qualitative: QualitativeAnalysis;
  participants: string[];
}

interface PersonLabel {
  name: string;
  attachment: string;
  mbti: string;
  commClass: string;
  topTrait: string;
  color: string;
}

const LABEL_COLORS = [
  { bg: '#1a1040', accent: '#a78bfa', glow: 'rgba(167,139,250,0.15)' },
  { bg: '#0f2a1a', accent: '#6ee7b7', glow: 'rgba(110,231,183,0.15)' },
  { bg: '#2a1a0f', accent: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
  { bg: '#1a0f2a', accent: '#f472b6', glow: 'rgba(244,114,182,0.15)' },
];

function buildLabels(qual: QualitativeAnalysis, participants: string[]): PersonLabel[] {
  const profiles = qual.pass3;
  if (!profiles) return [];

  return participants.map((name, i) => {
    const p = profiles[name];
    const colors = LABEL_COLORS[i % LABEL_COLORS.length];
    if (!p) {
      return {
        name,
        attachment: '\u2014',
        mbti: '????',
        commClass: 'Nieznany',
        topTrait: '',
        color: colors.accent,
      };
    }

    const attachment = p.attachment_indicators?.primary_style ?? '\u2014';
    const mbti = p.mbti?.type ?? '????';
    const commClass = p.communication_profile?.style ?? 'Komunikator';
    const topTrait = p.big_five_approximation
      ? Object.entries(p.big_five_approximation)
          .sort(([, a], [, b]) => (b.score ?? 0) - (a.score ?? 0))[0]?.[0] ?? ''
      : '';

    return { name, attachment, mbti, commClass, topTrait: topTrait.toUpperCase(), color: colors.accent };
  });
}

/** Generate pseudo-random barcode bars from a name string */
function generateBarcode(name: string, accent: string): ReactElement[] {
  const bars: ReactElement[] = [];
  const seed = name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const totalBars = 36;
  for (let i = 0; i < totalBars; i++) {
    const width = ((seed * (i + 7)) % 3) + 1;
    const isAccent = (seed * (i + 3)) % 5 === 0;
    bars.push(
      <div
        key={i}
        style={{
          width,
          height: '100%',
          background: isAccent ? `${accent}60` : 'rgba(255,255,255,0.12)',
          borderRadius: 1,
        }}
      />,
    );
  }
  return bars;
}

export default function LabelCard({ qualitative, participants }: LabelCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'podtekst-label');

  const labels = buildLabels(qualitative, participants);
  const [activeIdx, setActiveIdx] = useState(0);

  if (labels.length === 0) return null;

  const label = labels[activeIdx % labels.length];
  const colors = LABEL_COLORS[activeIdx % LABEL_COLORS.length];
  const syne = 'var(--font-syne)';
  const mono = 'var(--font-geist-mono)';
  const grotesk = 'var(--font-space-grotesk)';

  // Corner mark size
  const cmLen = 18;
  const cmW = 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Person picker — OUTSIDE shell */}
      {labels.length > 1 && (
        <div style={{ display: 'flex', gap: 6 }}>
          {labels.map((l, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-card-hover"
              style={{
                background: i === activeIdx ? 'rgba(99,102,241,0.2)' : undefined,
                borderColor: i === activeIdx ? l.color : undefined,
                color: i === activeIdx ? l.color : '#888',
              }}
            >
              {l.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      <ShareCardShell cardRef={cardRef}>
        {/* Accent glow */}
        <div
          style={{
            position: 'absolute',
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* Decorative corner marks — photo crop frame */}
        {/* Top-left */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 2, pointerEvents: 'none' }}>
          <div style={{ width: cmLen, height: cmW, background: colors.accent, opacity: 0.4, borderRadius: 1 }} />
          <div style={{ width: cmW, height: cmLen, background: colors.accent, opacity: 0.4, borderRadius: 1 }} />
        </div>
        {/* Top-right */}
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 2, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ width: cmLen, height: cmW, background: colors.accent, opacity: 0.4, borderRadius: 1 }} />
          <div style={{ width: cmW, height: cmLen, background: colors.accent, opacity: 0.4, borderRadius: 1, alignSelf: 'flex-end' }} />
        </div>
        {/* Bottom-left */}
        <div style={{ position: 'absolute', bottom: 20, left: 20, zIndex: 2, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ width: cmW, height: cmLen, background: colors.accent, opacity: 0.4, borderRadius: 1 }} />
          <div style={{ width: cmLen, height: cmW, background: colors.accent, opacity: 0.4, borderRadius: 1 }} />
        </div>
        {/* Bottom-right */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 2, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
          <div style={{ width: cmW, height: cmLen, background: colors.accent, opacity: 0.4, borderRadius: 1, alignSelf: 'flex-end' }} />
          <div style={{ width: cmLen, height: cmW, background: colors.accent, opacity: 0.4, borderRadius: 1 }} />
        </div>

        {/* Title section — accent colored */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: 2,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: syne,
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: colors.accent,
            }}
          >
            ETYKIETKA
          </div>
        </div>

        {/* DNA subtitle */}
        <div
          style={{
            fontFamily: mono,
            fontSize: '0.63rem',
            letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.35)',
            textAlign: 'center',
            marginBottom: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          DNA komunikacyjny
        </div>

        {/* Decorative divider */}
        <div
          style={{
            width: '100%',
            height: 1,
            background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)`,
            marginBottom: 22,
            position: 'relative',
            zIndex: 1,
          }}
        />

        {/* Name badge — larger and more prominent */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: 14,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.82rem',
              letterSpacing: '0.18em',
              color: colors.accent,
              textTransform: 'uppercase',
              textAlign: 'center',
              padding: '4px 16px',
              borderRadius: 6,
              background: `${colors.accent}10`,
              border: `1px solid ${colors.accent}25`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 300,
            }}
          >
            {label.name}
          </div>
        </div>

        {/* Main attachment label — larger with glow */}
        <div
          style={{
            fontFamily: syne,
            fontSize: '2.6rem',
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.15,
            marginBottom: 8,
            position: 'relative',
            zIndex: 1,
            textShadow: `0 0 30px ${colors.accent}40, 0 0 60px ${colors.accent}20`,
            maxWidth: 320,
            margin: '0 auto 8px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical' as const,
          }}
        >
          {label.attachment}
        </div>

        {/* Attachment sublabel */}
        <div
          style={{
            fontFamily: mono,
            fontSize: '0.65rem',
            color: '#666',
            marginBottom: 22,
            letterSpacing: '0.08em',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          styl przywi\u0105zania
        </div>

        {/* MBTI badge — larger with gradient border */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 32px',
            background: `${colors.accent}12`,
            border: `2px solid ${colors.accent}40`,
            borderImage: `linear-gradient(135deg, ${colors.accent}60, ${colors.accent}20, ${colors.accent}60) 1`,
            borderRadius: 0, // border-image requires no border-radius, using clip-path alternative
            marginBottom: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: syne,
              fontSize: '1.8rem',
              fontWeight: 800,
              color: colors.accent,
              letterSpacing: '0.12em',
              textShadow: `0 0 20px ${colors.accent}30`,
            }}
          >
            {label.mbti}
          </span>
        </div>

        {/* Communication class — styled box */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginBottom: 8,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              color: '#777',
              textAlign: 'center',
              padding: '6px 14px',
              borderRadius: 6,
              background: `${colors.accent}08`,
              border: `1px solid ${colors.accent}20`,
            }}
          >
            Komunikacja: <span style={{ color: colors.accent, fontWeight: 600 }}>{label.commClass}</span>
          </div>
        </div>

        {/* Top trait — styled box */}
        {label.topTrait && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: '0.68rem',
                letterSpacing: '0.06em',
                color: '#666',
                textAlign: 'center',
                padding: '6px 14px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${colors.accent}15`,
              }}
            >
              G\u0142\u00F3wna cecha: <span style={{ color: '#bbb', fontWeight: 600 }}>{label.topTrait}</span>
            </div>
          </div>
        )}

        {/* Spacer to push barcode toward bottom */}
        <div style={{ flex: 1 }} />

        {/* Decorative barcode section — taller with name below */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            marginTop: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 2,
              height: 40,
              opacity: 0.6,
            }}
          >
            {generateBarcode(label.name, colors.accent)}
          </div>
          {/* Name spelled out like a real barcode label */}
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.63rem',
              letterSpacing: '0.35em',
              color: '#555',
              textTransform: 'uppercase',
            }}
          >
            {label.name}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.58rem',
              letterSpacing: '0.2em',
              color: '#444',
              textTransform: 'uppercase',
              marginTop: -1,
            }}
          >
            PT-{label.mbti}-{new Date().getFullYear()}
          </div>
        </div>
      </ShareCardShell>

      {/* Download button — OUTSIDE shell */}
      <button
        onClick={download}
        disabled={isDownloading}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {isDownloading ? 'Pobieranie...' : '\u{1F4E5} Pobierz etykietk\u0119'}
      </button>
    </div>
  );
}
