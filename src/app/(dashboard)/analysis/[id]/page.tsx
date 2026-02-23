'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

import { AlertCircle, ArrowLeft, Sparkles, ChevronRight, SkipForward } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { loadAnalysis, saveAnalysis, listAnalysesByFingerprint } from '@/lib/utils';
import { computeDelta } from '@/lib/analysis/delta';
import type { DeltaMetrics } from '@/lib/analysis/delta';
import { useSidebar } from '@/components/shared/SidebarContext';
import type { StoredAnalysis, QualitativeAnalysis, RoastResult, MegaRoastResult, CwelTygodniaResult } from '@/lib/analysis/types';
import type { CPSResult } from '@/lib/analysis/communication-patterns';
import type { SubtextResult } from '@/lib/analysis/subtext';
import type { DelusionQuizResult } from '@/lib/analysis/delusion-quiz';
import type { CourtResult } from '@/lib/analysis/court-prompts';
import type { DatingProfileResult } from '@/lib/analysis/dating-profile-prompts';
import { computeThreatMeters } from '@/lib/analysis/threat-meters';
import { computeDamageReport } from '@/lib/analysis/damage-report';
import { computeCognitiveFunctions } from '@/lib/analysis/cognitive-functions';
import { computeGottmanHorsemen } from '@/lib/analysis/gottman-horsemen';

import AnalysisHeader from '@/components/analysis/AnalysisHeader';
import ParticipantStrip from '@/components/analysis/ParticipantStrip';
import AnalysisTabs from '@/components/analysis/AnalysisTabs';
import { FloatingUpgradeNudge } from '@/components/shared/FloatingUpgradeNudge';

const DelusionQuiz = dynamic(() => import('@/components/analysis/DelusionQuiz'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-xl bg-card" />,
});

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
  const [showQuizGate, setShowQuizGate] = useState(true);
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

          // Longitudinal tracking
          if (stored.conversationFingerprint) {
            const siblings = await listAnalysesByFingerprint(stored.conversationFingerprint);
            const older = siblings.filter(s => s.id !== id && s.createdAt < stored.createdAt);
            if (older.length > 0) {
              const prev = older[0];
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
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, roast };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
      setTimeout(() => {
        document.getElementById('section-roast')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    },
    [analysis],
  );

  const handleCPSComplete = useCallback(
    (cps: CPSResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, cps };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

  const handleSubtextComplete = useCallback(
    (subtext: SubtextResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, subtext };
      const updated: StoredAnalysis = { ...analysis, qualitative: updatedQualitative };
      saveAnalysis(updated).catch(console.error);
      setAnalysis(updated);
    },
    [analysis],
  );

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

  const handleCwelComplete = useCallback(
    (cwelTygodnia: CwelTygodniaResult) => {
      if (!analysis) return;
      const existingQualitative = analysis.qualitative ?? { status: 'pending' as const };
      const updatedQualitative: QualitativeAnalysis = { ...existingQualitative, cwelTygodnia };
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

      {/* DISCLAIMER BANNER */}
      <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <p className="text-xs leading-relaxed text-amber-200/70">
          Ta analiza służy celom informacyjnym i rozrywkowym. <strong className="text-amber-200/90">NIE stanowi oceny klinicznej, psychologicznej ani profesjonalnej.</strong> Nie podejmuj decyzji dotyczących relacji na podstawie tych wyników bez konsultacji ze specjalistą.
        </p>
      </div>

      {/* HERO ZONE */}
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

      {/* TAB-BASED CONTENT */}
      <AnalysisTabs
        analysis={analysis}
        isServerView={isServerView}
        sortedParticipants={sortedParticipants}
        participants={participants}
        hasQualitative={hasQualitative}
        deltaMetrics={deltaMetrics}
        threatMeters={threatMeters}
        damageReport={damageReport}
        cognitiveFunctions={cognitiveFunctions}
        gottmanResult={gottmanResult}
        participantPhotos={participantPhotos}
        onAIComplete={handleAIComplete}
        onRoastComplete={handleRoastComplete}
        onCPSComplete={handleCPSComplete}
        onSubtextComplete={handleSubtextComplete}
        onCourtComplete={handleCourtComplete}
        onMegaRoastComplete={handleMegaRoastComplete}
        onCwelComplete={handleCwelComplete}
        onDatingProfileComplete={handleDatingProfileComplete}
        onPhotoUpload={handlePhotoUpload}
        onPhotoRemove={handlePhotoRemove}
        onImageSaved={handleImageSaved}
      />

      <FloatingUpgradeNudge />
    </div>
  );
}
