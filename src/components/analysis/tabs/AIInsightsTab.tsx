'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';

import type { StoredAnalysis, QualitativeAnalysis, RoastResult } from '@/lib/analysis/types';
import type { QuantitativeAnalysis, ParsedConversation, DamageReportResult } from '@/lib/parsers/types';
import type { CognitiveFunctionsResult } from '@/lib/analysis/cognitive-functions';

import AIAnalysisButton from '@/components/analysis/AIAnalysisButton';
import AIAnalysisSectionHeader from '@/components/analysis/AIAnalysisSectionHeader';
import AttachmentStyleCards from '@/components/analysis/AttachmentStyleCards';
import CommunicationStyleMeters from '@/components/analysis/CommunicationStyleMeters';
import ToneRadarChart from '@/components/analysis/ToneRadarChart';
import LoveLanguageCard from '@/components/analysis/LoveLanguageCard';
import TurningPointsTimeline from '@/components/analysis/TurningPointsTimeline';
import RelationshipBalance from '@/components/analysis/RelationshipBalance';
import PersonalityDeepDive from '@/components/analysis/PersonalityDeepDive';
import SectionDivider from '@/components/analysis/SectionDivider';
import PaywallGate from '@/components/shared/PaywallGate';
import ProPreview from '@/components/analysis/ProPreview';

const RoastSection = dynamic(() => import('@/components/analysis/RoastSection'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const EnhancedRoastButton = dynamic(() => import('@/components/analysis/EnhancedRoastButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const AnalysisImageCard = dynamic(() => import('@/components/analysis/AnalysisImageCard'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const CognitiveFunctionsClash = dynamic(() => import('@/components/analysis/CognitiveFunctionsClash'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const DamageReport = dynamic(() => import('@/components/analysis/DamageReport'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const AIPredictions = dynamic(() => import('@/components/analysis/AIPredictions'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});

const sv = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const dur = 0.4;
const vp = { once: true, margin: '-80px' as const };

interface AIInsightsTabProps {
  analysis: StoredAnalysis;
  quantitative: QuantitativeAnalysis;
  qualitative: QualitativeAnalysis | undefined;
  conversation: ParsedConversation;
  participants: string[];
  isServerView: boolean;
  sortedParticipants: string[];
  hasQualitative: boolean;
  cognitiveFunctions: CognitiveFunctionsResult | undefined;
  damageReport: DamageReportResult | undefined;
  onAIComplete: (qualitative: QualitativeAnalysis) => void;
  onRoastComplete: (roast: RoastResult) => void;
  onImageSaved: (key: string, dataUrl: string) => void;
}

function AnalysisProgressBar({ qualitative, isServerView }: {
  qualitative: QualitativeAnalysis | undefined;
  isServerView: boolean;
}) {
  if (isServerView) return null;

  const steps = [
    { label: 'Analiza ilościowa', done: true },
    { label: 'AI Pass 1: Przegląd', done: Boolean(qualitative?.pass1) },
    { label: 'AI Pass 2: Dynamika', done: Boolean(qualitative?.pass2) },
    { label: 'AI Pass 3: Profile', done: Boolean(qualitative?.pass3) },
    { label: 'AI Pass 4: Synteza', done: Boolean(qualitative?.pass4) },
    { label: 'Enhanced Roast', done: Boolean(qualitative?.roast) },
  ];
  const doneCount = steps.filter(s => s.done).length;
  const total = steps.length;
  const pct = Math.round((doneCount / total) * 100);

  if (doneCount === total) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Postęp analizy</span>
        <span className="text-xs text-muted-foreground">{doneCount} z {total} etapów ({pct}%)</span>
      </div>
      <div className="space-y-1.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className={`h-1.5 flex-1 rounded-full ${step.done ? 'bg-emerald-500' : 'bg-muted-foreground/15'}`}>
              {step.done && <div className="h-full w-full rounded-full bg-emerald-500" />}
            </div>
            <span className={`w-36 text-[10px] ${step.done ? 'text-emerald-400 font-medium' : 'text-muted-foreground/50'}`}>
              {step.label} {step.done ? '✓' : '○'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AIInsightsTab({
  analysis,
  quantitative,
  qualitative,
  conversation,
  participants,
  isServerView,
  hasQualitative,
  cognitiveFunctions,
  damageReport,
  onAIComplete,
  onRoastComplete,
  onImageSaved,
}: AIInsightsTabProps) {
  return (
    <div>
      <SectionDivider number="06" title="Analiza AI" subtitle="Dane czekają na interpretację" id="section-ai" />

      {/* AI Analysis Button — when not yet analyzed */}
      {!hasQualitative && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <AIAnalysisButton
            analysisId={analysis.id}
            conversation={conversation}
            quantitative={quantitative}
            onComplete={onAIComplete}
            onRoastComplete={onRoastComplete}
            relationshipContext={analysis.relationshipContext}
          />
        </motion.div>
      )}

      {/* Roast Results */}
      {analysis.qualitative?.roast && (
        <motion.div id="section-roast" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <RoastSection
            roast={analysis.qualitative.roast}
            participants={participants}
            messages={conversation.messages}
            savedRoastImage={analysis.generatedImages?.['roast']}
            onRoastImageSaved={(dataUrl) => onImageSaved('roast', dataUrl)}
          />
        </motion.div>
      )}

      {/* AI Analysis Results — when analysis is complete */}
      {hasQualitative && (
        <div className="space-y-4">
          {/* AI Section Header */}
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <AIAnalysisSectionHeader
              confidence={qualitative?.pass1?.overall_dynamic?.confidence}
            />
          </motion.div>

          {/* View Relationship Story */}
          <PaywallGate feature="story_wrapped" teaser={{
            headline: 'Twoja historia relacji czeka',
            icon: 'sparkles',
          }}>
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <Link href={`/analysis/${analysis.id}/story`} className="group block">
                <div
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-border-hover"
                  style={{ borderLeft: '3px solid', borderImage: 'linear-gradient(180deg, #3b82f6, #a855f7) 1' }}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <Sparkles className="size-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Zobacz historię relacji</p>
                    <p className="text-xs text-muted-foreground">Pełnoekranowa opowieść o waszej relacji</p>
                  </div>
                  <ChevronRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </motion.div>
          </PaywallGate>

          {/* Analysis Progress Bar — shows remaining steps */}
          <AnalysisProgressBar qualitative={qualitative} isServerView={isServerView} />

          {/* Passes 2-4 content — gated for Pro */}
          <PaywallGate feature="ai_passes_2_4" blurPreview teaser={{
            headline: `Profil ${participants[0]} jest gotowy`,
            stat: qualitative?.pass4?.health_score?.overall?.toString(),
            statLabel: 'Health Score',
            icon: 'brain',
          }}>
            {qualitative?.pass3 ? (
              <>
                {/* AI-Generated Visualization */}
                {qualitative?.pass4 && (
                  <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
                    <AnalysisImageCard
                      pass4={qualitative.pass4}
                      participants={participants}
                      messages={conversation.messages}
                      savedImage={analysis.generatedImages?.['comic']}
                      onImageSaved={(dataUrl) => onImageSaved('comic', dataUrl)}
                    />
                  </motion.div>
                )}

                {/* AI 3-Column Row: Attachment + Communication Style + Tone Radar */}
                {(qualitative?.pass3 || qualitative?.pass1) && (
                  <motion.div
                    id="section-profiles"
                    className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                    variants={sv}
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: dur }}
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

                {/* Disclaimer: Personality assessments */}
                {qualitative?.pass3 && (
                  <p className="text-[11px] italic text-muted-foreground/50 px-1">
                    Styl przywiązania, styl komunikacji i rozkład tonu to przybliżone proxy oparte na analizie tekstu, nie na walidowanych kwestionariuszach (ECR-R, NEO-PI-R). Nie stanowią diagnozy psychologicznej.
                  </p>
                )}

                {/* Love Languages */}
                {qualitative?.pass3 && (
                  <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
                    <LoveLanguageCard
                      profiles={qualitative.pass3}
                      participants={participants}
                    />
                  </motion.div>
                )}

                {/* Insights Row: Turning Points + Relationship Balance */}
                {(qualitative?.pass4 || qualitative?.pass2) && (
                  <motion.div
                    id="section-dynamics"
                    className="grid gap-4 grid-cols-1 lg:grid-cols-[1.6fr_1fr]"
                    variants={sv}
                    initial="hidden"
                    animate="visible"
                    transition={{ duration: dur }}
                  >
                    <TurningPointsTimeline
                      pass2={qualitative?.pass2}
                      pass4={qualitative?.pass4}
                      participants={participants}
                      dateRange={conversation.metadata.dateRange}
                    />
                    <RelationshipBalance
                      pass4={qualitative?.pass4}
                      pass2={qualitative?.pass2}
                    />
                  </motion.div>
                )}

                {/* Full Psychological Profile Deep Dive */}
                {qualitative?.pass3 && (
                  <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
                    <PersonalityDeepDive
                      profiles={qualitative.pass3}
                      participants={participants}
                    />
                  </motion.div>
                )}

                {/* Cognitive Functions Clash (MBTI-derived) */}
                {cognitiveFunctions && !isServerView && (
                  <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
                    <CognitiveFunctionsClash result={cognitiveFunctions} participants={participants} />
                  </motion.div>
                )}

                {/* Disclaimer: Big Five & MBTI */}
                {qualitative?.pass3 && (
                  <p className="text-[11px] italic text-muted-foreground/50 px-1">
                    Big Five i MBTI to przybliżenia oparte na analizie tekstu rozmowy, nie na standaryzowanych kwestionariuszach psychologicznych. Health Score (0-100) to niewalidowana metryka rozrywkowa. Wyniki te nie stanowią oceny klinicznej.
                  </p>
                )}

                {/* Damage Report */}
                {!isServerView && damageReport && (
                  <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
                    <DamageReport report={damageReport} />
                  </motion.div>
                )}

                {/* AI Predictions */}
                {qualitative?.pass4?.predictions && qualitative.pass4.predictions.length > 0 && (
                  <>
                    <SectionDivider title="Prognozy AI" subtitle="Co mówią trendy o przyszłości tej relacji" />
                    <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
                      <AIPredictions predictions={qualitative.pass4.predictions} />
                    </motion.div>
                  </>
                )}
              </>
            ) : (
              <ProPreview participants={participants} />
            )}
          </PaywallGate>

          {/* Enhanced Roast — available after full AI analysis */}
          <PaywallGate feature="enhanced_roast" teaser={{
            headline: 'Psychologiczny roast jest gotowy',
            detail: 'Na podstawie pełnej analizy 4 passów AI',
            icon: 'fire',
          }}>
            <motion.div id="section-synthesis" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <EnhancedRoastButton analysis={analysis} onComplete={onRoastComplete} />
            </motion.div>
          </PaywallGate>
        </div>
      )}
    </div>
  );
}
