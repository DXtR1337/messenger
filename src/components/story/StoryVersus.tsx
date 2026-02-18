'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { computeVersusCards } from '@/lib/analysis/story-data';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';

interface StoryVersusProps {
  quantitative: QuantitativeAnalysis;
  participants: string[];
}

export default function StoryVersus({
  quantitative,
  participants,
}: StoryVersusProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  const cards = computeVersusCards(quantitative, participants);

  return (
    <div ref={sectionRef}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{
              duration: 0.5,
              delay: i * 0.09,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex flex-col gap-3 p-5 transition-colors"
            style={{
              background: 'var(--story-bg-card)',
              border: '1px solid var(--story-border)',
              borderRadius: 'var(--story-radius)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--story-border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--story-border)';
            }}
          >
            {/* Emoji */}
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{card.emoji}</span>

            {/* Label */}
            <div className="flex flex-col">
              <span
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.68rem',
                  color: 'var(--story-text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Kto jest bardziej...
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-syne)',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: 'var(--story-text)',
                  letterSpacing: '-0.01em',
                }}
              >
                {card.labelPl}
              </span>
            </div>

            {/* Dual-color bar */}
            <div
              className="flex w-full overflow-hidden"
              style={{ height: 6, borderRadius: 3 }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={isInView ? { width: `${card.personAPercent}%` } : { width: 0 }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'var(--story-blue)',
                  borderRadius: '3px 0 0 3px',
                }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={isInView ? { width: `${card.personBPercent}%` } : { width: 0 }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'var(--story-purple)',
                  borderRadius: '0 3px 3px 0',
                }}
              />
            </div>

            {/* Names + percentages */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.72rem',
                    color: 'var(--story-blue)',
                    fontWeight: 500,
                  }}
                >
                  {card.personAName}
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--story-text-3)',
                  }}
                >
                  {Math.round(card.personAPercent)}%
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span
                  style={{
                    fontFamily: 'var(--font-space-grotesk)',
                    fontSize: '0.72rem',
                    color: 'var(--story-purple)',
                    fontWeight: 500,
                  }}
                >
                  {card.personBName}
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--story-text-3)',
                  }}
                >
                  {Math.round(card.personBPercent)}%
                </span>
              </div>
            </div>

            {/* Evidence text */}
            <span
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.68rem',
                color: 'var(--story-text-3)',
                lineHeight: 1.4,
              }}
            >
              {card.evidence}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
