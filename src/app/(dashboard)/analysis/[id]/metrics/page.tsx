'use client';

import { lazy, Suspense, useRef, useState, useMemo } from 'react';

import { useScrollChoreography } from '@/hooks/useScrollChoreography';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import ModePageShell from '@/components/shared/ModePageShell';
import AnalysisCard from '@/components/shared/AnalysisCard';
import BrandShimmer from '@/components/shared/BrandShimmer';
import type { TimeRange } from '@/components/analysis/chart-config';
import {
  filterMonthlyByRange,
  filterMessagesByRange,
  filterBurstsByRange,
  filterConflictEventsByRange,
  computeHeatmapFromMessages,
  computeResponseTimeDistributionFromMessages,
  computeWeekdayWeekendFromMessages,
} from '@/lib/analysis/quant/filtered-metrics';

// Static imports for above-the-fold components
import TimelineChart from '@/components/analysis/TimelineChart';
import StatsGrid from '@/components/analysis/StatsGrid';
import ChartTimeRangeFilter from '@/components/analysis/ChartTimeRangeFilter';

// Lazy-loaded heavy chart components
const HeatmapChart = lazy(() => import('@/components/analysis/HeatmapChart'));
const ResponseTimeChart = lazy(() => import('@/components/analysis/ResponseTimeChart'));
const EmojiReactions = lazy(() => import('@/components/analysis/EmojiReactions'));
const MessageLengthSection = lazy(() => import('@/components/analysis/MessageLengthSection'));
const WeekdayWeekendCard = lazy(() => import('@/components/analysis/WeekdayWeekendCard'));
const BurstActivity = lazy(() => import('@/components/analysis/BurstActivity'));
const TopWordsCard = lazy(() => import('@/components/analysis/TopWordsCard'));
const ResponseTimeHistogram = lazy(() => import('@/components/analysis/ResponseTimeHistogram'));
const HourlyActivityChart = lazy(() => import('@/components/analysis/HourlyActivityChart'));
const YearMilestones = lazy(() => import('@/components/analysis/YearMilestones'));
const LSMCard = lazy(() => import('@/components/analysis/LSMCard'));
const PronounCard = lazy(() => import('@/components/analysis/PronounCard'));
const PursuitWithdrawalCard = lazy(() => import('@/components/analysis/PursuitWithdrawalCard'));
const ChronotypePair = lazy(() => import('@/components/analysis/ChronotypePair'));
const ConversationalNarcissismCard = lazy(() => import('@/components/analysis/ConversationalNarcissismCard'));
const EmotionalGranularityCard = lazy(() => import('@/components/analysis/EmotionalGranularityCard'));
const BidResponseCard = lazy(() => import('@/components/analysis/BidResponseCard'));
const IntegrativeComplexityCard = lazy(() => import('@/components/analysis/IntegrativeComplexityCard'));
const TemporalFocusCard = lazy(() => import('@/components/analysis/TemporalFocusCard'));
const RepairPatternsCard = lazy(() => import('@/components/analysis/RepairPatternsCard'));
const BadgesGrid = lazy(() => import('@/components/analysis/BadgesGrid'));
const RankingBadges = lazy(() => import('@/components/analysis/RankingBadges'));
const SentimentChart = lazy(() => import('@/components/analysis/SentimentChart'));
const IntimacyChart = lazy(() => import('@/components/analysis/IntimacyChart'));
const ConflictTimeline = lazy(() => import('@/components/analysis/ConflictTimeline'));
const BestTimeToTextCard = lazy(() => import('@/components/analysis/BestTimeToTextCard'));
const CatchphraseCard = lazy(() => import('@/components/analysis/CatchphraseCard'));
const GhostForecast = lazy(() => import('@/components/analysis/GhostForecast'));

// ---------------------------------------------------------------------------
// Section progress dots — fixed right nav (desktop only)
// ---------------------------------------------------------------------------

const SECTIONS = ['Statystyki', 'Osiągnięcia', 'Aktywność', 'Wzorce', 'Sentyment', 'Zaawansowane'];

function SectionProgressDots() {
  return (
    <nav className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 xl:flex" aria-label="Nawigacja sekcji">
      {SECTIONS.map((section, i) => (
        <button
          key={section}
          onClick={() => {
            const el = document.getElementById(`section-${i}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="group flex items-center gap-2"
          title={section}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/20 transition-all duration-300 group-hover:bg-white/50 group-hover:scale-150" />
        </button>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function ChartFallback() {
  return <BrandShimmer rows={1} className="h-48" />;
}

function SectionHeader({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} data-scroll-group="section-header" className="sticky-section-header mt-16 mb-6 flex items-center gap-4 py-3">
      <span className="accent-dot shrink-0" />
      <span className="bg-gradient-to-r from-blue-400/90 to-purple-400/80 bg-clip-text font-[var(--font-syne)] text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
        {children}
      </span>
      <span data-scroll-element="header-line" className="h-px flex-1 bg-gradient-to-r from-white/[0.06] to-transparent" />
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MetricsModePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    quantitative,
    conversation,
    participants,
    isServerView,
  } = useAnalysis();

  useScrollChoreography(containerRef);

  // ── Global time range filter ──────────────────────────────
  const [range, setRange] = useState<TimeRange>('Wszystko');
  const latestTs = conversation.metadata.dateRange.end;
  const participantNames = useMemo(() => participants.map(String), [participants]);

  // Filter monthly time-series data (just slice)
  const filteredMonthlyVolume = useMemo(
    () => filterMonthlyByRange(quantitative.patterns.monthlyVolume, range, latestTs),
    [quantitative.patterns.monthlyVolume, range, latestTs],
  );
  const filteredResponseTimeTrend = useMemo(
    () => filterMonthlyByRange(quantitative.trends.responseTimeTrend, range, latestTs),
    [quantitative.trends.responseTimeTrend, range, latestTs],
  );
  const filteredSentimentTrend = useMemo(
    () => filterMonthlyByRange(quantitative.trends.sentimentTrend, range, latestTs),
    [quantitative.trends.sentimentTrend, range, latestTs],
  );
  const filteredIntimacy = useMemo(() => {
    if (!quantitative.intimacyProgression) return quantitative.intimacyProgression;
    if (range === 'Wszystko') return quantitative.intimacyProgression;
    const filteredTrend = filterMonthlyByRange(quantitative.intimacyProgression.trend, range, latestTs);
    return { ...quantitative.intimacyProgression, trend: filteredTrend };
  }, [quantitative.intimacyProgression, range, latestTs]);

  // Recompute aggregate data from filtered messages
  const filteredMessages = useMemo(
    () => filterMessagesByRange(conversation.messages, range, latestTs),
    [conversation.messages, range, latestTs],
  );
  const filteredHeatmap = useMemo(
    () => range === 'Wszystko' ? quantitative.heatmap : computeHeatmapFromMessages(filteredMessages, participantNames),
    [range, quantitative.heatmap, filteredMessages, participantNames],
  );
  const filteredResponseTimeDistribution = useMemo(
    () => range === 'Wszystko' ? quantitative.responseTimeDistribution : computeResponseTimeDistributionFromMessages(filteredMessages, participantNames),
    [range, quantitative.responseTimeDistribution, filteredMessages, participantNames],
  );
  const filteredWeekdayWeekend = useMemo(() => {
    if (range === 'Wszystko') return quantitative.patterns.weekdayWeekend;
    return computeWeekdayWeekendFromMessages(filteredMessages, participantNames);
  }, [range, quantitative.patterns.weekdayWeekend, filteredMessages, participantNames]);

  const filteredBursts = useMemo(
    () => filterBurstsByRange(quantitative.patterns.bursts, range, latestTs),
    [quantitative.patterns.bursts, range, latestTs],
  );
  const quantitativeWithFilteredBursts = useMemo(() => {
    if (range === 'Wszystko') return quantitative;
    return {
      ...quantitative,
      patterns: { ...quantitative.patterns, bursts: filteredBursts },
    };
  }, [quantitative, range, filteredBursts]);

  // Quantitative overlays for components that read nested quantitative fields
  const quantitativeWithFilteredWeekday = useMemo(() => {
    if (range === 'Wszystko') return quantitative;
    return {
      ...quantitative,
      patterns: { ...quantitative.patterns, weekdayWeekend: filteredWeekdayWeekend },
    };
  }, [quantitative, range, filteredWeekdayWeekend]);

  const quantitativeWithFilteredSentiment = useMemo(() => {
    if (range === 'Wszystko') return quantitative;
    return {
      ...quantitative,
      trends: { ...quantitative.trends, sentimentTrend: filteredSentimentTrend },
    };
  }, [quantitative, range, filteredSentimentTrend]);

  const filteredConflictAnalysis = useMemo(() => {
    if (!quantitative.conflictAnalysis) return quantitative.conflictAnalysis;
    if (range === 'Wszystko') return quantitative.conflictAnalysis;
    const filtered = filterConflictEventsByRange(quantitative.conflictAnalysis.events, range, latestTs);
    return { ...quantitative.conflictAnalysis, events: filtered };
  }, [quantitative.conflictAnalysis, range, latestTs]);

  return (
    <SectionErrorBoundary section="Metrics">
    <ModePageShell
      mode="metrics"
      title="Obserwatorium Danych"
      subtitle="30+ wizualizacji ilościowych"
      video={{
        src: '/videos/modes/metrics-grid.webm',
        fallbackSrc: '/videos/modes/metrics-grid.mp4',
        poster: '/videos/posters/metrics-grid.webp',
      }}
    >
      <SectionProgressDots />

      <div ref={containerRef} className="metrics-content-rails space-y-12">
        {/* ── Stats Grid (above the fold) ────────────────────── */}
        <div id="section-0">
          <div data-scroll-card>
            <AnalysisCard glass>
              <StatsGrid quantitative={quantitative} participants={participants} platform={conversation.platform} />
            </AnalysisCard>
          </div>

          {/* Global time range filter */}
          <div className="mt-5" data-scroll-card>
            <ChartTimeRangeFilter value={range} onChange={setRange} />
          </div>
        </div>

        {/* ── Osiągnięcia i Ranking ────────────────────── */}
        {(quantitative.badges?.length || quantitative.rankingPercentiles) && (
          <div id="section-1">
            <SectionHeader>Osiągnięcia i Ranking</SectionHeader>
            {quantitative.badges && quantitative.badges.length > 0 && (
              <div data-scroll-card>
                <Suspense fallback={<ChartFallback />}>
                  <BadgesGrid badges={quantitative.badges} participants={participants} />
                </Suspense>
              </div>
            )}
            {quantitative.rankingPercentiles && !isServerView && (
              <div data-scroll-card>
                <Suspense fallback={<ChartFallback />}>
                  <RankingBadges rankings={quantitative.rankingPercentiles} />
                </Suspense>
              </div>
            )}
          </div>
        )}

        {/* ── Aktywność i Czas ────────────────────── */}
        <div id="section-2">
          <SectionHeader>Aktywność i Czas</SectionHeader>

          {/* Timeline */}
          <div data-scroll-card>
            <AnalysisCard glass shadow>
              <TimelineChart monthlyVolume={filteredMonthlyVolume} participants={participants} />
            </AnalysisCard>
          </div>

          <Suspense fallback={<ChartFallback />}>
            <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-6">
              <div data-scroll-card>
                <AnalysisCard glass>
                  <HeatmapChart heatmap={filteredHeatmap} participants={participants} />
                </AnalysisCard>
              </div>
              <div data-scroll-card>
                <AnalysisCard glass>
                  <HourlyActivityChart heatmap={filteredHeatmap} participants={participants} />
                </AnalysisCard>
              </div>
            </div>
          </Suspense>

          <Suspense fallback={<ChartFallback />}>
            <div data-scroll-card className="mt-5">
              <AnalysisCard glass>
                <ResponseTimeChart trendData={filteredResponseTimeTrend} participants={participants} />
              </AnalysisCard>
            </div>
          </Suspense>

          <Suspense fallback={<ChartFallback />}>
            {filteredResponseTimeDistribution && (
              <div data-scroll-card className="mt-5">
                <AnalysisCard glass>
                  <ResponseTimeHistogram distribution={filteredResponseTimeDistribution} participants={participants} />
                </AnalysisCard>
              </div>
            )}
          </Suspense>

          {quantitative.bestTimeToText && (
            <Suspense fallback={<ChartFallback />}>
              <div data-scroll-card className="mt-5">
                <AnalysisCard glass>
                  <BestTimeToTextCard bestTimeToText={quantitative.bestTimeToText} participants={participants} />
                </AnalysisCard>
              </div>
            </Suspense>
          )}
        </div>

        {/* ── Wzorce Komunikacji ────────────────────── */}
        <div id="section-3">
          <SectionHeader>Wzorce Komunikacji</SectionHeader>

          <Suspense fallback={<ChartFallback />}>
            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              <div data-scroll-card>
                <AnalysisCard glass>
                  <MessageLengthSection quantitative={quantitative} participants={participants} />
                </AnalysisCard>
              </div>
              <div data-scroll-card>
                <AnalysisCard glass>
                  <WeekdayWeekendCard quantitative={quantitativeWithFilteredWeekday} participants={participants} />
                </AnalysisCard>
              </div>
            </div>
          </Suspense>

          <Suspense fallback={<ChartFallback />}>
            <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-6">
              <div data-scroll-card>
                <AnalysisCard glass>
                  <EmojiReactions perPerson={quantitative.perPerson} participants={participants} />
                </AnalysisCard>
              </div>
              <div data-scroll-card>
                <AnalysisCard glass>
                  <TopWordsCard perPerson={quantitative.perPerson} participants={participants} />
                </AnalysisCard>
              </div>
            </div>
          </Suspense>

          {quantitative.catchphrases && (
            <Suspense fallback={<ChartFallback />}>
              <div data-scroll-card className="mt-5">
                <AnalysisCard glass>
                  <CatchphraseCard catchphrases={quantitative.catchphrases} participants={participants} />
                </AnalysisCard>
              </div>
            </Suspense>
          )}
        </div>

        {/* ── Sentyment i Dynamika ────────────────────── */}
        <div id="section-4">
          <SectionHeader>Sentyment i Dynamika</SectionHeader>

          <Suspense fallback={<ChartFallback />}>
            <div data-scroll-card>
              <AnalysisCard glass>
                <BurstActivity quantitative={quantitativeWithFilteredBursts} />
              </AnalysisCard>
            </div>
          </Suspense>

          {quantitative.yearMilestones && (
            <Suspense fallback={<ChartFallback />}>
              <div data-scroll-card className="mt-5">
                <AnalysisCard glass>
                  <YearMilestones milestones={quantitative.yearMilestones} />
                </AnalysisCard>
              </div>
            </Suspense>
          )}

          <Suspense fallback={<ChartFallback />}>
            <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-6">
              {filteredSentimentTrend && filteredSentimentTrend.length > 0 && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <SentimentChart quantitative={quantitativeWithFilteredSentiment} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
              {filteredIntimacy && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <IntimacyChart intimacy={filteredIntimacy} />
                  </AnalysisCard>
                </div>
              )}
            </div>
          </Suspense>

          {filteredConflictAnalysis && filteredConflictAnalysis.events.length > 0 && (
            <Suspense fallback={<ChartFallback />}>
              <div data-scroll-card className="mt-5">
                <AnalysisCard glass>
                  <ConflictTimeline conflictAnalysis={filteredConflictAnalysis} />
                </AnalysisCard>
              </div>
            </Suspense>
          )}

          {!isServerView && quantitative.viralScores && (
            <Suspense fallback={<ChartFallback />}>
              <div data-scroll-card className="mt-5">
                <AnalysisCard glass>
                  <GhostForecast viralScores={quantitative.viralScores} participants={participants} />
                </AnalysisCard>
              </div>
            </Suspense>
          )}
        </div>

        {/* ── Zaawansowane Metryki Badawcze ────────────────────── */}
        <div id="section-5">
          <SectionHeader>Zaawansowane Metryki Badawcze</SectionHeader>

          <Suspense fallback={<ChartFallback />}>
            <div className="grid gap-5 md:grid-cols-2 md:gap-6">
              {quantitative.lsm && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <LSMCard result={quantitative.lsm} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
              {quantitative.pronounAnalysis && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <PronounCard analysis={quantitative.pronounAnalysis} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
            </div>
          </Suspense>

          {!isServerView && (
            <Suspense fallback={<ChartFallback />}>
              <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-6">
                {quantitative.pursuitWithdrawal && (
                  <div data-scroll-card>
                    <AnalysisCard glass>
                      <PursuitWithdrawalCard analysis={quantitative.pursuitWithdrawal} />
                    </AnalysisCard>
                  </div>
                )}
                {quantitative.chronotypeCompatibility && (
                  <div data-scroll-card>
                    <AnalysisCard glass>
                      <ChronotypePair result={quantitative.chronotypeCompatibility} />
                    </AnalysisCard>
                  </div>
                )}
              </div>
            </Suspense>
          )}

          <Suspense fallback={<ChartFallback />}>
            <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-6">
              {quantitative.shiftSupportResult && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <ConversationalNarcissismCard result={quantitative.shiftSupportResult} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
              {quantitative.emotionalGranularity && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <EmotionalGranularityCard result={quantitative.emotionalGranularity} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
            </div>
          </Suspense>

          <Suspense fallback={<ChartFallback />}>
            <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-6">
              {quantitative.bidResponseResult && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <BidResponseCard result={quantitative.bidResponseResult} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
              {quantitative.integrativeComplexity && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <IntegrativeComplexityCard result={quantitative.integrativeComplexity} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
            </div>
          </Suspense>

          <Suspense fallback={<ChartFallback />}>
            <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-6">
              {quantitative.temporalFocus && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <TemporalFocusCard result={quantitative.temporalFocus} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
              {quantitative.repairPatterns && (
                <div data-scroll-card>
                  <AnalysisCard glass>
                    <RepairPatternsCard result={quantitative.repairPatterns} participants={participants} />
                  </AnalysisCard>
                </div>
              )}
            </div>
          </Suspense>
        </div>
      </div>
    </ModePageShell>
    </SectionErrorBoundary>
  );
}
