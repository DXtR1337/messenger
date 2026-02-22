'use client';

import { motion } from 'framer-motion';
import type { QuantitativeAnalysis, ParsedConversation, Badge } from '@/lib/parsers/types';

interface GroupChatAwardsProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
}

interface Award {
  title: string;
  winner: string;
  stat: string;
  emoji: string;
  color: string;
}

const AWARD_COLORS = ['#fbbf24', '#6d9fff', '#f472b6', '#10b981', '#a78bfa', '#f97316'];

function buildAwards(q: QuantitativeAnalysis, c: ParsedConversation): Award[] {
  const participants = c.participants.map((p) => p.name);
  if (participants.length < 3) return [];

  const awards: Award[] = [];

  // Most active
  const mostActive = participants.reduce((a, b) =>
    (q.perPerson[a]?.totalMessages ?? 0) > (q.perPerson[b]?.totalMessages ?? 0) ? a : b,
  );
  awards.push({
    title: 'Najaktywniejszy',
    winner: mostActive,
    stat: `${(q.perPerson[mostActive]?.totalMessages ?? 0).toLocaleString('pl-PL')} wiad.`,
    emoji: '🏆',
    color: AWARD_COLORS[0],
  });

  // Slowest responder
  if (q.timing?.perPerson) {
    const slowest = participants.reduce((a, b) => {
      const rtA = q.timing.perPerson[a]?.medianResponseTimeMs ?? 0;
      const rtB = q.timing.perPerson[b]?.medianResponseTimeMs ?? 0;
      return rtA > rtB ? a : b;
    });
    const rtMs = q.timing.perPerson[slowest]?.medianResponseTimeMs ?? 0;
    if (rtMs > 0) {
      const rtStr =
        rtMs < 60000
          ? `${Math.round(rtMs / 1000)}s`
          : rtMs < 3600000
            ? `${Math.round(rtMs / 60000)}min`
            : `${(rtMs / 3600000).toFixed(1)}h`;
      awards.push({
        title: 'Najwolniejszy',
        winner: slowest,
        stat: `śr. ${rtStr}`,
        emoji: '🐌',
        color: AWARD_COLORS[1],
      });
    }
  }

  // Biggest Simp (most reactions given)
  const biggestSimp = participants.reduce((a, b) =>
    (q.perPerson[a]?.reactionsGiven ?? 0) > (q.perPerson[b]?.reactionsGiven ?? 0) ? a : b,
  );
  if ((q.perPerson[biggestSimp]?.reactionsGiven ?? 0) > 5) {
    awards.push({
      title: 'Biggest Simp',
      winner: biggestSimp,
      stat: `${q.perPerson[biggestSimp]?.reactionsGiven ?? 0} reakcji`,
      emoji: '😍',
      color: AWARD_COLORS[2],
    });
  }

  // Ghost Supreme (from longest silence or ghost risk)
  if (q.timing?.longestSilence) {
    const ghost = q.timing.longestSilence.lastSender;
    const days = Math.floor(q.timing.longestSilence.durationMs / (1000 * 60 * 60 * 24));
    if (days >= 1) {
      awards.push({
        title: 'Ghost Supreme',
        winner: ghost,
        stat: `${days} dni ciszy`,
        emoji: '👻',
        color: AWARD_COLORS[3],
      });
    }
  }

  // Emoji King/Queen
  const emojiKing = participants.reduce((a, b) =>
    (q.perPerson[a]?.emojiCount ?? 0) > (q.perPerson[b]?.emojiCount ?? 0) ? a : b,
  );
  if ((q.perPerson[emojiKing]?.emojiCount ?? 0) > 20) {
    awards.push({
      title: 'Emoji Monarch',
      winner: emojiKing,
      stat: `${q.perPerson[emojiKing]?.emojiCount ?? 0} emoji`,
      emoji: '👑',
      color: AWARD_COLORS[4],
    });
  }

  // Night Owl
  if (q.timing?.lateNightMessages) {
    const nightOwl = participants.reduce((a, b) =>
      (q.timing.lateNightMessages[a] ?? 0) > (q.timing.lateNightMessages[b] ?? 0) ? a : b,
    );
    const nightCount = q.timing.lateNightMessages[nightOwl] ?? 0;
    if (nightCount > 10) {
      awards.push({
        title: 'Nocny Marek',
        winner: nightOwl,
        stat: `${nightCount} po 22:00`,
        emoji: '🦉',
        color: AWARD_COLORS[5],
      });
    }
  }

  return awards;
}

const sv = { hidden: { opacity: 0 }, visible: { opacity: 1 } };

export default function GroupChatAwards({ quantitative, conversation }: GroupChatAwardsProps) {
  const awards = buildAwards(quantitative, conversation);

  if (awards.length === 0) return null;

  return (
    <motion.div
      variants={sv}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4 }}
    >
      <h3 className="mb-4 text-lg font-bold text-foreground">
        🏆 Group Chat Awards
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map((award, i) => (
          <motion.div
            key={award.title}
            variants={sv}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-hover"
          >
            {/* Glow accent */}
            <div
              className="absolute -right-4 -top-4 size-20 rounded-full opacity-10 blur-2xl"
              style={{ background: award.color }}
            />

            <div className="relative z-10">
              {/* Emoji + Title */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xl">{award.emoji}</span>
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: award.color }}
                >
                  {award.title}
                </span>
              </div>

              {/* Winner */}
              <div className="mb-1 text-sm font-semibold text-foreground">
                {award.winner}
              </div>

              {/* Stat */}
              <div className="font-mono text-xs text-text-secondary">
                {award.stat}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
