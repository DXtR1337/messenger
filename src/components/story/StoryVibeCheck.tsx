'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import type { HealthScore } from '@/lib/analysis/types';

interface StoryVibeCheckProps {
  healthScore: HealthScore;
}

function AnimatedScoreCounter({
  target,
  isInView,
}: {
  target: number;
  isInView: boolean;
}) {
  const [displayed, setDisplayed] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const start = performance.now();
    const duration = 2000;
    let raf: number;

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayed(Math.round(eased * target));

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isInView, target]);

  return <>{displayed}</>;
}

function getVerdict(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'Zdrowa relacja', color: 'var(--story-green)' };
  if (score >= 60) return { text: 'Solidne fundamenty', color: 'var(--story-blue)' };
  if (score >= 40) return { text: 'Wymaga uwagi', color: 'var(--story-amber)' };
  return { text: 'Sygnał alarmowy', color: 'var(--story-red)' };
}

const BREAKDOWN_ITEMS: Array<{
  key: keyof HealthScore['components'];
  label: string;
  color: string;
}> = [
    { key: 'balance', label: 'Balans', color: 'var(--story-green)' },
    { key: 'reciprocity', label: 'Wzajemność', color: 'var(--story-blue)' },
    { key: 'response_pattern', label: 'Wzorce odpowiedzi', color: 'var(--story-purple)' },
    { key: 'growth_trajectory', label: 'Trajektoria wzrostu', color: 'var(--story-amber)' },
    { key: 'emotional_safety', label: 'Bezpieczeństwo emocjonalne', color: '#22d3ee' },
  ];

export default function StoryVibeCheck({ healthScore }: StoryVibeCheckProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.25 });

  const score = healthScore.overall;
  const verdict = getVerdict(score);

  // SVG circle parameters
  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = (1 - score / 100) * circumference;

  const springProgress = useSpring(circumference, {
    stiffness: 40,
    damping: 20,
    mass: 1,
  });

  useEffect(() => {
    if (isInView) {
      springProgress.set(targetOffset);
    }
  }, [isInView, targetOffset, springProgress]);

  const gradientId = 'vibe-ring-gradient';

  return (
    <div ref={sectionRef} className="flex flex-col items-center gap-8">
      {/* Circular ring */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
          style={{ transform: 'rotate(-90deg)' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
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
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: springProgress }}
          />
        </svg>

        {/* Center score */}
        <div className="relative z-10 flex flex-col items-center">
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 800,
              fontSize: '2.8rem',
              lineHeight: 1,
              color: 'var(--story-text)',
            }}
          >
            <AnimatedScoreCounter target={score} isInView={isInView} />
          </span>
          <span
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.72rem',
              color: 'var(--story-text-3)',
              marginTop: 2,
            }}
          >
            / 100
          </span>
        </div>
      </div>

      {/* Verdict text */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <span
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 700,
            fontSize: '1.3rem',
            color: verdict.color,
          }}
        >
          {verdict.text}
        </span>
      </motion.div>

      {/* Breakdown bars */}
      <div className="flex w-full max-w-[480px] flex-col gap-4">
        {BREAKDOWN_ITEMS.map((item, i) => {
          const value = healthScore.components[item.key];

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, x: -16 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{
                duration: 0.4,
                delay: 0.8 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex items-center gap-3"
            >
              {/* Label */}
              <span
                className="w-[180px] flex-shrink-0 text-right"
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.78rem',
                  color: 'var(--story-text-2)',
                }}
              >
                {item.label}
              </span>

              {/* Bar track */}
              <div
                className="relative flex-1"
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(255, 255, 255, 0.06)',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${value}%` } : { width: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 1.0 + i * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    borderRadius: 2,
                    background: item.color,
                  }}
                />
              </div>

              {/* Score number */}
              <span
                className="w-[32px] flex-shrink-0 text-right font-mono"
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--story-text)',
                }}
              >
                {value}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
