'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { loadAnalysis, saveAnalysis } from '@/lib/utils';
import { useSidebar } from '@/components/shared/SidebarContext';
import type { StoredAnalysis, QualitativeAnalysis } from '@/lib/analysis/types';

import AnalysisHeader from '@/components/analysis/AnalysisHeader';
import ParticipantStrip from '@/components/analysis/ParticipantStrip';
import KPICards from '@/components/analysis/KPICards';
import TimelineChart from '@/components/analysis/TimelineChart';
import EmojiReactions from '@/components/analysis/EmojiReactions';
import HeatmapChart from '@/components/analysis/HeatmapChart';
import ResponseTimeChart from '@/components/analysis/ResponseTimeChart';
import StatsGrid from '@/components/analysis/StatsGrid';
import AIAnalysisButton from '@/components/analysis/AIAnalysisButton';
import AIAnalysisSectionHeader from '@/components/analysis/AIAnalysisSectionHeader';
import AttachmentStyleCards from '@/components/analysis/AttachmentStyleCards';
import CommunicationStyleMeters from '@/components/analysis/CommunicationStyleMeters';
import ToneRadarChart from '@/components/analysis/ToneRadarChart';
import TurningPointsTimeline from '@/components/analysis/TurningPointsTimeline';
import RelationshipBalance from '@/components/analysis/RelationshipBalance';
import AnalysisImageCard from '@/components/analysis/AnalysisImageCard';
import TopWordsCard from '@/components/analysis/TopWordsCard';
import PersonalityDeepDive from '@/components/analysis/PersonalityDeepDive';

const sectionVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function AnalysisResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const { setBreadcrumb } = useSidebar();

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadAnalysis(id);
        if (!stored) {
          setError('Analysis not found. It may have been deleted or the link is invalid.');
        } else {
          setAnalysis(stored);
          setBreadcrumb(['Analiza', stored.title]);
        }
      } catch {
        setError('Failed to load analysis data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, setBreadcrumb]);

  const handleAIComplete = useCallback(
    (qualitative: QualitativeAnalysis) => {
      if (!analysis) return;
      const updated: StoredAnalysis = { ...analysis, qualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Ładowanie analizy...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Nie znaleziono analizy</h2>
          <p className="text-sm text-muted-foreground">
            {error ?? 'Nie udało się załadować danych analizy.'}
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard" className="gap-2">
              <ArrowLeft className="size-4" />
              Powrót do dashboardu
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { conversation, quantitative, qualitative } = analysis;
  const participants = conversation.participants.map((p) => p.name);
  const hasQualitative = qualitative?.status === 'complete';

  return (
    <div className="space-y-5">
      {/* Analysis Header — title, meta tags, health score ring */}
      <motion.div variants={sectionVariant} initial="hidden" animate="visible" transition={{ duration: 0.4 }}>
        <AnalysisHeader
          title={conversation.title}
          conversation={conversation}
          healthScore={qualitative?.pass4?.health_score.overall}
          healthVerdict={
            qualitative?.pass4?.health_score.overall !== undefined
              ? qualitative.pass4.health_score.overall >= 80
                ? 'Zdrowa, zbalansowana komunikacja'
                : qualitative.pass4.health_score.overall >= 60
                  ? 'Przeciętna komunikacja z potencjałem'
                  : qualitative.pass4.health_score.overall >= 40
                    ? 'Komunikacja wymaga uwagi'
                    : 'Niezdrowe wzorce komunikacji'
              : undefined
          }
        />
      </motion.div>

      {/* Participant Comparison Strip */}
      <motion.div variants={sectionVariant} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.05 }}>
        <ParticipantStrip
          participants={participants}
          perPerson={quantitative.perPerson}
          totalMessages={conversation.metadata.totalMessages}
        />
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={sectionVariant} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.1 }}>
        <KPICards quantitative={quantitative} conversation={conversation} />
      </motion.div>

      {/* Detailed Stats Grid */}
      <motion.div variants={sectionVariant} initial="hidden" animate="visible" transition={{ duration: 0.4, delay: 0.12 }}>
        <StatsGrid quantitative={quantitative} participants={participants} />
      </motion.div>

      {/* Charts Row 1: Activity + Emoji */}
      <motion.div
        className="grid gap-3.5 grid-cols-1 lg:grid-cols-[1.6fr_1fr]"
        variants={sectionVariant}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.15 }}
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

      {/* Top Words */}
      <motion.div
        variants={sectionVariant}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.17 }}
      >
        <TopWordsCard
          perPerson={quantitative.perPerson}
          participants={participants}
        />
      </motion.div>

      {/* Charts Row 2: Heatmap + Response Time */}
      <motion.div
        className="grid gap-3.5 grid-cols-1 lg:grid-cols-[1fr_1.6fr]"
        variants={sectionVariant}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <HeatmapChart heatmap={quantitative.heatmap} participants={participants} />
        <ResponseTimeChart
          trendData={quantitative.trends.responseTimeTrend}
          participants={participants}
        />
      </motion.div>

      {/* AI Analysis Button — when not yet analyzed */}
      {!hasQualitative && (
        <motion.div
          variants={sectionVariant}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <AIAnalysisButton
            analysisId={analysis.id}
            conversation={conversation}
            quantitative={quantitative}
            onComplete={handleAIComplete}
          />
        </motion.div>
      )}

      {/* AI Analysis Results — when analysis is complete */}
      {hasQualitative && (
        <>
          {/* AI Section Header */}
          <motion.div
            variants={sectionVariant}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <AIAnalysisSectionHeader
              confidence={qualitative?.pass1?.overall_dynamic.confidence}
            />
          </motion.div>

          {/* AI-Generated Visualization */}
          {qualitative?.pass4 && (
            <motion.div
              variants={sectionVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.4, delay: 0.08 }}
            >
              <AnalysisImageCard
                pass4={qualitative.pass4}
                participants={participants}
                messages={conversation.messages}
              />
            </motion.div>
          )}

          {/* AI 3-Column Row: Attachment + Communication Style + Tone Radar */}
          {(qualitative?.pass3 || qualitative?.pass1) && (
            <motion.div
              className="grid gap-3.5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              variants={sectionVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {qualitative?.pass3 && (
                <AttachmentStyleCards
                  profiles={qualitative.pass3}
                  participants={participants}
                />
              )}
              {qualitative?.pass3 && (
                <CommunicationStyleMeters
                  profiles={qualitative.pass3}
                  pass1={qualitative?.pass1}
                  participants={participants}
                />
              )}
              {qualitative?.pass1 && (
                <ToneRadarChart
                  pass1={qualitative.pass1}
                  participants={participants}
                />
              )}
            </motion.div>
          )}

          {/* Insights Row: Turning Points + Relationship Balance */}
          {(qualitative?.pass4 || qualitative?.pass2) && (
            <motion.div
              className="grid gap-3.5 grid-cols-1 lg:grid-cols-[1.6fr_1fr]"
              variants={sectionVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <TurningPointsTimeline
                pass2={qualitative?.pass2}
                pass4={qualitative?.pass4}
                participants={participants}
              />
              <RelationshipBalance
                pass4={qualitative?.pass4}
                pass2={qualitative?.pass2}
              />
            </motion.div>
          )}

          {/* Full Psychological Profile Deep Dive */}
          {qualitative?.pass3 && (
            <motion.div
              variants={sectionVariant}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <PersonalityDeepDive
                profiles={qualitative.pass3}
                participants={participants}
              />
            </motion.div>
          )}
        </>
      )}

      {/* Bottom spacer */}
      <div className="h-16" />
    </div>
  );
}
