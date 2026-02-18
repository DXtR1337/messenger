'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { ConversationPersonality } from '@/lib/analysis/types';

interface StoryPersonalityProps {
  personality: ConversationPersonality;
}

interface PersonalityCard {
  emoji: string;
  category: string;
  value: string;
  subtitle: string;
}

function buildCards(personality: ConversationPersonality): PersonalityCard[] {
  const data = personality.if_this_conversation_were_a;

  return [
    {
      emoji: '🎬',
      category: 'Gatunek filmowy',
      value: data.movie_genre,
      subtitle: 'Gdyby ta rozmowa była filmem',
    },
    {
      emoji: '🌤️',
      category: 'Pogoda',
      value: data.weather,
      subtitle: 'Klimat Waszej relacji',
    },
    {
      emoji: '✨',
      category: 'Jedno słowo',
      value: data.one_word,
      subtitle: 'Esencja tego, co Was łączy',
    },
  ];
}

function PersonalityCardItem({
  card,
  index,
  isInView,
}: {
  card: PersonalityCard;
  index: number;
  isInView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.5,
        delay: 0.15 + index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-col items-center gap-3 p-6 text-center transition-colors"
      style={{
        background: 'var(--story-bg-card)',
        border: '1px solid var(--story-border)',
        borderRadius: 'var(--story-radius)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--story-border-hover)';
        e.currentTarget.style.background = 'var(--story-bg-card-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--story-border)';
        e.currentTarget.style.background = 'var(--story-bg-card)';
      }}
    >
      {/* Emoji */}
      <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{card.emoji}</span>

      {/* Category label */}
      <span
        className="font-mono"
        style={{
          fontSize: '0.62rem',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--story-text-3)',
        }}
      >
        {card.category}
      </span>

      {/* Value */}
      <span
        style={{
          fontFamily: 'var(--font-syne)',
          fontWeight: 700,
          fontSize: '1.3rem',
          lineHeight: 1.25,
          color: 'var(--story-text)',
        }}
      >
        {card.value}
      </span>

      {/* Subtitle */}
      <span
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.78rem',
          color: 'var(--story-text-3)',
          lineHeight: 1.4,
        }}
      >
        {card.subtitle}
      </span>
    </motion.div>
  );
}

export default function StoryPersonality({
  personality,
}: StoryPersonalityProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const cards = buildCards(personality);

  return (
    <div ref={sectionRef} className="flex flex-col">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 text-center"
      >
        <h3
          style={{
            fontFamily: 'var(--font-syne)',
            fontWeight: 800,
            fontSize: '1.3rem',
            color: 'var(--story-text)',
            marginBottom: 4,
          }}
        >
          Gdyby ta relacja była...
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-space-grotesk)',
            fontSize: '0.78rem',
            color: 'var(--story-text-3)',
          }}
        >
          Osobowość Waszej konwersacji w trzech odsłonach
        </p>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card, index) => (
          <PersonalityCardItem
            key={card.category}
            card={card}
            index={index}
            isInView={isInView}
          />
        ))}
      </div>
    </div>
  );
}
