'use client';

import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useInView, AnimatePresence, motion } from 'framer-motion';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import ModePageShell from '@/components/shared/ModePageShell';
import { NoiseOverlay, EKGDivider, Scene, SceneManagerProvider, MobileEmbers } from '@/components/analysis/eks/shared';
import ParticleCanvas from '@/components/analysis/eks/ParticleCanvas';
import { SceneIndicator } from '@/components/analysis/eks/SceneIndicator';
import { AudioToggle } from '@/components/analysis/eks/AudioToggle';
import { useSceneManager } from '@/hooks/useSceneManager';
import { useSceneAudio } from '@/hooks/useSceneAudio';
import type { EksResult } from '@/lib/analysis/eks-prompts';
import type { EksQuizAnswer, EksQuizQuestion } from '@/components/analysis/EksButton';
import { compareQuizWithResult } from '@/components/analysis/EksButton';

// ── Per-scene particle mapping ──────────────────────────────

type ParticleVariant = 'embers' | 'ash' | 'dust';

const SCENE_PARTICLE_MAP: Record<string, { variant: ParticleVariant; intensity: number }> = {
  'eks-quiz-comparison': { variant: 'embers', intensity: 0.3 },
  'eks-intro': { variant: 'embers', intensity: 0.4 },
  'eks-death-line': { variant: 'ash', intensity: 0.3 },
  'eks-phases': { variant: 'embers', intensity: 0.4 },
  'eks-turning-point': { variant: 'embers', intensity: 0.2 },
  'eks-who-left': { variant: 'embers', intensity: 0.4 },
  'eks-last-words': { variant: 'embers', intensity: 0.2 },
  'eks-unsaid': { variant: 'dust', intensity: 0.35 },
  'eks-cause-of-death': { variant: 'embers', intensity: 0.4 },
  'eks-death-certificate': { variant: 'ash', intensity: 0.3 },
  'eks-loss-profiles': { variant: 'ash', intensity: 0.3 },
  'eks-pain-symmetry': { variant: 'embers', intensity: 0.2 },
  'eks-patterns': { variant: 'embers', intensity: 0.2 },
  'eks-therapist-letter': { variant: 'dust', intensity: 0.3 },
  'eks-letter-to-therapist': { variant: 'dust', intensity: 0.25 },
  'eks-golden-age': { variant: 'dust', intensity: 0.35 },
  'eks-forecast': { variant: 'embers', intensity: 0.4 },
  'eks-epitaph': { variant: 'dust', intensity: 0.3 },
};

const DEFAULT_PARTICLE = { variant: 'embers' as ParticleVariant, intensity: 0.4 };

// ── Dynamic scene imports (code-split) ──────────────────────
const IntroScene = dynamic(() => import('@/components/analysis/eks/scenes/IntroScene'), { ssr: false });
const DeathLineScene = dynamic(() => import('@/components/analysis/eks/scenes/DeathLineScene'), { ssr: false });
const PhasesScene = dynamic(() => import('@/components/analysis/eks/scenes/PhasesScene'), { ssr: false });
const TurningPointScene = dynamic(() => import('@/components/analysis/eks/scenes/TurningPointScene'), { ssr: false });
const WhoLeftScene = dynamic(() => import('@/components/analysis/eks/scenes/WhoLeftScene'), { ssr: false });
const LastWordsScene = dynamic(() => import('@/components/analysis/eks/scenes/LastWordsScene'), { ssr: false });
const UnsaidScene = dynamic(() => import('@/components/analysis/eks/scenes/UnsaidScene'), { ssr: false });
const AutopsyScene = dynamic(() => import('@/components/analysis/eks/scenes/AutopsyScene'), { ssr: false });
const DeathCertificateScene = dynamic(() => import('@/components/analysis/eks/scenes/DeathCertificateScene'), { ssr: false });
const LossProfileScene = dynamic(() => import('@/components/analysis/eks/scenes/LossProfileScene'), { ssr: false });
const PainSymmetryScene = dynamic(() => import('@/components/analysis/eks/scenes/PainSymmetryScene'), { ssr: false });
const PatternsScene = dynamic(() => import('@/components/analysis/eks/scenes/PatternsScene'), { ssr: false });
const TherapistLetterScene = dynamic(() => import('@/components/analysis/eks/scenes/TherapistLetterScene'), { ssr: false });
const LetterToTherapistScene = dynamic(() => import('@/components/analysis/eks/scenes/LetterToTherapistScene'), { ssr: false });
const GoldenAgeScene = dynamic(() => import('@/components/analysis/eks/scenes/GoldenAgeScene'), { ssr: false });
const ForecastScene = dynamic(() => import('@/components/analysis/eks/scenes/ForecastScene'), { ssr: false });
const EpitaphScene = dynamic(() => import('@/components/analysis/eks/scenes/EpitaphScene'), { ssr: false });

const QuizComparisonScene = dynamic(() => import('@/components/analysis/eks/scenes/QuizComparisonScene'), { ssr: false });

const EksEntryGate = dynamic(() => import('@/components/analysis/EksEntryGate'), { ssr: false });
const EksEmergencyExit = dynamic(() => import('@/components/analysis/EksEmergencyExit'), { ssr: false });
const ScrollVideo = dynamic(() => import('@/components/analysis/eks/ScrollVideo'), { ssr: false });

// ══════════════════════════════════════════════════════════════
// EKS V4 PAGE — ORCHESTRATOR
// ══════════════════════════════════════════════════════════════

export default function EksPage() {
  const {
    analysis,
    quantitative,
    qualitative,
    participants,
    onEksComplete,
  } = useAnalysis();

  const params = useParams();
  const analysisId = (params.id as string) || (analysis as { id?: string })?.id || '';

  // ── Scene manager ────────────────────────────────────────
  const {
    activeIndex,
    activeId,
    totalScenes,
    registerScene,
    scrollToScene,
    containerRef,
  } = useSceneManager();

  // ── Scene audio (ambient Web Audio per scene mood) ──
  const { isPlaying: audioPlaying, toggleAudio, masterVolume, setMasterVolume } = useSceneAudio({
    activeSceneId: activeId,
    enabled: true,
  });

  // ── Set data-mode on <html> for global eks theming ───────
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', 'eks');
    return () => document.documentElement.removeAttribute('data-mode');
  }, []);

  // ── State ──────────────────────────────────────────────────
  const [gateCleared, setGateCleared] = useState(false);
  const [localResult, setLocalResult] = useState<EksResult | null>(null);
  const [showEmergencyExit, setShowEmergencyExit] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [rerunRequested, setRerunRequested] = useState(false);
  const [now] = useState(() => Date.now());
  const [quizAnswers, setQuizAnswers] = useState<EksQuizAnswer[] | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<EksQuizQuestion[] | null>(null);

  // Scene 3 ref — triggers emergency exit visibility
  const scene3Ref = useRef<HTMLDivElement>(null);
  const scene3InView = useInView(scene3Ref, { once: true, amount: 0.1 });

  // Merge result from context or local
  const result: EksResult | null = localResult ?? (qualitative?.eksAnalysis as EksResult | undefined) ?? null;
  const hasResult = !!result;

  // Revisit data
  const stored = analysis as { eksAnalysisTimestamp?: number; eksResultPrevious?: EksResult; eksResultPreviousTimestamp?: number };
  const previousResult = stored.eksResultPrevious as EksResult | undefined;
  const previousTimestamp = stored.eksResultPreviousTimestamp;
  const currentTimestamp = stored.eksAnalysisTimestamp;
  const hasPreviousResult = !!previousResult && !!previousTimestamp;
  const isRevisit = hasResult && !rerunRequested;

  // Skip gate if result already exists
  const effectiveGateCleared = gateCleared || hasResult;

  // ── Death Line data ────────────────────────────────────────
  const deathLineData = useMemo(() => {
    const intimacyTrend = quantitative?.intimacyProgression?.trend || [];
    const sentimentTrend = quantitative?.trends?.sentimentTrend || [];
    const responseTimeTrend = quantitative?.trends?.responseTimeTrend || [];
    const rta = quantitative?.responseTimeAnalysis;

    // Build RTI-based response time map when available (smoother, overnight-filtered)
    const rtiMap = new Map<string, number>();
    if (rta) {
      const participants = Object.keys(rta.monthlyRti);
      const allMonths = new Set<string>();
      for (const name of participants) {
        for (const entry of rta.monthlyRti[name] ?? []) {
          allMonths.add(entry.month);
        }
      }
      for (const month of allMonths) {
        const rtiValues: number[] = [];
        for (const name of participants) {
          const entry = rta.monthlyRti[name]?.find(e => e.month === month);
          if (entry) rtiValues.push(entry.rti);
        }
        if (rtiValues.length > 0) {
          const avgRti = rtiValues.reduce((a, b) => a + b, 0) / rtiValues.length;
          rtiMap.set(month, avgRti);
        }
      }
    }

    const monthSet = new Set<string>();
    intimacyTrend.forEach((d) => monthSet.add(d.month));
    sentimentTrend.forEach((d) => monthSet.add(d.month));
    responseTimeTrend.forEach((d) => monthSet.add(d.month));
    for (const m of rtiMap.keys()) monthSet.add(m);

    const months = Array.from(monthSet).sort();
    if (months.length === 0) return [];

    const intimacyMap = new Map(intimacyTrend.map((d) => [d.month, d.score]));
    const sentimentMap = new Map<string, number>();
    for (const entry of sentimentTrend) {
      const values = Object.values(entry.perPerson);
      if (values.length > 0) sentimentMap.set(entry.month, values.reduce((a, b) => a + b, 0) / values.length);
    }

    // Fallback RT map (raw response time trend, used when RTI unavailable)
    const rawRtMap = new Map<string, number>();
    for (const entry of responseTimeTrend) {
      const values = Object.values(entry.perPerson);
      if (values.length > 0) rawRtMap.set(entry.month, values.reduce((a, b) => a + b, 0) / values.length);
    }
    const rawRtValues = Array.from(rawRtMap.values());
    const maxRawRt = Math.max(...rawRtValues, 1);

    const useRti = rtiMap.size > 0;

    return months.map((month) => {
      const intimacy = intimacyMap.get(month) ?? 50;
      const rawSentiment = sentimentMap.get(month) ?? 0;
      const sentiment = ((rawSentiment + 1) / 2) * 100;

      let responseTime: number;
      if (useRti) {
        // RTI-based: 0.5→75, 1.0→50, 2.0→0 | formula: max(0, min(100, (2 - rti) * 50))
        const rti = rtiMap.get(month) ?? 1.0;
        responseTime = Math.max(0, Math.min(100, (2 - rti) * 50));
      } else {
        // Fallback: raw RT (higher = worse)
        const rawRt = rawRtMap.get(month) ?? maxRawRt / 2;
        responseTime = Math.max(0, (1 - rawRt / maxRawRt) * 100);
      }

      const redZone = intimacy < 30 && sentiment < 30 && responseTime < 30 ? 30 : 0;
      return { month, intimacy: Math.round(intimacy), sentiment: Math.round(sentiment), responseTime: Math.round(responseTime), redZone };
    });
  }, [quantitative]);

  // ── Trigger emergency exit when scene 3 enters ─────────────
  if (scene3InView && !showEmergencyExit) {
    setShowEmergencyExit(true);
  }

  // ── Handle EksButton completion ────────────────────────────
  const handleComplete = useCallback((eksResult: EksResult) => {
    if (hasResult) setShowComparison(true);
    setLocalResult(eksResult);
    onEksComplete(eksResult);
    setRerunRequested(false);
  }, [hasResult, onEksComplete]);

  // ── Handle quiz completion ────────────────────────────────
  const handleQuizComplete = useCallback((answers: EksQuizAnswer[], questions: EksQuizQuestion[]) => {
    setQuizAnswers(answers);
    setQuizQuestions(questions);
  }, []);

  // ── Quiz vs AI comparisons ────────────────────────────────
  const quizComparisons = useMemo(() => {
    if (!quizAnswers || !quizQuestions || !result) return null;
    return compareQuizWithResult(quizAnswers, quizQuestions, result);
  }, [quizAnswers, quizQuestions, result]);

  // ── Per-scene particle config ──────────────────────────────
  const particleConfig = useMemo(
    () => (activeId ? SCENE_PARTICLE_MAP[activeId] ?? DEFAULT_PARTICLE : DEFAULT_PARTICLE),
    [activeId],
  );

  // ── Total messages for disclaimer ──────────────────────────
  const totalMessages = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);

  return (
    <ModePageShell mode="eks" title="Tryb Eks" video={{ src: '/videos/modes/eks.mp4' }}>
      {/* Gate — shown only if no result and gate not cleared */}
      {!effectiveGateCleared && (
        <EksEntryGate
          onProceed={() => setGateCleared(true)}
          onGoBack={() => { if (typeof window !== 'undefined') window.history.back(); }}
        />
      )}

      {/* Main content — only after gate is cleared */}
      {effectiveGateCleared && (
        <SceneManagerProvider registerScene={registerScene}>
        <div className="relative" ref={containerRef} style={{ scrollSnapType: 'y proximity' }}>
          {/* Scroll-linked video background — takes over from ModePageShell poster */}
          <ScrollVideo
            src="/videos/modes/eks.mp4"
            poster="/images/modes/eks-poster.webp"
            containerRef={containerRef}
          />

          {/* Global overlays */}
          <ParticleCanvas variant={particleConfig.variant} intensity={particleConfig.intensity} />
          <MobileEmbers />
          <NoiseOverlay />

          {/* Scene indicator dots */}
          {hasResult && (
            <SceneIndicator
              activeIndex={activeIndex}
              totalScenes={totalScenes}
              onNavigate={scrollToScene}
            />
          )}

          {/* Audio toggle — bottom right */}
          {hasResult && (
            <AudioToggle
              isPlaying={audioPlaying}
              onToggle={toggleAudio}
              masterVolume={masterVolume}
              onVolumeChange={setMasterVolume}
            />
          )}

          {/* Emergency exit — visible from scene 3 onward */}
          <AnimatePresence>
            {showEmergencyExit && hasResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                <EksEmergencyExit analysisId={analysisId} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══ REVISIT BANNER ═══ */}
          {isRevisit && currentTimestamp && (
            <Scene id="eks-revisit">
              <div className="max-w-xl mx-auto px-4 md:px-6 text-center">
                <p className="text-xs uppercase tracking-[0.15em] mb-3 font-mono" style={{ color: '#6b3a3a' }}>
                  Ostatnia analiza: {new Date(currentTimestamp).toLocaleDateString('pl-PL')}
                  {' '}({Math.round((now - currentTimestamp) / (1000 * 60 * 60 * 24))} dni temu)
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    onClick={() => setRerunRequested(true)}
                    className="rounded-lg px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors"
                    style={{ background: 'rgba(153,27,27,0.2)', border: '1px solid rgba(153,27,27,0.4)', color: '#dc2626' }}
                  >
                    Powtórz analizę
                  </button>
                  <button
                    onClick={() => document.getElementById('eks-intro')?.scrollIntoView({ behavior: 'smooth' })}
                    className="rounded-lg px-5 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors"
                    style={{ background: 'rgba(107,58,58,0.15)', border: '1px solid rgba(107,58,58,0.3)', color: '#6b3a3a' }}
                  >
                    Zobacz poprzedni wynik
                  </button>
                </div>
              </div>
            </Scene>
          )}

          {/* ═══ COMPARISON SCENE ═══ */}
          {showComparison && hasPreviousResult && result && previousResult && (
            <Scene id="eks-comparison">
              <div className="max-w-xl mx-auto px-4 md:px-6">
                <h3 className="font-[family-name:var(--font-syne)] text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: '#dc2626' }}>
                  Porównanie perspektyw
                </h3>
                <div className="flex justify-between items-center rounded-lg p-4 mb-6 font-mono text-xs" style={{ background: 'rgba(42,16,16,0.4)', border: '1px solid #2a1010' }}>
                  <div>
                    <p style={{ color: '#6b3a3a' }} className="uppercase tracking-wider mb-1">Pierwsza analiza</p>
                    <p style={{ color: '#d4a07a' }}>{previousTimestamp ? new Date(previousTimestamp).toLocaleDateString('pl-PL') : '—'}</p>
                  </div>
                  <div style={{ color: '#991b1b' }}>→</div>
                  <div className="text-right">
                    <p style={{ color: '#6b3a3a' }} className="uppercase tracking-wider mb-1">Dzisiejsza analiza</p>
                    <p style={{ color: '#d4a07a' }}>{currentTimestamp ? new Date(currentTimestamp).toLocaleDateString('pl-PL') : '—'}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: '#6b3a3a' }}>Epitafium: wtedy vs teraz</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg p-3 text-xs italic" style={{ background: 'rgba(42,16,16,0.3)', border: '1px solid #2a1010', color: '#8b7355', fontFamily: 'serif' }}>
                      &ldquo;{previousResult.epitaph}&rdquo;
                    </div>
                    <div className="rounded-lg p-3 text-xs italic" style={{ background: 'rgba(42,16,16,0.5)', border: '1px solid rgba(153,27,27,0.3)', color: '#d4a07a', fontFamily: 'serif' }}>
                      &ldquo;{result.epitaph}&rdquo;
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: '#6b3a3a' }}>Przyczyna śmierci</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg p-3 text-xs font-mono" style={{ background: 'rgba(42,16,16,0.3)', border: '1px solid #2a1010', color: '#8b7355' }}>
                      {previousResult.causeOfDeath?.primary ?? '—'}
                    </div>
                    <div className="rounded-lg p-3 text-xs font-mono" style={{ background: 'rgba(42,16,16,0.5)', border: '1px solid rgba(153,27,27,0.3)', color: '#d4a07a' }}>
                      {result.causeOfDeath?.primary ?? '—'}
                    </div>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: '#6b3a3a' }}>Prognoza powrotu</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="font-mono text-3xl font-black" style={{ color: '#8b7355' }}>{previousResult.postBreakupForecast?.willTheyComeBack ?? '?'}%</div>
                      <div className="text-[10px] font-mono" style={{ color: '#6b3a3a' }}>wtedy</div>
                    </div>
                    <div className="text-2xl" style={{ color: '#991b1b' }}>→</div>
                    <div className="text-center">
                      <div className="font-mono text-3xl font-black" style={{ color: '#dc2626' }}>{result.postBreakupForecast?.willTheyComeBack ?? '?'}%</div>
                      <div className="text-[10px] font-mono" style={{ color: '#6b3a3a' }}>teraz</div>
                    </div>
                  </div>
                </div>
              </div>
            </Scene>
          )}

          {/* ═══ SCENE 1: INTRO ═══ */}
          <IntroScene hasResult={hasResult} onComplete={handleComplete} onQuizComplete={handleQuizComplete} />

          {/* ═══ QUIZ COMPARISON (after intro, before scenes) ═══ */}
          {hasResult && result && quizComparisons && quizComparisons.length > 0 && (
            <QuizComparisonScene comparisons={quizComparisons} />
          )}

          {/* ═══ SCENES 2-14: ONLY WHEN RESULT EXISTS ═══ */}
          {hasResult && result && (
            <>
              {/* 2. Death Line */}
              <DeathLineScene
                deathLineData={deathLineData}
                emotionalTimeline={result.emotionalTimeline as Array<{ month: string; keyEvent?: string }> | undefined}
              />

              {/* 3. Phases */}
              <PhasesScene
                phases={Array.isArray(result.phases) ? result.phases : []}
                sceneRef={scene3Ref}
              />

              {/* 4. Turning Point */}
              <TurningPointScene turningPoint={result.turningPoint} />

              <EKGDivider />

              {/* 5. Who Left */}
              <WhoLeftScene whoLeftFirst={result.whoLeftFirst} />

              <EKGDivider />

              {/* 6. Last Words */}
              <LastWordsScene lastWords={result.lastWords} deathDate={result.deathDate} />

              <EKGDivider />

              {/* 7. Unsaid Things (Pass 3) */}
              {result.unsaidThings && (
                <UnsaidScene unsaidThings={result.unsaidThings} />
              )}

              <EKGDivider />

              {/* 8. Autopsy Report */}
              <AutopsyScene causeOfDeath={result.causeOfDeath} />

              <EKGDivider />

              {/* 9. Death Certificate (Pass 3) */}
              {result.deathCertificate && (
                <DeathCertificateScene deathCertificate={result.deathCertificate} />
              )}

              {/* 10. Loss Profiles */}
              <LossProfileScene lossProfiles={Array.isArray(result.lossProfiles) ? result.lossProfiles : []} />

              <EKGDivider />

              {/* 11. Pain Symmetry (V4 Pass 4) */}
              {result.painSymmetry && (
                <>
                  <PainSymmetryScene
                    painSymmetry={result.painSymmetry}
                    participants={participants}
                  />
                  <EKGDivider />
                </>
              )}

              {/* 12. Patterns (enhanced with V4 data if available) */}
              {result.repeatingPatterns && Object.keys(result.repeatingPatterns).length > 0 && (
                <PatternsScene
                  repeatingPatterns={result.repeatingPatterns}
                  expandedPatterns={result.expandedPatterns}
                />
              )}

              <EKGDivider />

              {/* 13. Letter TO Therapist — patient writes first */}
              {result.letterToTherapist && Object.keys(result.letterToTherapist.perPerson).length > 0 && (
                <>
                  <LetterToTherapistScene letterToTherapist={result.letterToTherapist} />
                  <EKGDivider />
                </>
              )}

              {/* 14. Therapist Letter — response to patient's letter */}
              {result.therapistLetter && (
                <>
                  <TherapistLetterScene therapistLetter={result.therapistLetter} />
                  <EKGDivider />
                </>
              )}

              {/* 15. Golden Age */}
              <GoldenAgeScene goldenAge={result.goldenAge} />

              {/* 15. Forecast */}
              <ForecastScene postBreakupForecast={result.postBreakupForecast} />

              {/* 16. Epitaph + Closing */}
              <EpitaphScene
                result={result}
                totalMessages={totalMessages}
                participants={participants}
                quantitative={quantitative}
                qualitative={qualitative as { pass4?: { health_score?: { overall?: number } } } | undefined}
                analysisId={analysisId}
              />
            </>
          )}
        </div>
        </SceneManagerProvider>
      )}
    </ModePageShell>
  );
}
