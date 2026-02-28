'use client';

import type { Badge } from '@/lib/parsers/types';

interface BadgesGridProps {
  badges: Badge[];
  participants: string[];
}

const PERSON_COLORS = ['#c084fc', '#e879f9'];
const PERSON_BG_COLORS = ['rgba(192,132,252,0.08)', 'rgba(232,121,249,0.08)'];

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
}: {
  badge: Badge;
  participantIndex: number;
}) {
  const color = PERSON_COLORS[participantIndex % PERSON_COLORS.length];
  const bgTint = PERSON_BG_COLORS[participantIndex % PERSON_BG_COLORS.length];

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-purple-500/[0.06] bg-purple-950/[0.1] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(168,85,247,0.12)]"
      style={{
        backgroundColor: bgTint,
      }}
    >
      {(badge.icon || BADGE_ICONS[badge.id]) ? (
        <img
          src={`/icons/badges/${badge.icon || BADGE_ICONS[badge.id]}`}
          alt={badge.name}
          className="size-20 object-contain"
          style={{ filter: `drop-shadow(0 4px 12px ${color}30)` }}
          loading="lazy"
        />
      ) : (
        <span className="text-[2.5rem] leading-none">{badge.emoji}</span>
      )}
      <span className="text-sm font-bold text-foreground">{badge.name}</span>
      <span
        className="inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm"
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
      <span className="text-[11px] text-muted-foreground">{badge.evidence}</span>
    </div>
  );
}

export default function BadgesGrid({ badges, participants }: BadgesGridProps) {
  if (badges.length === 0) return null;

  return (
    <div>
      <h3 className="font-[family-name:var(--font-syne)] text-base font-semibold text-white">
        Osiągnięcia
      </h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        Odblokowane odznaki na podstawie statystyk rozmowy
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3" data-scroll-group="achievements">
        {badges.map((badge) => {
          const participantIndex = participants.indexOf(badge.holder);
          const safeIndex = participantIndex >= 0 ? participantIndex : 0;

          return (
            <BadgeCard
              key={badge.id}
              badge={badge}
              participantIndex={safeIndex}
            />
          );
        })}
      </div>
    </div>
  );
}
