'use client';

import { useRef, useState } from 'react';
import { useCardDownload } from './useCardDownload';
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
        attachment: '—',
        mbti: '????',
        commClass: 'Nieznany',
        topTrait: '',
        color: colors.accent,
      };
    }

    const attachment = p.attachment_indicators?.primary_style ?? '—';
    const mbti = p.mbti?.type ?? '????';
    const commClass = p.communication_profile?.style ?? 'Komunikator';
    const topTrait = p.big_five_approximation
      ? Object.entries(p.big_five_approximation)
          .sort(([, a], [, b]) => (b.score ?? 0) - (a.score ?? 0))[0]?.[0] ?? ''
      : '';

    return { name, attachment, mbti, commClass, topTrait: topTrait.toUpperCase(), color: colors.accent };
  });
}

export default function LabelCard({ qualitative, participants }: LabelCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { download, isDownloading } = useCardDownload(cardRef, 'chatscope-label');

  const labels = buildLabels(qualitative, participants);
  const [activeIdx, setActiveIdx] = useState(0);

  if (labels.length === 0) return null;

  const label = labels[activeIdx % labels.length];
  const colors = LABEL_COLORS[activeIdx % LABEL_COLORS.length];
  const syne = 'var(--font-syne)';
  const mono = 'var(--font-geist-mono)';
  const grotesk = 'var(--font-space-grotesk)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* Person picker */}
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

      <div
        ref={cardRef}
        style={{
          width: 360,
          height: 360,
          background: '#0a0a0a',
          borderRadius: 16,
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          border: `2px solid ${colors.accent}22`,
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        {/* Name badge */}
        <div
          style={{
            fontFamily: mono,
            fontSize: '0.55rem',
            letterSpacing: '0.15em',
            color: colors.accent,
            opacity: 0.7,
            marginBottom: 12,
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {label.name}
        </div>

        {/* Main attachment label */}
        <div
          style={{
            fontFamily: syne,
            fontSize: '1.5rem',
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.2,
            marginBottom: 6,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {label.attachment}
        </div>

        {/* Attachment sublabel */}
        <div
          style={{
            fontFamily: grotesk,
            fontSize: '0.7rem',
            color: '#888',
            marginBottom: 20,
            position: 'relative',
            zIndex: 1,
          }}
        >
          styl przywiązania
        </div>

        {/* MBTI badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            background: `${colors.accent}15`,
            border: `1px solid ${colors.accent}30`,
            borderRadius: 8,
            marginBottom: 14,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: syne,
              fontSize: '1.3rem',
              fontWeight: 800,
              color: colors.accent,
              letterSpacing: '0.08em',
            }}
          >
            {label.mbti}
          </span>
        </div>

        {/* Communication class */}
        <div
          style={{
            fontFamily: mono,
            fontSize: '0.55rem',
            letterSpacing: '0.08em',
            color: '#666',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          Komunikacja: {label.commClass}
        </div>

        {/* Top trait */}
        {label.topTrait && (
          <div
            style={{
              fontFamily: mono,
              fontSize: '0.48rem',
              letterSpacing: '0.08em',
              color: '#555',
              textAlign: 'center',
              marginTop: 4,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Główna cecha: {label.topTrait}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            fontFamily: mono,
            fontSize: '0.42rem',
            color: 'rgba(255,255,255,0.15)',
            letterSpacing: '0.12em',
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
        {isDownloading ? 'Pobieranie...' : '📥 Pobierz etykietkę'}
      </button>
    </div>
  );
}
