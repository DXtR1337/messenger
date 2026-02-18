'use client';

import { useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PersonMetrics } from '@/lib/parsers/types';

interface StoryWordCloudProps {
  perPerson: Record<string, PersonMetrics>;
  participants: string[];
}

interface PlacedWord {
  word: string;
  count: number;
  fontSize: number;
  color: string;
  glowColor: string;
  top: number;
  left: number;
  animDuration: number;
  animDelay: number;
}

/**
 * Deterministic pseudo-random based on string seed.
 * Avoids hydration mismatches from Math.random().
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return ((hash >>> 0) / 4294967296);
  };
}

/**
 * Pre-compute word positions spread across the container.
 * Uses a grid-jitter approach to avoid overlaps while feeling organic.
 */
function computeWordPositions(
  words: Array<{ word: string; count: number; dominantPerson: number }>,
  participants: string[],
): PlacedWord[] {
  if (words.length === 0) return [];

  const wordCounts = words.map((w) => w.count);
  const maxCount = wordCounts.reduce((a, b) => a > b ? a : b, wordCounts[0]);
  const minCount = wordCounts.reduce((a, b) => a < b ? a : b, wordCounts[0]);
  const countRange = maxCount - minCount || 1;

  // Grid layout: divide space into cells, place each word in a cell with jitter
  const cols = 5;
  const rows = Math.ceil(words.length / cols);
  const cellWidth = 100 / cols;
  const cellHeight = 100 / rows;

  const rand = seededRandom('wordcloud-layout');

  return words.map((entry, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    // Normalize count to 0-1 range
    const normalized = (entry.count - minCount) / countRange;

    // Font size: 0.75rem to 2rem
    const fontSize = 0.75 + normalized * 1.25;

    // Position within grid cell with jitter (keep 10% margin from edges)
    const jitterX = rand() * 0.6 + 0.2; // 0.2 - 0.8 within cell
    const jitterY = rand() * 0.6 + 0.2;
    const top = Math.min(85, Math.max(2, (row + jitterY) * cellHeight));
    const left = Math.min(88, Math.max(2, (col + jitterX) * cellWidth));

    // Color based on dominant person
    const color =
      entry.dominantPerson === 0
        ? 'var(--story-blue)'
        : 'var(--story-purple)';
    const glowColor =
      entry.dominantPerson === 0
        ? 'rgba(109, 159, 255, 0.4)'
        : 'rgba(179, 140, 255, 0.4)';

    // Animation: duration 3-7s, random delay
    const animDuration = 3 + rand() * 4;
    const animDelay = rand() * 3;

    return {
      word: entry.word,
      count: entry.count,
      fontSize,
      color,
      glowColor,
      top,
      left,
      animDuration,
      animDelay,
    };
  });
}

function FloatingWord({ data }: { data: PlacedWord }) {
  return (
    <motion.span
      className="absolute cursor-default select-none whitespace-nowrap"
      style={{
        top: `${data.top}%`,
        left: `${data.left}%`,
        fontFamily: 'var(--font-syne)',
        fontWeight: 700,
        fontSize: `${data.fontSize}rem`,
        color: data.color,
        textShadow: `0 0 12px ${data.glowColor}, 0 0 24px ${data.glowColor}`,
        lineHeight: 1,
      }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: [0, 1, 1],
        scale: [0.6, 1, 1],
        y: [0, -15, 0],
      }}
      transition={{
        opacity: { duration: 0.6, delay: data.animDelay, times: [0, 0.3, 1] },
        scale: { duration: 0.6, delay: data.animDelay, times: [0, 0.3, 1] },
        y: {
          duration: data.animDuration,
          delay: data.animDelay,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        },
      }}
      whileHover={{ scale: 1.15, transition: { duration: 0.2 } }}
    >
      {data.word}
    </motion.span>
  );
}

function PhraseTicker({
  phrases,
  isInView,
}: {
  phrases: Array<{ phrase: string; count: number }>;
  isInView: boolean;
}) {
  if (phrases.length === 0) return null;

  return (
    <div
      className="relative mt-4 overflow-hidden"
      style={{ height: 32 }}
    >
      {/* Left gradient mask */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12"
        style={{
          background:
            'linear-gradient(to right, #09090b, transparent)',
        }}
      />
      {/* Right gradient mask */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12"
        style={{
          background:
            'linear-gradient(to left, #09090b, transparent)',
        }}
      />

      <motion.div
        className="flex items-center gap-6 whitespace-nowrap"
        initial={{ opacity: 0 }}
        animate={
          isInView
            ? { opacity: 1 }
            : { opacity: 0 }
        }
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{ height: 32 }}
      >
        <div
          className="flex items-center gap-6"
          style={{
            animation: 'storyTickerScroll 30s linear infinite',
          }}
        >
          {/* First copy */}
          {phrases.map((entry, i) => (
            <span
              key={`a-${i}`}
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.72rem',
                color: 'var(--story-text-3)',
                lineHeight: 1,
              }}
            >
              <span style={{ color: 'var(--story-text-2)' }}>
                &ldquo;{entry.phrase}&rdquo;
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.6rem',
                  color: 'var(--story-text-3)',
                  opacity: 0.6,
                }}
              >
                x{entry.count}
              </span>
            </span>
          ))}
          {/* Second copy for seamless loop */}
          {phrases.map((entry, i) => (
            <span
              key={`b-${i}`}
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.72rem',
                color: 'var(--story-text-3)',
                lineHeight: 1,
              }}
            >
              <span style={{ color: 'var(--story-text-2)' }}>
                &ldquo;{entry.phrase}&rdquo;
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '0.6rem',
                  color: 'var(--story-text-3)',
                  opacity: 0.6,
                }}
              >
                x{entry.count}
              </span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* Keyframes for the ticker scroll animation */}
      <style jsx>{`
        @keyframes storyTickerScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

export default function StoryWordCloud({
  perPerson,
  participants,
}: StoryWordCloudProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  // Merge top words from all participants, determine dominant speaker for each word
  const { placedWords, topPhrases } = useMemo(() => {
    // Collect word counts per person
    const wordMap = new Map<
      string,
      { total: number; perPerson: Record<string, number> }
    >();

    for (const name of participants) {
      const metrics = perPerson[name];
      if (!metrics) continue;

      const topWords = metrics.topWords ?? [];
      for (const entry of topWords.slice(0, 10)) {
        const existing = wordMap.get(entry.word);
        if (existing) {
          existing.total += entry.count;
          existing.perPerson[name] = (existing.perPerson[name] ?? 0) + entry.count;
        } else {
          wordMap.set(entry.word, {
            total: entry.count,
            perPerson: { [name]: entry.count },
          });
        }
      }
    }

    // Sort by total count, take top 20
    const sorted = Array.from(wordMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 20);

    // Determine which person uses each word more
    const wordsWithDominant = sorted.map(([word, data]) => {
      let maxCount = 0;
      let dominantIndex = 0;

      for (let i = 0; i < participants.length; i++) {
        const count = data.perPerson[participants[i]] ?? 0;
        if (count > maxCount) {
          maxCount = count;
          dominantIndex = i;
        }
      }

      return { word, count: data.total, dominantPerson: dominantIndex };
    });

    const placed = computeWordPositions(wordsWithDominant, participants);

    // Merge phrases from all participants, top 10
    const phraseMap = new Map<string, number>();
    for (const name of participants) {
      const metrics = perPerson[name];
      if (!metrics) continue;

      const phrases = metrics.topPhrases ?? [];
      for (const entry of phrases) {
        phraseMap.set(
          entry.phrase,
          (phraseMap.get(entry.phrase) ?? 0) + entry.count,
        );
      }
    }

    const topPhrasesSorted = Array.from(phraseMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({ phrase, count }));

    return { placedWords: placed, topPhrases: topPhrasesSorted };
  }, [perPerson, participants]);

  return (
    <div ref={sectionRef} className="flex flex-col">
      {/* Word cloud container */}
      <div
        className="relative w-full"
        style={{ height: 280 }}
      >
        <style jsx>{`
          @media (min-width: 640px) {
            div.cloud-container {
              height: 380px !important;
            }
          }
        `}</style>
        <div
          className="cloud-container relative h-full w-full overflow-hidden rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--story-border)',
            borderRadius: 'var(--story-radius)',
          }}
        >
          {isInView &&
            placedWords.map((wordData) => (
              <FloatingWord key={wordData.word} data={wordData} />
            ))}

          {/* Empty state */}
          {placedWords.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <span
                style={{
                  fontFamily: 'var(--font-space-grotesk)',
                  fontSize: '0.82rem',
                  color: 'var(--story-text-3)',
                }}
              >
                Brak wystarczających danych
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Phrase ticker */}
      <PhraseTicker phrases={topPhrases} isInView={isInView} />
    </div>
  );
}
