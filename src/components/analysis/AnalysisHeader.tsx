'use client';

import { motion } from 'framer-motion';
import type { ParsedConversation } from '@/lib/parsers/types';

interface AnalysisHeaderProps {
  title: string;
  conversation: ParsedConversation;
  healthScore?: number;
  healthVerdict?: string;
}

const MONTHS_PL: Record<number, string> = {
  0: 'Sty',
  1: 'Lut',
  2: 'Mar',
  3: 'Kwi',
  4: 'Maj',
  5: 'Cze',
  6: 'Lip',
  7: 'Sie',
  8: 'Wrz',
  9: 'Paz',
  10: 'Lis',
  11: 'Gru',
};

function formatPolishDateRange(startMs: number, endMs: number): string {
  const start = new Date(startMs);
  const end = new Date(endMs);
  const startMonth = MONTHS_PL[start.getMonth()] ?? '';
  const endMonth = MONTHS_PL[end.getMonth()] ?? '';
  return `${startMonth} ${start.getFullYear()} \u2014 ${endMonth} ${end.getFullYear()}`;
}

function formatMessageCount(count: number): string {
  return count.toLocaleString('pl-PL');
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function AnalysisHeader({
  title,
  conversation,
  healthScore,
  healthVerdict,
}: AnalysisHeaderProps) {
  const { metadata, platform } = conversation;
  const circumference = 2 * Math.PI * 52; // ~326.73

  return (
    <motion.div
      className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Left side */}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.04em] text-foreground">
          {title}
        </h1>
        <div className="mt-1.5 flex flex-wrap gap-2.5">
          {/* Message count */}
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-xs text-text-muted">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {formatMessageCount(metadata.totalMessages)} wiadomości
          </span>

          {/* Date range */}
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-xs text-text-muted">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatPolishDateRange(metadata.dateRange.start, metadata.dateRange.end)}
          </span>

          {/* Duration */}
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white/[0.03] px-2.5 py-1 text-xs text-text-muted">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {metadata.durationDays} dni
          </span>

          {/* Platform badge */}
          <span className="inline-flex items-center gap-1 rounded-full border border-transparent bg-accent-subtle px-2.5 py-1 text-xs font-semibold text-accent">
            {platform === 'messenger'
              ? 'Messenger'
              : platform === 'whatsapp'
                ? 'WhatsApp'
                : platform === 'instagram'
                  ? 'Instagram'
                  : 'Telegram'}
          </span>
        </div>
      </div>

      {/* Right side — health score ring */}
      {healthScore !== undefined && (
        <div className="flex flex-col items-center shrink-0">
          <div className="relative" style={{ width: 110, height: 110 }}>
            <svg viewBox="0 0 120 120" width={110} height={110}>
              <defs>
                <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* Background circle */}
              <circle
                cx={60}
                cy={60}
                r={52}
                stroke="#1a1a1a"
                strokeWidth={8}
                fill="none"
              />
              {/* Score arc */}
              <circle
                cx={60}
                cy={60}
                r={52}
                stroke="url(#healthGrad)"
                strokeWidth={8}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * healthScore) / 100}
                transform="rotate(-90 60 60)"
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            {/* Centered text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-display text-[2rem] font-extrabold leading-none"
                style={{ color: getScoreColor(healthScore) }}
              >
                {healthScore}
              </span>
              <span className="text-[10px] uppercase tracking-[0.05em] text-text-muted">
                Wynik zdrowia
              </span>
            </div>
          </div>
          {healthVerdict && (
            <p className="mt-1 text-center text-[13px] font-medium text-success">
              {healthVerdict}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
