'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import type { Badge } from '@/lib/parsers/types';

interface BadgesGridProps {
  badges: Badge[];
  participants: string[];
}

const PERSON_COLORS = ['#3b82f6', '#a855f7'];
const PERSON_BG_COLORS = ['rgba(59,130,246,0.08)', 'rgba(168,85,247,0.08)'];

/** Static icon lookup by badge ID — works even for old analyses without icon field */
const BADGE_ICONS: Record<string, string> = {
  'night-owl': 'night-owl.png',
  'early-bird': 'early-bird.png',
  'ghost-champion': 'ghost-champion.png',
  'double-texter': 'double-texter.png',
  'novelist': 'novelist.png',
  'speed-demon': 'speed-demon.png',
  'emoji-monarch': 'emoji-monarch.png',
  'initiator': 'initiator.png',
  'heart-bomber': 'heart-bomber.png',
  'link-lord': 'link-lord.png',
  'streak-master': 'streak-master.png',
  'question-master': 'question-master.png',
  'mention-magnet': 'mention-magnet.png',
  'reply-king': 'reply-king.png',
  'edit-lord': 'edit-lord.png',
};

function BadgeCard({
  badge,
  participantIndex,
  delay,
}: {
  badge: Badge;
  participantIndex: number;
  delay: number;
}) {
  const color = PERSON_COLORS[participantIndex % PERSON_COLORS.length];
  const bgTint = PERSON_BG_COLORS[participantIndex % PERSON_BG_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col gap-2 rounded-lg bg-muted p-3.5"
      style={{ backgroundColor: bgTint }}
    >
      {(badge.icon || BADGE_ICONS[badge.id]) ? (
        <img
          src={`/icons/badges/${badge.icon || BADGE_ICONS[badge.id]}`}
          alt={badge.name}
          className="size-20 object-contain drop-shadow-lg"
          loading="lazy"
        />
      ) : (
        <span className="text-[2.5rem] leading-none">{badge.emoji}</span>
      )}
      <span className="text-sm font-bold text-foreground">{badge.name}</span>
      <span
        className="inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
        style={{
          color,
          backgroundColor:
            participantIndex === 0
              ? 'rgba(59,130,246,0.15)'
              : 'rgba(168,85,247,0.15)',
        }}
      >
        {badge.holder}
      </span>
      <span className="text-xs text-muted-foreground">{badge.evidence}</span>
    </motion.div>
  );
}

export default function BadgesGrid({ badges, participants }: BadgesGridProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  if (badges.length === 0) return null;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-5 pt-4">
          <h3 className="font-display text-[15px] font-bold">Osiągnięcia</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            Odblokowane odznaki na podstawie statystyk rozmowy
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-4 md:grid-cols-3">
          {badges.map((badge, index) => {
            const participantIndex = participants.indexOf(badge.holder);
            const safeIndex = participantIndex >= 0 ? participantIndex : 0;

            return (
              <BadgeCard
                key={badge.id}
                badge={badge}
                participantIndex={safeIndex}
                delay={index * 0.05}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
