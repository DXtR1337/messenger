'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, TrendingDown, Trophy, AlertTriangle } from 'lucide-react';
import type { YearMilestones as YearMilestonesType } from '@/lib/parsers/types';
import { formatNumber } from '@/lib/utils';

interface YearMilestonesProps {
  milestones: YearMilestonesType;
}

const staggerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.1 },
  }),
};

function accentBorderColor(index: number): string {
  const colors = ['#3b82f6', '#ef4444', '#10b981'];
  return colors[index % colors.length];
}

export default function YearMilestones({ milestones }: YearMilestonesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: '-50px' });

  if (!milestones) return null;

  const trendPercent = Math.round(milestones.yoyTrend * 100);
  const trendPositive = trendPercent >= 0;

  const cards = [
    {
      icon: <Trophy className="size-5 text-blue-400" />,
      title: 'Szczytowy miesiąc',
      value: milestones.peakMonth.label,
      subtitle: `${formatNumber(milestones.peakMonth.count)} wiadomości`,
      accentColor: 'text-blue-400',
    },
    {
      icon: <AlertTriangle className="size-5 text-red-400" />,
      title: 'Najsłabszy miesiąc',
      value: milestones.worstMonth.label,
      subtitle: `${formatNumber(milestones.worstMonth.count)} wiadomości`,
      accentColor: 'text-red-400',
    },
    {
      icon: trendPositive ? (
        <TrendingUp className="size-5 text-emerald-400" />
      ) : (
        <TrendingDown className="size-5 text-red-400" />
      ),
      title: 'Trend roczny',
      value: `${trendPositive ? '+' : ''}${trendPercent}%`,
      subtitle: `Na podstawie ${milestones.totalMonths} miesięcy`,
      accentColor: trendPositive ? 'text-emerald-400' : 'text-red-400',
    },
  ];

  return (
    <div ref={containerRef} className="grid grid-cols-1 gap-2 sm:gap-4 sm:grid-cols-3">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          custom={i}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={staggerVariants}
          className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 border-t-2 transition-colors hover:border-white/[0.08]"
          style={{ borderTopColor: accentBorderColor(i) }}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            {card.icon}
            <span className="text-[11px] uppercase tracking-wider">{card.title}</span>
          </div>
          <p className={`font-display text-3xl font-black ${card.accentColor}`}>
            {card.value}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{card.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
}
