'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { PersonProfile } from '@/lib/analysis/types';
import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import { computeCharacterData } from '@/lib/analysis/story-data';
import type { CharacterCardData } from '@/lib/analysis/story-data';

interface StoryCharactersProps {
  profiles: Record<string, PersonProfile>;
  participants: string[];
  quantitative: QuantitativeAnalysis;
}

const PERSON_COLORS = ['var(--story-blue)', 'var(--story-purple)'] as const;

const SPECIAL_ABILITY_ICONS: Record<string, string> = {
  Monolog: '\u{1F3A4}',
  Reaktor: '\u26A1',
  'Double-Texter': '\u{1F4F1}',
  'Nocna Zmiana': '\u{1F319}',
  'Pierwszy Kontakt': '\u{1F680}',
  Lingwista: '\u{1F4DA}',
  Enigma: '\u2753',
};

function getAbilityIcon(ability: string): string {
  for (const [key, icon] of Object.entries(SPECIAL_ABILITY_ICONS)) {
    if (ability.startsWith(key)) return icon;
  }
  return '\u2728';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function CharacterCard({
  data,
  index,
  isInView,
}: {
  data: CharacterCardData;
  index: number;
  isInView: boolean;
}) {
  const color = PERSON_COLORS[data.colorIndex] ?? PERSON_COLORS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.55,
        delay: 0.15 + index * 0.15,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="flex flex-col gap-5 p-5 transition-colors"
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
      {/* Header: Avatar + Name + Badges */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="flex flex-shrink-0 items-center justify-center rounded-full"
          style={{
            width: 56,
            height: 56,
            background: `linear-gradient(135deg, ${color}, ${color}88)`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '1.1rem',
              color: '#fff',
              lineHeight: 1,
            }}
          >
            {getInitials(data.name)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Name */}
          <span
            className="truncate"
            style={{
              fontFamily: 'var(--font-syne)',
              fontWeight: 700,
              fontSize: '1.3rem',
              color: 'var(--story-text)',
              lineHeight: 1.2,
            }}
          >
            {data.name}
          </span>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Class badge */}
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5"
              style={{
                background: `${color}18`,
                border: `1px solid ${color}33`,
                fontFamily: 'var(--font-space-grotesk)',
                fontSize: '0.62rem',
                fontWeight: 600,
                color: color,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {data.className}
            </span>

            {/* Level badge */}
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.62rem',
                fontWeight: 600,
                color: 'var(--story-text-2)',
                letterSpacing: '0.04em',
              }}
            >
              Lv. {data.level}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="flex flex-col gap-2.5">
        {data.stats.map((stat, statIndex) => (
          <StatBar
            key={stat.label}
            label={stat.label}
            value={stat.value}
            max={stat.max}
            color={color}
            isInView={isInView}
            delay={0.4 + index * 0.15 + statIndex * 0.08}
          />
        ))}
      </div>

      {/* Trait Tags */}
      {data.traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.traits.map((trait) => (
            <span
              key={trait}
              className="inline-flex items-center rounded-full px-2 py-0.5"
              style={{
                border: '1px solid var(--story-border)',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.62rem',
                color: 'var(--story-text-2)',
                letterSpacing: '0.02em',
              }}
            >
              {trait}
            </span>
          ))}
        </div>
      )}

      {/* Quote */}
      {data.quote && (
        <div
          className="pl-3"
          style={{
            borderLeft: `2px solid ${color}`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.78rem',
              fontStyle: 'italic',
              color: 'var(--story-text-2)',
              lineHeight: 1.5,
            }}
          >
            {data.quote}
          </span>
        </div>
      )}

      {/* Special Ability */}
      {data.specialAbility && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--story-border)',
          }}
        >
          <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>
            {getAbilityIcon(data.specialAbility)}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-space-grotesk)',
              fontSize: '0.72rem',
              color: 'var(--story-text-2)',
              lineHeight: 1.4,
            }}
          >
            {data.specialAbility}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function StatBar({
  label,
  value,
  max,
  color,
  isInView,
  delay,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  isInView: boolean;
  delay: number;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      {/* Label */}
      <span
        className="w-[90px] flex-shrink-0"
        style={{
          fontFamily: 'var(--font-space-grotesk)',
          fontSize: '0.72rem',
          color: 'var(--story-text-2)',
          lineHeight: 1,
        }}
      >
        {label}
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
          animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
          transition={{
            duration: 0.7,
            delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            borderRadius: 2,
            background: color,
          }}
        />
      </div>

      {/* Score number */}
      <span
        className="w-[28px] flex-shrink-0 text-right"
        style={{
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--story-text)',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function StoryCharacters({
  profiles,
  participants,
  quantitative,
}: StoryCharactersProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

  const characters: CharacterCardData[] = participants
    .map((name, index) => {
      const profile = profiles[name];
      if (!profile) return null;
      return computeCharacterData(profile, name, quantitative, index);
    })
    .filter((card): card is CharacterCardData => card !== null);

  return (
    <div
      ref={sectionRef}
      className="grid grid-cols-1 gap-5 md:grid-cols-2"
    >
      {characters.map((character, index) => (
        <CharacterCard
          key={character.name}
          data={character}
          index={index}
          isInView={isInView}
        />
      ))}
    </div>
  );
}
