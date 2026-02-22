'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { computeMegaStats } from '@/lib/analysis/story-data';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

interface StoryNumbersProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
}

function AnimatedCounter({
  target,
  duration = 2000,
  className,
  style,
}: {
  target: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayed, setDisplayed] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();
    let raf: number;

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-expo: 1 - 2^(-10 * progress)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayed(Math.round(eased * target));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isInView, target, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {displayed.toLocaleString('pl-PL')}
    </span>
  );
}

function formatTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)} min`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export default function StoryNumbers({
  quantitative,
  conversation,
}: StoryNumbersProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const megaStats = computeMegaStats(quantitative, conversation);

  // Compute secondary stats
  const participants = conversation.participants.map((p) => p.name);
  const [nameA] = participants;

  const avgResponseTimeMs =
    quantitative.timing.perPerson[nameA]?.medianResponseTimeMs ?? 0;
  const allMedianTimes = Object.values(quantitative.timing.perPerson).map(
    (p) => p.medianResponseTimeMs,
  );
  const overallMedianResponse =
    allMedianTimes.length > 0
      ? allMedianTimes.reduce((a, b) => a + b, 0) / allMedianTimes.length
      : 0;

  const totalLateNight = Object.values(quantitative.timing.lateNightMessages).reduce(
    (sum, v) => sum + v,
    0,
  );

  const totalReactions = Object.values(quantitative.perPerson).reduce(
    (sum, p) => sum + p.reactionsGiven,
    0,
  );

  const totalSessions = quantitative.engagement.totalSessions;

  const secondaryStats = [
    {
      emoji: '⚡',
      value: overallMedianResponse < 60000 ? Math.round(overallMedianResponse / 1000) : Math.round(overallMedianResponse / 60000),
      label: overallMedianResponse < 60000 ? 'Mediana odpowiedzi (s)' : 'Mediana odpowiedzi (min)',
      suffix: overallMedianResponse < 60000 ? 's' : ' min',
    },
    {
      emoji: '🌙',
      value: totalLateNight,
      label: 'Wiadomości nocne',
      suffix: '',
    },
    {
      emoji: '❤️',
      value: totalReactions,
      label: 'Reakcje łącznie',
      suffix: '',
    },
    {
      emoji: '💬',
      value: totalSessions,
      label: 'Sesje rozmów',
      suffix: '',
    },
  ];

  return (
    <div ref={sectionRef}>
      {/* Mega stats — 3 column grid with 1px gap borders */}
      <div
        className="grid grid-cols-3 overflow-hidden"
        style={{
          gap: 1,
          background: 'var(--story-border)',
          borderRadius: 'var(--story-radius)',
        }}
      >
        {megaStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.5,
              delay: i * 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex flex-col items-center justify-center px-4 py-8 text-center"
            style={{
              background: 'var(--story-bg)',
            }}
          >
            <span className="mb-3 text-2xl">{stat.emoji}</span>
            <AnimatedCounter
              target={stat.value}
              style={{
                fontFamily: 'var(--font-syne)',
                fontWeight: 800,
                fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                lineHeight: 1,
                color: 'var(--story-text)',
                letterSpacing: '-0.02em',
              }}
            />
            <span
              className="mt-1"
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.82rem',
                fontWeight: 500,
                color: 'var(--story-text-2)',
              }}
            >
              {stat.label}
            </span>
            <span
              className="mt-2"
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.72rem',
                color: 'var(--story-text-3)',
              }}
            >
              {stat.comparison}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Secondary stats — 4 column grid */}
      <div
        className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {secondaryStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.5,
              delay: 0.4 + i * 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex flex-col items-center rounded-xl px-4 py-5 text-center transition-colors"
            style={{
              background: 'var(--story-bg-card)',
              border: '1px solid var(--story-border)',
              borderRadius: 'var(--story-radius)',
            }}
          >
            <span className="mb-2 text-xl">{stat.emoji}</span>
            <div className="flex items-baseline gap-0.5">
              <AnimatedCounter
                target={stat.value}
                duration={1800}
                className="font-mono"
                style={{
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  color: 'var(--story-text)',
                }}
              />
              {stat.suffix && (
                <span
                  className="font-mono"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--story-text-3)',
                  }}
                >
                  {stat.suffix}
                </span>
              )}
            </div>
            <span
              className="mt-2"
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.7rem',
                color: 'var(--story-text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              {stat.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
