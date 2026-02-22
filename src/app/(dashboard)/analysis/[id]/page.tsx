'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const ShareCardGallery = dynamic(() => import('@/components/share-cards/ShareCardGallery'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-card" />,
});
const ParticipantPicker = dynamic(() => import('@/components/analysis/ParticipantPicker'), {
  ssr: false,
});

const RoastSection = dynamic(() => import('@/components/analysis/RoastSection'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});

const CPSScreener = dynamic(() => import('@/components/analysis/CPSScreener'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const SubtextDecoder = dynamic(() => import('@/components/analysis/SubtextDecoder'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
import { AlertCircle, ArrowLeft, Sparkles, ChevronRight, SkipForward, Flame } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { loadAnalysis, saveAnalysis, listAnalysesByFingerprint } from '@/lib/utils';
import { computeDelta } from '@/lib/analysis/delta';
import type { DeltaMetrics } from '@/lib/analysis/delta';
import { useSidebar } from '@/components/shared/SidebarContext';
import type { StoredAnalysis, QualitativeAnalysis, RoastResult, MegaRoastResult } from '@/lib/analysis/types';
import type { CPSResult } from '@/lib/analysis/communication-patterns';
import { meetsCPSRequirements } from '@/lib/analysis/communication-patterns';
import { useCPSAnalysis } from '@/hooks/useCPSAnalysis';
import type { SubtextResult } from '@/lib/analysis/subtext';
import { useSubtextAnalysis } from '@/hooks/useSubtextAnalysis';
import type { DelusionQuizResult } from '@/lib/analysis/delusion-quiz';
import type { CourtResult } from '@/lib/analysis/court-prompts';
import type { DatingProfileResult } from '@/lib/analysis/dating-profile-prompts';
import { computeThreatMeters } from '@/lib/analysis/threat-meters';
import { computeDamageReport } from '@/lib/analysis/damage-report';
import { computeCognitiveFunctions } from '@/lib/analysis/cognitive-functions';
import { computeGottmanHorsemen } from '@/lib/analysis/gottman-horsemen';


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


const ExportPDFButton = dynamic(() => import('@/components/analysis/ExportPDFButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const StandUpPDFButton = dynamic(() => import('@/components/analysis/StandUpPDFButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const EnhancedRoastButton = dynamic(() => import('@/components/analysis/EnhancedRoastButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const NetworkGraph = dynamic(() => import('@/components/analysis/NetworkGraph'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const GhostForecast = dynamic(() => import('@/components/analysis/GhostForecast'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const DelusionQuiz = dynamic(() => import('@/components/analysis/DelusionQuiz'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const ChatCourtButton = dynamic(() => import('@/components/analysis/ChatCourtButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const CourtVerdict = dynamic(() => import('@/components/analysis/CourtVerdict'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const DatingProfileButton = dynamic(() => import('@/components/analysis/DatingProfileButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const DatingProfileResult = dynamic(() => import('@/components/analysis/DatingProfileResult'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const ReplySimulator = dynamic(() => import('@/components/analysis/ReplySimulator'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const SentimentChart = dynamic(() => import('@/components/analysis/SentimentChart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const ConflictTimeline = dynamic(() => import('@/components/analysis/ConflictTimeline'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const IntimacyChart = dynamic(() => import('@/components/analysis/IntimacyChart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const GroupChatAwards = dynamic(() => import('@/components/analysis/GroupChatAwards'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const TeamRoles = dynamic(() => import('@/components/analysis/TeamRoles'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const CommunityMap = dynamic(() => import('@/components/analysis/CommunityMap'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const LongitudinalDelta = dynamic(() => import('@/components/analysis/LongitudinalDelta'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const ResponseTimeHistogram = dynamic(() => import('@/components/analysis/ResponseTimeHistogram'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const HourlyActivityChart = dynamic(() => import('@/components/analysis/HourlyActivityChart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const YearMilestonesCard = dynamic(() => import('@/components/analysis/YearMilestones'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const ThreatMeters = dynamic(() => import('@/components/analysis/ThreatMeters'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const DamageReport = dynamic(() => import('@/components/analysis/DamageReport'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const CognitiveFunctionsClash = dynamic(() => import('@/components/analysis/CognitiveFunctionsClash'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const PursuitWithdrawalCard = dynamic(() => import('@/components/analysis/PursuitWithdrawalCard'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const RankingBadges = dynamic(() => import('@/components/analysis/RankingBadges'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const AIPredictions = dynamic(() => import('@/components/analysis/AIPredictions'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const GottmanHorsemen = dynamic(() => import('@/components/analysis/GottmanHorsemen'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
const MegaRoastButton = dynamic(() => import('@/components/analysis/MegaRoastButton'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-xl bg-card" />,
});
const MegaRoastSection = dynamic(() => import('@/components/analysis/MegaRoastSection'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});
import ParticipantPhotoUpload from '@/components/analysis/ParticipantPhotoUpload';
import ShareCaptionModal from '@/components/analysis/ShareCaptionModal';
import SectionNavigator from '@/components/analysis/SectionNavigator';
import PersonNavigator from '@/components/analysis/PersonNavigator';
import PersonProfile from '@/components/analysis/PersonProfile';
import ServerLeaderboard from '@/components/analysis/ServerLeaderboard';
import PairwiseComparison from '@/components/analysis/PairwiseComparison';
import ServerOverview from '@/components/analysis/ServerOverview';

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
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
const dur = 0.4;
const vp = { once: true, margin: '-80px' as const };

export default function AnalysisResultsPage() {
  const params = useParams();
  const id = params.id as string;
  const { setBreadcrumb } = useSidebar();

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [showQuizGate, setShowQuizGate] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<[string, string] | null>(null);
  const [megaRoastTarget, setMegaRoastTarget] = useState<string | null>(null);
  const [deltaMetrics, setDeltaMetrics] = useState<DeltaMetrics | null>(null);
  const [participantPhotos, setParticipantPhotos] = useState<Record<string, string>>({});

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
          setParticipantPhotos(stored.participantPhotos ?? {});
          setBreadcrumb(['Analiza', stored.title]);
          const celebrateKey = `podtekst-celebrate-${id}`;
          if (sessionStorage.getItem(celebrateKey)) {
            sessionStorage.removeItem(celebrateKey);
            setShowConfetti(true);
          }

          // Longitudinal tracking — load previous analysis with same fingerprint
          if (stored.conversationFingerprint) {
            const siblings = await listAnalysesByFingerprint(stored.conversationFingerprint);
            const older = siblings.filter(s => s.id !== id && s.createdAt < stored.createdAt);
            if (older.length > 0) {
              const prev = older[0]; // most recent older sibling
              const prevFull = await loadAnalysis(prev.id);
              if (prevFull) {
                const delta = computeDelta(
                  { quantitative: stored.quantitative, conversation: stored.conversation, createdAt: stored.createdAt },
                  { quantitative: prevFull.quantitative, conversation: prevFull.conversation, id: prev.id, createdAt: prevFull.createdAt },
                );
                setDeltaMetrics(delta);
              }
            }
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

  const handleSubtextComplete = useCallback(
    (subtext: SubtextResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? {
        status: 'pending' as const,
      };
      const updatedQualitative: QualitativeAnalysis = {
        ...existingQualitative,
        subtext,
      };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  // Faza 20 — Viral Features handlers
  const handleDelusionComplete = useCallback(
    (delusionQuiz: DelusionQuizResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, delusionQuiz };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  const handleCourtComplete = useCallback(
    (courtTrial: CourtResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, courtTrial };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  const handleMegaRoastComplete = useCallback(
    (megaRoast: MegaRoastResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, megaRoast };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  const handleDatingProfileComplete = useCallback(
    (datingProfile: DatingProfileResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, datingProfile };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  const handlePhotoUpload = useCallback(
    (name: string, base64: string) => {
      if (!analysis) return;
      const updated = { ...participantPhotos, [name]: base64 };
      setParticipantPhotos(updated);
      const updatedAnalysis: StoredAnalysis = { ...analysis, participantPhotos: updated };
      setAnalysis(updatedAnalysis);
      saveAnalysis(updatedAnalysis).catch(console.error);
    },
    [analysis, participantPhotos],
  );

  const handlePhotoRemove = useCallback(
    (name: string) => {
      if (!analysis) return;
      const { [name]: _, ...rest } = participantPhotos;
      setParticipantPhotos(rest);
      const updatedAnalysis: StoredAnalysis = { ...analysis, participantPhotos: rest };
      setAnalysis(updatedAnalysis);
      saveAnalysis(updatedAnalysis).catch(console.error);
    },
    [analysis, participantPhotos],
  );

  const handleImageSaved = useCallback(
    (key: string, dataUrl: string) => {
      if (!analysis) return;
      const prev = analysis.generatedImages ?? {};
      const updatedImages = { ...prev, [key]: dataUrl };
      const updatedAnalysis: StoredAnalysis = { ...analysis, generatedImages: updatedImages };
      setAnalysis(updatedAnalysis);
      saveAnalysis(updatedAnalysis).catch(console.error);
    },
    [analysis],
  );

  // Derived data — must be above early returns to respect Rules of Hooks
  const quantitative = analysis?.quantitative;
  const qualitative = analysis?.qualitative;
  const conversation = analysis?.conversation;

  const threatMeters = useMemo(
    () => quantitative ? computeThreatMeters(quantitative) : undefined,
    [quantitative],
  );
  const damageReport = useMemo(
    () => quantitative ? computeDamageReport(quantitative, qualitative?.pass4, qualitative?.pass2) : undefined,
    [quantitative, qualitative?.pass4, qualitative?.pass2],
  );
  const cognitiveFunctions = useMemo(
    () => qualitative?.pass3 ? computeCognitiveFunctions(qualitative.pass3 as Record<string, { mbti?: { type: string } }>) : undefined,
    [qualitative?.pass3],
  );
  const gottmanResult = useMemo(
    () => quantitative ? computeGottmanHorsemen(qualitative?.cps, quantitative) : undefined,
    [qualitative?.cps, quantitative],
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

  if (error || !analysis || !conversation || !quantitative) {
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

  const participants = conversation.participants.map((p) => p.name);
  const hasQualitative = !!qualitative?.pass1 && (qualitative?.status === 'complete' || qualitative?.status === 'partial');
  const isServerView = conversation.metadata.isGroup && participants.length > 4;

  // Sorted participants for server view (by message count desc)
  const sortedParticipants = isServerView
    ? [...participants].sort((a, b) => (quantitative.perPerson[b]?.totalMessages ?? 0) - (quantitative.perPerson[a]?.totalMessages ?? 0))
    : participants;

  // Selected person index for color consistency
  const selectedPersonIndex = selectedPerson ? sortedParticipants.indexOf(selectedPerson) : -1;

  // Quiz gate: show for 2-person non-group chats that haven't completed the quiz
  const canShowQuizGate = !conversation.metadata.isGroup
    && participants.length === 2
    && !qualitative?.delusionQuiz
    && showQuizGate;

  if (canShowQuizGate) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <DelusionQuiz
            quantitative={quantitative}
            conversation={conversation}
            onComplete={(result) => {
              handleDelusionComplete(result);
              setShowQuizGate(false);
            }}
          />
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            onClick={() => setShowQuizGate(false)}
            className="mx-auto mt-6 flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-text-muted transition-colors hover:border-border-hover hover:text-foreground"
          >
            <SkipForward className="size-3.5" />
            Pomiń i pokaż wyniki
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <SectionNavigator isServerView={isServerView} />

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

        {!isServerView && (
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ParticipantStrip
              participants={participants}
              perPerson={quantitative.perPerson}
              totalMessages={conversation.metadata.totalMessages}
            />
          </motion.div>
        )}

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

      {/* ═══════ SERVER VIEW: OVERVIEW ═══════ */}
      {isServerView && (
        <>
          <SectionDivider number="00" title="Przegląd serwera" subtitle={`${participants.length} uczestników`} id="section-server" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ServerOverview quantitative={quantitative} conversation={conversation} participants={participants} />
          </motion.div>
        </>
      )}

      {/* ═══════ SERVER VIEW: DYNAMIKA ZESPOŁU ═══════ */}
      {isServerView && quantitative.teamAnalysis && (
        <>
          <SectionDivider number="00.5" title="Dynamika zespołu" subtitle="Role i podgrupy w grupie" id="section-team" />
          <div className="space-y-4">
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <TeamRoles teamAnalysis={quantitative.teamAnalysis} participants={participants} />
            </motion.div>
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <CommunityMap communities={quantitative.teamAnalysis.communities} participants={participants} />
            </motion.div>
          </div>
        </>
      )}

      {/* ═══════ SECTION: KLUCZOWE METRYKI ═══════ */}
      <SectionDivider number="01" title="Kluczowe metryki" id="section-metrics" />
      <div className="space-y-4">
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <KPICards quantitative={quantitative} conversation={conversation} />
        </motion.div>
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <StatsGrid quantitative={quantitative} participants={participants} platform={conversation.platform} />
        </motion.div>
      </div>

      {/* ═══════ LONGITUDINAL DELTA ═══════ */}
      {deltaMetrics && (
        <motion.div className="mt-10" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <LongitudinalDelta delta={deltaMetrics} />
        </motion.div>
      )}

      {/* ═══════ SERVER VIEW: UCZESTNICY ═══════ */}
      {isServerView && (
        <>
          <SectionDivider number="01.5" title="Uczestnicy" subtitle="Kliknij osobę, aby zobaczyć jej profil" id="section-participants" />
          <motion.div
            className="grid gap-4 grid-cols-1 lg:grid-cols-[300px_1fr]"
            variants={sv}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            transition={{ duration: dur }}
          >
            <PersonNavigator
              participants={participants}
              perPerson={quantitative.perPerson}
              totalMessages={conversation.metadata.totalMessages}
              selectedPerson={selectedPerson}
              onSelectPerson={setSelectedPerson}
              quantitative={quantitative}
            />
            {selectedPerson ? (
              <PersonProfile
                name={selectedPerson}
                index={selectedPersonIndex >= 0 ? selectedPersonIndex : 0}
                quantitative={quantitative}
                conversation={conversation}
              />
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-border border-dashed bg-card/50 p-12 text-center">
                <div>
                  <div className="text-3xl mb-2">{'\u{1F464}'}</div>
                  <p className="text-sm text-text-muted">Wybierz osobę z listy,<br />aby zobaczyć szczegółowy profil</p>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

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
        {/* Response Time Histogram + Hourly Activity */}
        {quantitative.responseTimeDistribution && (
          <motion.div
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

      {/* ═══════ SERVER VIEW: RANKING + PORÓWNANIE ═══════ */}
      {isServerView && (
        <>
          <SectionDivider number="03.5" title="Ranking i porównania" subtitle="Kto dominuje, kto kisi się w cieniu" id="section-ranking" />
          <motion.div
            className="grid gap-4 grid-cols-1 lg:grid-cols-2"
            variants={sv}
            initial="hidden"
            whileInView="visible"
            viewport={vp}
            transition={{ duration: dur }}
          >
            <ServerLeaderboard
              participants={participants}
              quantitative={quantitative}
              platform={conversation.platform}
              onSelectPerson={(name) => {
                setSelectedPerson(name);
                document.getElementById('section-participants')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <PairwiseComparison
              participants={participants}
              quantitative={quantitative}
            />
          </motion.div>
        </>
      )}

      {/* ═══════ SECTION: VIRAL SCORES ═══════ */}
      {quantitative.viralScores && !isServerView && (
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

      {/* ═══════ SECTION: GHOST FORECAST (2-person only) ═══════ */}
      {quantitative.viralScores?.ghostRisk && !isServerView && (
        <>
          <SectionDivider title="Prognoza Ghostingu" subtitle="Prawdopodobieństwo że rozmowa ucichnie. Na zawsze." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <GhostForecast viralScores={quantitative.viralScores} participants={participants} />
          </motion.div>
        </>
      )}

      {/* ═══════ SECTION: THREAT METERS ═══════ */}
      {threatMeters && threatMeters.meters.length > 0 && !isServerView && (
        <>
          <SectionDivider title="Wskaźniki zagrożeń" subtitle="Ukryte wzorce, które warto monitorować" />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ThreatMeters meters={threatMeters} />
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

      {/* ═══════ SECTION: RANKING PERCENTILES ═══════ */}
      {quantitative.rankingPercentiles && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <RankingBadges rankings={quantitative.rankingPercentiles} />
        </motion.div>
      )}

      {/* ═══════ SECTION: STAWIAM ZAKŁAD (results only — quiz is now a gate screen) ═══════ */}
      {!conversation.metadata.isGroup && participants.length === 2 && qualitative?.delusionQuiz && (
        <>
          <SectionDivider title="Stawiam Zakład" subtitle="Twój wynik z quizu samoświadomości." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-2 font-mono text-xs uppercase tracking-widest text-text-muted">Twój wynik</div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-4xl font-bold text-foreground">{qualitative.delusionQuiz.score}/15</span>
                <span className="font-mono text-lg text-purple-400">{qualitative.delusionQuiz.label}</span>
              </div>
              <div className="mt-1 text-sm text-text-muted">Delusion Index: {qualitative.delusionQuiz.delusionIndex}/100</div>
              <Link href={`/analysis/${id}/couple`}>
                <Button variant="outline" className="mt-4 gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                  <Sparkles className="size-4" />
                  Wyzwij drugą osobę
                  <ChevronRight className="size-4" />
                </Button>
              </Link>
            </div>
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
        <ParticipantPhotoUpload
          participants={participants}
          photos={participantPhotos}
          onUpload={handlePhotoUpload}
          onRemove={handlePhotoRemove}
        />
      </motion.div>
      <motion.div className="mt-6" variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
        <div className="mb-4 flex items-center gap-3">
          <ExportPDFButton analysis={{...analysis, participantPhotos}} />
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
        analysis={analysis}
      />
      {isServerView && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <ParticipantPicker
            participants={sortedParticipants}
            quantitative={quantitative}
            onPairSelected={setSelectedPair}
          />
        </motion.div>
      )}

      {/* Mega Roast — single-target roast (server view) */}
      {isServerView && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mega Roast — wybierz ofiarę
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={megaRoastTarget ?? ''}
                onChange={(e) => setMegaRoastTarget(e.target.value || null)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none transition-colors hover:border-border-hover focus:border-orange-500"
              >
                <option value="">Wybierz osobę...</option>
                {sortedParticipants.map((name) => (
                  <option key={name} value={name}>
                    {name} ({quantitative.perPerson[name]?.totalMessages ?? 0} msg)
                  </option>
                ))}
              </select>
              {megaRoastTarget && !analysis.qualitative?.megaRoast && (
                <MegaRoastButton
                  analysis={analysis}
                  targetPerson={megaRoastTarget}
                  onComplete={handleMegaRoastComplete}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Mega Roast Results */}
      {analysis.qualitative?.megaRoast && (
        <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
          <MegaRoastSection result={analysis.qualitative.megaRoast} />
        </motion.div>
      )}
      <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
        <ShareCardGallery analysis={analysis} selectedPair={selectedPair} />
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
            savedRoastImage={analysis.generatedImages?.['roast']}
            onRoastImageSaved={(dataUrl) => handleImageSaved('roast', dataUrl)}
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
                savedImage={analysis.generatedImages?.['comic']}
                onImageSaved={(dataUrl) => handleImageSaved('comic', dataUrl)}
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

          {/* Enhanced Roast — available after full AI analysis */}
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <EnhancedRoastButton analysis={analysis} onComplete={handleRoastComplete} />
          </motion.div>

          {/* Damage Report */}
          {!isServerView && damageReport && (
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <DamageReport report={damageReport} />
            </motion.div>
          )}

          {/* Communication Pattern Screener */}
          {hasQualitative && (
            <>
              <SectionDivider title="Wzorce komunikacyjne" subtitle="Jak rozmawiacie — styl, tempo, nawyki" />
              <CPSScreenerSection
                analysis={analysis}
                onCPSComplete={handleCPSComplete}
              />
              <p className="text-[11px] italic text-muted-foreground/50 px-1 mt-2">
                CPS to narzędzie orientacyjne oparte na analizie wzorców tekstu. Nie zastępuje konsultacji ze specjalistą i nie stanowi diagnozy klinicznej.
              </p>
            </>
          )}

          {/* Gottman Four Horsemen — derived from CPS */}
          {gottmanResult && !isServerView && (
            <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
              <GottmanHorsemen result={gottmanResult} />
            </motion.div>
          )}

          {/* Subtext Decoder */}
          {hasQualitative && (
            <>
              <SectionDivider title="Translator podtekstów" subtitle="Co naprawdę mieli na myśli?" />
              <SubtextSection
                analysis={analysis}
                onSubtextComplete={handleSubtextComplete}
              />
            </>
          )}

          {/* ═══════ FAZA 20: VIRAL FEATURES (AI-powered) ═══════ */}

          {/* Twój Chat w Sądzie */}
          <SectionDivider title="Twój Chat w Sądzie" subtitle="Każda rozmowa ma swoje ofiary. I sprawców." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            {qualitative?.courtTrial ? (
              <CourtVerdict result={qualitative.courtTrial} />
            ) : (
              <ChatCourtButton
                analysis={analysis}
                onComplete={handleCourtComplete}
              />
            )}
          </motion.div>

          {/* Szczery Profil Randkowy */}
          <SectionDivider title="Szczery Profil Randkowy" subtitle="Tinder na podstawie tego jak naprawdę piszesz. Bez filtrów." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            {qualitative?.datingProfile ? (
              <DatingProfileResult result={qualitative.datingProfile} participants={participants} />
            ) : (
              <DatingProfileButton
                analysis={analysis}
                onComplete={handleDatingProfileComplete}
              />
            )}
          </motion.div>

          {/* Symulator Odpowiedzi */}
          <SectionDivider title="Symulator Odpowiedzi" subtitle="Napisz wiadomość. AI odpowie tak jak ta osoba." />
          <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
            <ReplySimulator
              conversation={conversation}
              quantitative={quantitative}
              qualitative={qualitative}
              participants={participants}
            />
          </motion.div>

          {/* AI Predictions — at the end of AI section */}
          {qualitative?.pass4?.predictions && qualitative.pass4.predictions.length > 0 && (
            <>
              <SectionDivider title="Prognozy AI" subtitle="Co mówią trendy o przyszłości tej relacji" />
              <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
                <AIPredictions predictions={qualitative.pass4.predictions} />
              </motion.div>
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

// ═══════════════════════════════════════════════════════════
// Subtext Decoder Section Component
// ═══════════════════════════════════════════════════════════

interface SubtextSectionProps {
  analysis: StoredAnalysis;
  onSubtextComplete: (subtext: SubtextResult) => void;
}

function SubtextSection({ analysis, onSubtextComplete }: SubtextSectionProps) {
  const { conversation, quantitative, qualitative } = analysis;

  const { runSubtext, isLoading, progress, result, error, reset } = useSubtextAnalysis({
    conversation,
    quantitative,
    qualitative,
  });

  // Use saved result if available
  const savedResult = qualitative?.subtext;
  const displayResult = result ?? savedResult;

  const handleRun = useCallback(async () => {
    await runSubtext();
  }, [runSubtext]);

  // When we get a new result, save it
  useEffect(() => {
    if (result) {
      onSubtextComplete(result);
    }
  }, [result, onSubtextComplete]);

  return (
    <motion.div variants={sv} initial="hidden" whileInView="visible" viewport={vp} transition={{ duration: dur }}>
      <SubtextDecoder
        subtextResult={displayResult}
        onRunSubtext={handleRun}
        isLoading={isLoading}
        progress={progress}
        canRun={conversation.metadata.totalMessages >= 100}
        error={error}
      />
      {error && !isLoading && (
        <div className="mt-2 text-center">
          <button
            onClick={reset}
            className="text-xs text-purple-400 underline hover:text-purple-300"
          >
            Resetuj i spróbuj ponownie
          </button>
        </div>
      )}
    </motion.div>
  );
}
