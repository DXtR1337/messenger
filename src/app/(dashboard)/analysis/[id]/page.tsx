'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const ShareCardGallery = dynamic(() => import('@/components/share-cards/ShareCardGallery'), {
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-card" />,
});

const RoastSection = dynamic(() => import('@/components/analysis/RoastSection'), {
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});

const CPSScreener = dynamic(() => import('@/components/analysis/CPSScreener'), {
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
import { AlertCircle, ArrowLeft, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { loadAnalysis, saveAnalysis } from '@/lib/utils';
import { useSidebar } from '@/components/shared/SidebarContext';
import type { StoredAnalysis, QualitativeAnalysis, RoastResult } from '@/lib/analysis/types';
import type { CPSResult } from '@/lib/analysis/communication-patterns';
import { meetsCPSRequirements } from '@/lib/analysis/communication-patterns';
import { useCPSAnalysis } from '@/hooks/useCPSAnalysis';


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
import LoveLanguageCard from '@/components/analysis/LoveLanguageCard';
import TurningPointsTimeline from '@/components/analysis/TurningPointsTimeline';
import RelationshipBalance from '@/components/analysis/RelationshipBalance';
import AnalysisImageCard from '@/components/analysis/AnalysisImageCard';
import TopWordsCard from '@/components/analysis/TopWordsCard';
import MessageLengthSection from '@/components/analysis/MessageLengthSection';
import WeekdayWeekendCard from '@/components/analysis/WeekdayWeekendCard';
import BurstActivity from '@/components/analysis/BurstActivity';
import PersonalityDeepDive from '@/components/analysis/PersonalityDeepDive';
import ViralScoresSection from '@/components/analysis/ViralScoresSection';
import BadgesGrid from '@/components/analysis/BadgesGrid';
import BestTimeToTextCard from '@/components/analysis/BestTimeToTextCard';
import CatchphraseCard from '@/components/analysis/CatchphraseCard';
import SectionDivider from '@/components/analysis/SectionDivider';


import ExportPDFButton from '@/components/analysis/ExportPDFButton';
import StandUpPDFButton from '@/components/analysis/StandUpPDFButton';
import EnhancedRoastButton from '@/components/analysis/EnhancedRoastButton';
import NetworkGraph from '@/components/analysis/NetworkGraph';
import GhostForecast from '@/components/analysis/GhostForecast';
import GroupChatAwards from '@/components/analysis/GroupChatAwards';
import ShareCaptionModal from '@/components/analysis/ShareCaptionModal';
import SectionNavigator from '@/components/analysis/SectionNavigator';

function Confetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ec4899'];
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 100,
      w: 4 + Math.random() * 6,
      h: 8 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    }));

    const start = Date.now();
    let raf: number;

    function draw() {
      if (!ctx || !canvas) return;
      const elapsed = Date.now() - start;
      if (elapsed > 3000) {
        onDone();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fade = elapsed > 2000 ? 1 - (elapsed - 2000) / 1000 : 1;

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.1;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        p.opacity = fade;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}

const sv = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
const dur = 0.5;
const vp = { once: true, margin: '-60px' as const };

export default function AnalysisResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const { setBreadcrumb } = useSidebar();

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await loadAnalysis(id);
        // Migrate old SCID data to CPS
        if (stored?.qualitative && 'scid' in stored.qualitative) {
          const qual = stored.qualitative as Record<string, unknown>;
          if (qual.scid && !qual.cps) {
            qual.cps = qual.scid;
          }
          delete qual.scid;
        }
        if (!stored) {
          setError('Nie znaleziono analizy. Mogła zostać usunięta lub link jest nieprawidłowy.');
        } else {
          setAnalysis(stored);
          setBreadcrumb(['Analiza', stored.title]);
          const celebrateKey = `podtekst-celebrate-${id}`;
          if (sessionStorage.getItem(celebrateKey)) {
            sessionStorage.removeItem(celebrateKey);
            setShowConfetti(true);
          }
        }
      } catch {
        setError('Nie udało się załadować danych analizy.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, setBreadcrumb]);

  const handleAIComplete = useCallback(
    (qualitative: QualitativeAnalysis) => {
      if (!analysis) return;
      // Spread existing qualitative first (preserves roast, cps, status, etc.)
      // then override with new API results (pass1-4 only)
      const mergedQualitative: QualitativeAnalysis = {
        ...analysis.qualitative,
        ...qualitative,
      };
      const updated: StoredAnalysis = { ...analysis, qualitative: mergedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  const handleRoastComplete = useCallback(
    (roast: RoastResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? {
        status: 'pending' as const,
      };
      const updatedQualitative: QualitativeAnalysis = {
        ...existingQualitative,
        roast,
      };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
      // Scroll to roast results after state update
      setTimeout(() => {
        document.getElementById('section-roast')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    },
    [analysis],
  );

  const handleCPSComplete = useCallback(
    (cps: CPSResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? {
        status: 'pending' as const,
      };
      const updatedQualitative: QualitativeAnalysis = {
        ...existingQualitative,
        cps,
      };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
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
  const hasQualitative = qualitative?.status === 'complete' && !!qualitative?.pass1;

  return (
    <div className="min-w-0 overflow-x-hidden">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <SectionNavigator />

      {/* ═══════ DISCLAIMER BANNER ═══════ */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-xs leading-relaxed text-amber-200/70">
          Ta analiza służy celom informacyjnym i rozrywkowym. <strong className="text-amber-200/90">NIE stanowi oceny klinicznej, psychologicznej ani profesjonalnej.</strong> Nie podejmuj decyzji dotyczących relacji na podstawie tych wyników bez konsultacji ze specjalistą.
        </p>
      </div>

      {/* ═══════ HERO ZONE ═══════ */}
      <div className="space-y-3">
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <AnalysisHeader
            title={conversation.title}
            conversation={conversation}
            healthScore={qualitative?.pass4?.health_score?.overall}
            healthVerdict={
              qualitative?.pass4?.health_score?.overall !== undefined
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

        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <ParticipantStrip
            participants={participants}
            perPerson={quantitative.perPerson}
            totalMessages={conversation.metadata.totalMessages}
          />
        </motion.div>

        {/* Story Mode + Wrapped entry points */}
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/analysis/${id}/story`}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium transition-colors hover:bg-card-hover"
            >
              <span className="text-lg">{'\u{1F4D6}'}</span>
              Story Mode
            </Link>
            <Link
              href={`/analysis/${id}/wrapped`}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-5 py-3 text-sm font-medium text-purple-300 transition-colors hover:from-purple-500/20 hover:to-blue-500/20"
            >
              <span className="text-lg">{'\u{2728}'}</span>
              Wrapped
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ═══════ SECTION: KLUCZOWE METRYKI ═══════ */}
      <SectionDivider number="01" title="Kluczowe metryki" id="section-metrics" />
      <div className="space-y-4">
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <KPICards quantitative={quantitative} conversation={conversation} />
        </motion.div>
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <StatsGrid quantitative={quantitative} participants={participants} />
        </motion.div>
      </div>

      {/* ═══════ SECTION: AKTYWNOŚĆ I CZAS ═══════ */}
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
      </div>

      {/* ═══════ SECTION: WZORCE KOMUNIKACJI ═══════ */}
      <SectionDivider number="03" title="Wzorce komunikacji" id="section-communication" />
      <div className="space-y-4">
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
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
      </div>

      {/* ═══════ SECTION: VIRAL SCORES ═══════ */}
      {quantitative.viralScores && (
        <>
          <SectionDivider number="04" title="Viral Scores" subtitle="Liczby nie kłamią. Ludzie — owszem." id="section-viral" />
          <div className="space-y-4">
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <ViralScoresSection quantitative={quantitative} participants={participants} />
            </motion.div>
            <motion.div
              className="grid gap-4 grid-cols-1 lg:grid-cols-2"
              variants={sv}
              initial="hidden"
              animate="visible"
              transition={{ duration: dur }}
            >
              {quantitative.bestTimeToText && (
                <BestTimeToTextCard bestTimeToText={quantitative.bestTimeToText} participants={participants} />
              )}
              {quantitative.catchphrases && (
                <CatchphraseCard catchphrases={quantitative.catchphrases} participants={participants} />
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* ═══════ SECTION: GHOST FORECAST ═══════ */}
      {quantitative.viralScores?.ghostRisk && (
        <>
          <SectionDivider title="Prognoza Ghostingu" subtitle="Prawdopodobieństwo że rozmowa ucichnie. Na zawsze." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <GhostForecast viralScores={quantitative.viralScores} participants={participants} />
          </motion.div>
        </>
      )}

      {/* ═══════ SECTION: OSIĄGNIĘCIA ═══════ */}
      {quantitative.badges && quantitative.badges.length > 0 && (
        <>
          <SectionDivider title="Osiągnięcia" subtitle="Odznaki za zasługi i przewinienia" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <BadgesGrid badges={quantitative.badges} participants={participants} />
          </motion.div>
        </>
      )}

      {/* ═══════ SECTION: GROUP CHAT AWARDS ═══════ */}
      {conversation.metadata.isGroup && (
        <>
          <SectionDivider title="Group Chat Awards" subtitle="Nagrody za wybitne osiągnięcia grupowe" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <GroupChatAwards quantitative={quantitative} conversation={conversation} />
          </motion.div>
        </>
      )}

      {/* ═══════ SECTION: SIEĆ INTERAKCJI (group chats only) ═══════ */}
      {quantitative.networkMetrics && (
        <>
          <SectionDivider title="Sieć interakcji" subtitle="Kto z kim rozmawia, a kto jest pomijany" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <NetworkGraph
              networkMetrics={quantitative.networkMetrics}
              participants={participants}
            />
          </motion.div>
        </>
      )}

      {/* ═══════ SECTION: UDOSTEPNIJ WYNIKI ═══════ */}
      <SectionDivider number="05" title="Udostępnij wyniki" subtitle="Niech inni też zobaczą" id="section-share" />
      <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
        <div className="mb-4 flex items-center gap-3">
          <ExportPDFButton analysis={analysis} />
          <StandUpPDFButton analysis={analysis} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCaptionModal(true)}
            className="gap-2"
          >
            <Sparkles className="size-4" />
            Gotowe captiony
          </Button>
        </div>
      </motion.div>
      <ShareCaptionModal
        isOpen={showCaptionModal}
        onClose={() => setShowCaptionModal(false)}
        participants={participants}
        healthScore={qualitative?.pass4?.health_score?.overall}
        compatibilityScore={quantitative.viralScores?.compatibilityScore}
        delusionScore={quantitative.viralScores?.delusionScore}
      />
      <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
        <ShareCardGallery analysis={analysis} />
      </motion.div>

      {/* ═══════ SECTION: ANALIZA AI ═══════ */}
      <SectionDivider number="06" title="Analiza AI" subtitle="Dane czekają na interpretację" id="section-ai" />

      {/* AI Analysis Button — when not yet analyzed */}
      {!hasQualitative && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <AIAnalysisButton
            analysisId={analysis.id}
            conversation={conversation}
            quantitative={quantitative}
            onComplete={handleAIComplete}
            onRoastComplete={handleRoastComplete}
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

          {/* View Relationship Story — subtle card style */}
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <Link href={`/analysis/${id}/story`} className="group block">
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

          {/* AI-Generated Visualization */}
          {qualitative?.pass4 && (
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
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

          {/* Enhanced Roast — available after full AI analysis */}
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <EnhancedRoastButton analysis={analysis} onComplete={handleRoastComplete} />
          </motion.div>

          {/* Communication Pattern Screener */}
          {hasQualitative && qualitative?.pass3 && (
            <>
              <SectionDivider title="Wzorce komunikacyjne" subtitle="Jak rozmawiacie — styl, tempo, nawyki" />
              <CPSScreenerSection
                analysis={analysis}
                onCPSComplete={handleCPSComplete}
              />
            </>
          )}
        </div>
      )}

      {/* Bottom spacer — accounts for fixed bottom nav bar + safe area on mobile */}
      <div className="h-24 sm:h-16" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CPS (Communication Pattern Screener) Section Component
// ═══════════════════════════════════════════════════════════

interface CPSScreenerSectionProps {
  analysis: StoredAnalysis;
  onCPSComplete: (cps: CPSResult) => void;
}

function CPSScreenerSection({ analysis, onCPSComplete }: CPSScreenerSectionProps) {
  const { conversation, quantitative, qualitative } = analysis;
  const participants = conversation.participants.map((p) => p.name);

  const [selectedParticipant, setSelectedParticipant] = useState(participants[0]);

  const { runCPS, isLoading, progress, result, error, reset } = useCPSAnalysis({
    conversation,
    quantitative,
    participantName: selectedParticipant,
  });

  // Calculate timespan in ms
  const timespanMs = conversation.metadata.dateRange.end
    ? conversation.metadata.dateRange.end - conversation.metadata.dateRange.start
    : Date.now() - conversation.metadata.dateRange.start;

  // Check requirements — detect which passes are actually completed
  const completedPasses: number[] = [];
  if (qualitative?.pass1) completedPasses.push(1);
  if (qualitative?.pass2) completedPasses.push(2);
  if (qualitative?.pass3) completedPasses.push(3);
  const requirementsCheck = meetsCPSRequirements(
    conversation.metadata.totalMessages,
    timespanMs,
    completedPasses,
  );

  // Use saved result only if it matches the selected participant
  const savedResult = qualitative?.cps;
  const savedMatchesSelected = savedResult?.participantName === selectedParticipant;
  const displayResult = result ?? (savedMatchesSelected ? savedResult : undefined);

  const handleRun = useCallback(async () => {
    await runCPS();
  }, [runCPS]);

  const handleParticipantChange = useCallback((name: string) => {
    setSelectedParticipant(name);
    reset();
  }, [reset]);

  // When we get a new result, save it
  useEffect(() => {
    if (result) {
      onCPSComplete(result);
    }
  }, [result, onCPSComplete]);

  return (
    <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
      <div className="space-y-4">
        {/* Participant selector for multi-person conversations */}
        {participants.length > 1 && !isLoading && (
          <div className="flex items-center gap-3 p-3 bg-card/50 rounded-lg border border-border">
            <span className="text-sm text-muted-foreground">Analizuj dla:</span>
            <div className="flex gap-2">
              {participants.map((name) => (
                <Button
                  key={name}
                  size="sm"
                  variant={selectedParticipant === name ? 'default' : 'outline'}
                  onClick={() => handleParticipantChange(name)}
                  className={
                    selectedParticipant === name
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      : 'border-border text-muted-foreground'
                  }
                >
                  {name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <CPSScreener
          cpsResult={displayResult}
          onRunCPS={handleRun}
          isLoading={isLoading}
          progress={progress}
          messageCount={conversation.metadata.totalMessages}
          timespanMs={timespanMs}
          completedPasses={completedPasses}
          canRun={requirementsCheck.meets}
          reasonsCannotRun={requirementsCheck.reasons}
        />

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
            <p className="text-sm font-medium text-red-400">Błąd analizy wzorców</p>
            <p className="text-xs text-red-300/80">{error}</p>
            <button
              onClick={reset}
              className="text-xs text-red-400 underline hover:text-red-300"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
