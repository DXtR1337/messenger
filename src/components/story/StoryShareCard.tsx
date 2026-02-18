'use client';

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface StoryShareCardProps {
  participants: string[];
  healthScore: number;
  totalMessages: number;
  durationDays: number;
  avgResponseTime: number;
  traits: string[];
  movieGenre: string;
  executiveSummary: string;
}

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function ScoreRing({ score }: { score: number }) {
  const size = 100;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = (1 - score / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient id="share-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--story-green)" />
            <stop offset="50%" stopColor="var(--story-blue)" />
            <stop offset="100%" stopColor="var(--story-purple)" />
          </linearGradient>
        </defs>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#share-ring-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 800,
            fontSize: '1.8rem',
            lineHeight: 1,
            color: 'var(--story-text)',
          }}
        >
          {score}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: '0.58rem',
            color: 'var(--story-text-3)',
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

function AvatarCircle({
  initial,
  gradient,
}: {
  initial: string;
  gradient: string;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: 36,
        height: 36,
        background: gradient,
        flexShrink: 0,
      }}
    >
      <span
        className="select-none text-white"
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: '0.82rem',
        }}
      >
        {initial}
      </span>
    </div>
  );
}

export default function StoryShareCard({
  participants,
  healthScore,
  totalMessages,
  durationDays,
  avgResponseTime,
  traits,
  movieGenre,
  executiveSummary,
}: StoryShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const nameA = participants[0] ?? 'Osoba A';
  const nameB = participants[1] ?? 'Osoba B';
  const initialA = nameA.charAt(0).toUpperCase();
  const initialB = nameB.charAt(0).toUpperCase();

  const displayTraits = traits.slice(0, 3);

  const miniStats = [
    {
      value: totalMessages.toLocaleString('pl-PL'),
      label: 'wiadomości',
    },
    {
      value: `${durationDays}`,
      label: 'dni',
    },
    {
      value: formatResponseTime(avgResponseTime),
      label: 'śr. odpowiedź',
    },
  ];

  const handleDownload = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    const html2canvas = (await import('html2canvas-pro')).default;
    const canvas = await html2canvas(el, {
      backgroundColor: '#09090b',
      scale: 2,
    });
    const link = document.createElement('a');
    link.download = 'chatscope-relationship-card.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: 'ChatScope — Analiza relacji',
      text: `Nasz wynik relacji: ${healthScore}/100. ${executiveSummary}`,
      url: 'https://chatscope.app',
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed, fall through to clipboard
        await copyToClipboard(shareData.text);
      }
    } else {
      await copyToClipboard(shareData.text);
    }
  }, [healthScore, executiveSummary]);

  async function copyToClipboard(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Background glow container */}
      <div className="relative flex items-center justify-center">
        {/* Radial glow effects */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 460,
            height: 460,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(109, 159, 255, 0.08) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <div
          className="pointer-events-none absolute"
          style={{
            width: 380,
            height: 380,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(179, 140, 255, 0.06) 0%, transparent 70%)',
            top: '40%',
            left: '55%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Card */}
        <motion.div
          ref={cardRef}
          id="share-card"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col items-center gap-5"
          style={{
            width: 380,
            maxWidth: '100%',
            background: 'var(--story-bg-card)',
            border: '1px solid var(--story-border)',
            borderRadius: 16,
            padding: 32,
          }}
        >
          {/* Header: logo + year */}
          <div className="flex w-full items-center justify-between">
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--story-text)',
              }}
            >
              ChatScope
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 font-mono"
              style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: 'var(--story-text-2)',
                background: 'rgba(255, 255, 255, 0.06)',
              }}
            >
              2026
            </span>
          </div>

          {/* Participant pair */}
          <div className="flex items-center gap-3">
            <AvatarCircle
              initial={initialA}
              gradient="linear-gradient(135deg, #3b6bff, #6d9fff)"
            />
            <span style={{ fontSize: '1.1rem' }}>❤️</span>
            <AvatarCircle
              initial={initialB}
              gradient="linear-gradient(135deg, #8b5cf6, #b38cff)"
            />
          </div>

          {/* Score ring */}
          <ScoreRing score={healthScore} />

          {/* Mini stats row */}
          <div className="flex w-full items-center justify-between">
            {miniStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-0.5"
              >
                <span
                  className="font-mono"
                  style={{
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: 'var(--story-text)',
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.62rem',
                    color: 'var(--story-text-3)',
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Trait badges */}
          {displayTraits.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {displayTraits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full px-3 py-1"
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.68rem',
                    fontWeight: 500,
                    color: 'var(--story-text-2)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--story-border)',
                  }}
                >
                  {trait}
                </span>
              ))}
            </div>
          )}

          {/* Movie genre */}
          <p
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontStyle: 'italic',
              fontSize: '0.78rem',
              color: 'var(--story-text-2)',
              textAlign: 'center',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            🎬 {movieGenre}
          </p>

          {/* Footer */}
          <div className="flex w-full flex-col items-center gap-1 pt-2">
            <span
              className="font-mono"
              style={{
                fontSize: '0.58rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--story-text-3)',
              }}
            >
              chatscope.app
            </span>
            <span
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.56rem',
                color: 'var(--story-text-3)',
              }}
            >
              Zobacz swoje relacje przez dane
            </span>
          </div>
        </motion.div>
      </div>

      {/* Action buttons — outside the card */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors"
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.82rem',
            fontWeight: 500,
            color: 'var(--story-text-2)',
            background: 'transparent',
            border: '1px solid var(--story-border)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--story-bg-card)';
            e.currentTarget.style.borderColor = 'var(--story-border-hover)';
            e.currentTarget.style.color = 'var(--story-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--story-border)';
            e.currentTarget.style.color = 'var(--story-text-2)';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 1.5v8M3.5 6L7 9.5 10.5 6" />
            <path d="M2 11.5h10" />
          </svg>
          Pobierz kartę
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors"
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.82rem',
            fontWeight: 500,
            color: 'var(--story-text-2)',
            background: 'transparent',
            border: '1px solid var(--story-border)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--story-bg-card)';
            e.currentTarget.style.borderColor = 'var(--story-border-hover)';
            e.currentTarget.style.color = 'var(--story-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'var(--story-border)';
            e.currentTarget.style.color = 'var(--story-text-2)';
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="10.5" cy="2.5" r="1.5" />
            <circle cx="3.5" cy="7" r="1.5" />
            <circle cx="10.5" cy="11.5" r="1.5" />
            <path d="M4.8 7.9l4.4 2.7M9.2 3.4l-4.4 2.7" />
          </svg>
          Udostępnij
        </button>
      </div>
    </div>
  );
}
