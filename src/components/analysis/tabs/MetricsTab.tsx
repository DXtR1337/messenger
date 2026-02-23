'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';

import TimelineChart from '@/components/analysis/TimelineChart';
import EmojiReactions from '@/components/analysis/EmojiReactions';
import HeatmapChart from '@/components/analysis/HeatmapChart';
import ResponseTimeChart from '@/components/analysis/ResponseTimeChart';
import MessageLengthSection from '@/components/analysis/MessageLengthSection';
import WeekdayWeekendCard from '@/components/analysis/WeekdayWeekendCard';
import BurstActivity from '@/components/analysis/BurstActivity';
import TopWordsCard from '@/components/analysis/TopWordsCard';
import SectionDivider from '@/components/analysis/SectionDivider';

const ResponseTimeHistogram = dynamic(() => import('@/components/analysis/ResponseTimeHistogram'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const HourlyActivityChart = dynamic(() => import('@/components/analysis/HourlyActivityChart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const SentimentChart = dynamic(() => import('@/components/analysis/SentimentChart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const IntimacyChart = dynamic(() => import('@/components/analysis/IntimacyChart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const ConflictTimeline = dynamic(() => import('@/components/analysis/ConflictTimeline'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const YearMilestonesCard = dynamic(() => import('@/components/analysis/YearMilestones'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const PursuitWithdrawalCard = dynamic(() => import('@/components/analysis/PursuitWithdrawalCard'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});

const sv = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const dur = 0.4;
const vp = { once: true, margin: '-80px' as const };

interface MetricsTabProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
  participants: string[];
  isServerView: boolean;
  sortedParticipants: string[];
}

export default function MetricsTab({
  quantitative,
  conversation,
  participants,
  isServerView,
}: MetricsTabProps) {
  return (
    <div>
      {/* ======= AKTYWNOSC I CZAS ======= */}
      <SectionDivider number="02" title="Aktywność i czas" subtitle="Kiedy piszecie, kiedy milczycie" id="section-activity" />
      <div className="space-y-4">
        <motion.div
          className="grid gap-4 grid-cols-1 xl:grid-cols-[1.6fr_1fr]"
          variants={sv}
          initial="hidden"
          animate="visible"
          transition={{ duration: dur }}
        >
          <TimelineChart
            monthlyVolume={quantitative.patterns.monthlyVolume}
            participants={participants}
          />
          <EmojiReactions
            perPerson={quantitative.perPerson}
            participants={participants}
          />
        </motion.div>
        <motion.div
          className="grid gap-4 grid-cols-1 xl:grid-cols-[1fr_1.6fr]"
          variants={sv}
          initial="hidden"
          animate="visible"
          transition={{ duration: dur }}
        >
          <HeatmapChart heatmap={quantitative.heatmap} participants={participants} />
          <ResponseTimeChart
            trendData={quantitative.trends.responseTimeTrend}
            participants={participants}
          />
        </motion.div>
        {/* Response Time Histogram + Hourly Activity */}
        {quantitative.responseTimeDistribution && (
          <motion.div
            id="section-response-time"
            className="grid gap-4 grid-cols-1 lg:grid-cols-2"
            variants={sv}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            transition={{ duration: dur }}
          >
            <ResponseTimeHistogram
              distribution={quantitative.responseTimeDistribution}
              participants={participants}
            />
            <HourlyActivityChart
              heatmap={quantitative.heatmap}
              participants={participants}
            />
          </motion.div>
        )}
      </div>

      {/* ======= WZORCE KOMUNIKACJI ======= */}
      <SectionDivider number="03" title="Wzorce komunikacji" id="section-communication" />
      <div className="space-y-4">
        <motion.div id="section-messages" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <MessageLengthSection quantitative={quantitative} participants={participants} />
        </motion.div>
        <motion.div
          className="grid gap-4 grid-cols-1 lg:grid-cols-2"
          variants={sv}
          initial="hidden"
          animate="visible"
          transition={{ duration: dur }}
        >
          <WeekdayWeekendCard quantitative={quantitative} participants={participants} />
          <BurstActivity quantitative={quantitative} />
        </motion.div>
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <TopWordsCard
            perPerson={quantitative.perPerson}
            participants={participants}
          />
        </motion.div>

        {/* Sentiment + Intimacy */}
        {(quantitative.trends.sentimentTrend || quantitative.intimacyProgression) && (
          <motion.div
            className="grid gap-4 grid-cols-1 lg:grid-cols-2"
            variants={sv}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            transition={{ duration: dur }}
          >
            {quantitative.trends.sentimentTrend && quantitative.trends.sentimentTrend.length > 1 && (
              <SentimentChart quantitative={quantitative} participants={participants} />
            )}
            {quantitative.intimacyProgression && quantitative.intimacyProgression.trend.length > 1 && (
              <IntimacyChart intimacy={quantitative.intimacyProgression} />
            )}
          </motion.div>
        )}

        {/* Conflict Detection */}
        {quantitative.conflictAnalysis && quantitative.conflictAnalysis.totalConflicts > 0 && (
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ConflictTimeline conflictAnalysis={quantitative.conflictAnalysis} />
          </motion.div>
        )}

        {/* Year Milestones + Pursuit-Withdrawal */}
        <motion.div
          className="grid gap-4 grid-cols-1 lg:grid-cols-2"
          variants={sv}
          initial="hidden"
          whileInView="visible"
          viewport={vp}
          transition={{ duration: dur }}
        >
          {quantitative.yearMilestones && (
            <YearMilestonesCard milestones={quantitative.yearMilestones} />
          )}
          {quantitative.pursuitWithdrawal && !isServerView && (
            <PursuitWithdrawalCard analysis={quantitative.pursuitWithdrawal} />
          )}
        </motion.div>
      </div>
    </div>
  );
}
