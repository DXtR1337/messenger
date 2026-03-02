'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { saveAnalysis } from '@/lib/utils';
import { computeThreatMeters } from './threat-meters';
import { computeDamageReport } from './damage-report';
import { computeCognitiveFunctions } from './cognitive-functions';
import { computeGottmanHorsemen } from './gottman-horsemen';

import type { StoredAnalysis, QualitativeAnalysis, RoastResult, MegaRoastResult, PrzegrywTygodniaResult, StandUpRoastResult, ArgumentSimulationResult } from './types';
import type { CPSResult } from './communication-patterns';
import type { SubtextResult } from './subtext';
import type { CourtResult } from './court-prompts';
import type { EksResult } from './eks-prompts';
import type { DatingProfileResult } from './dating-profile-prompts';
import type { DelusionQuizResult } from './delusion-quiz';
import type { MoralFoundationsResult } from './moral-foundations-prompts';
import type { EmotionCausesResult } from './emotion-causes-prompts';
import type { CapitalizationResult } from './capitalization-prompts';
import type { ParsedConversation, QuantitativeAnalysis, ThreatMetersResult, DamageReportResult } from '../parsers/types';
import type { CognitiveFunctionsResult } from './cognitive-functions';
import type { GottmanResult } from './gottman-horsemen';

// ── Operation tracking types ──────────────────────────────

export interface OperationInfo {
  label: string;
  progress: number;    // 0-100
  status: string;
  startedAt: number;
}

// ── Context value shape ────────────────────────────────────

export interface AnalysisContextValue {
  // Core data
  analysis: StoredAnalysis;
  quantitative: QuantitativeAnalysis;
  qualitative: QualitativeAnalysis | undefined;
  conversation: ParsedConversation;
  participants: string[];
  sortedParticipants: string[];
  participantPhotos: Record<string, string>;

  // Derived
  isServerView: boolean;
  hasQualitative: boolean;
  threatMeters: ThreatMetersResult | undefined;
  damageReport: DamageReportResult | undefined;
  cognitiveFunctions: CognitiveFunctionsResult | undefined;
  gottmanResult: GottmanResult | undefined;

  // Callbacks — merge qualitative data into analysis + persist
  mergeQualitative: (patch: Partial<QualitativeAnalysis>) => void;
  onAIComplete: (qualitative: QualitativeAnalysis) => void;
  onRoastComplete: (roast: RoastResult) => void;
  onEnhancedRoastComplete: (roast: RoastResult) => void;
  onCPSComplete: (cps: CPSResult) => void;
  onSubtextComplete: (subtext: SubtextResult) => void;
  onCourtComplete: (court: CourtResult) => void;
  onMegaRoastComplete: (megaRoast: MegaRoastResult) => void;
  onPrzegrywComplete: (przegryw: PrzegrywTygodniaResult) => void;
  onDatingProfileComplete: (profile: DatingProfileResult) => void;
  onDelusionComplete: (result: DelusionQuizResult) => void;
  onStandupComplete: (standupRoast: StandUpRoastResult) => void;
  onMoralFoundationsComplete: (moralFoundations: MoralFoundationsResult) => void;
  onEmotionCausesComplete: (emotionCauses: EmotionCausesResult) => void;
  onCapitalizationComplete: (capitalization: CapitalizationResult) => void;
  onArgumentSimulationComplete: (argumentSimulation: ArgumentSimulationResult) => void;
  onEksComplete: (eksAnalysis: EksResult) => void;
  onPhotoUpload: (name: string, base64: string) => void;
  onPhotoRemove: (name: string) => void;
  onImageSaved: (key: string, dataUrl: string) => void;

  // Global operation tracking — persists across page navigation
  runningOperations: Map<string, OperationInfo>;
  startOperation: (id: string, label: string, status?: string) => void;
  updateOperation: (id: string, patch: Partial<OperationInfo>) => void;
  stopOperation: (id: string) => void;
  /** @deprecated Use startOperation/stopOperation instead */
  setOperationRunning: (operation: string, running: boolean) => void;

  // Helpers
  setAnalysis: (updater: (prev: StoredAnalysis) => StoredAnalysis) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────

interface AnalysisProviderProps {
  initialAnalysis: StoredAnalysis;
  children: ReactNode;
}

// Migrate legacy single MegaRoastResult to per-target Record format
function migrateMegaRoast(a: StoredAnalysis): StoredAnalysis {
  const mr = a.qualitative?.megaRoast;
  if (mr && typeof (mr as unknown as MegaRoastResult).targetName === 'string') {
    const legacy = mr as unknown as MegaRoastResult;
    return {
      ...a,
      qualitative: {
        ...a.qualitative!,
        megaRoast: { [legacy.targetName]: legacy },
      },
    };
  }
  return a;
}

export function AnalysisProvider({ initialAnalysis, children }: AnalysisProviderProps) {
  const [analysis, setAnalysisState] = useState<StoredAnalysis>(() => migrateMegaRoast(initialAnalysis));
  const [participantPhotos, setParticipantPhotos] = useState<Record<string, string>>(
    initialAnalysis.participantPhotos ?? {},
  );

  const quantitative = analysis.quantitative;
  const qualitative = analysis.qualitative;
  const conversation = analysis.conversation;

  const participants = useMemo(
    () => conversation.participants.map((p) => p.name),
    [conversation.participants],
  );

  const isServerView = conversation.metadata.isGroup && participants.length > 4;

  const sortedParticipants = useMemo(
    () =>
      isServerView
        ? [...participants].sort(
            (a, b) =>
              (quantitative.perPerson[b]?.totalMessages ?? 0) -
              (quantitative.perPerson[a]?.totalMessages ?? 0),
          )
        : participants,
    [isServerView, participants, quantitative.perPerson],
  );

  const hasQualitative =
    !!qualitative?.pass1 &&
    (qualitative?.status === 'complete' || qualitative?.status === 'partial');

  // Derived computations — wrapped in try-catch to prevent data-shape crashes
  const threatMeters = useMemo(() => {
    try { return quantitative ? computeThreatMeters(quantitative) : undefined; }
    catch (e) { console.error('[AnalysisContext] threatMeters computation failed:', e); return undefined; }
  }, [quantitative]);

  const damageReport = useMemo(() => {
    try { return quantitative ? computeDamageReport(quantitative, qualitative?.pass4, qualitative?.pass2) : undefined; }
    catch (e) { console.error('[AnalysisContext] damageReport computation failed:', e); return undefined; }
  }, [quantitative, qualitative?.pass4, qualitative?.pass2]);

  const cognitiveFunctions = useMemo(() => {
    try {
      return qualitative?.pass3
        ? computeCognitiveFunctions(qualitative.pass3 as Record<string, { mbti?: { type: string } }>)
        : undefined;
    }
    catch (e) { console.error('[AnalysisContext] cognitiveFunctions computation failed:', e); return undefined; }
  }, [qualitative?.pass3]);

  const gottmanResult = useMemo(() => {
    try { return quantitative ? computeGottmanHorsemen(qualitative?.cps, quantitative) : undefined; }
    catch (e) { console.error('[AnalysisContext] gottmanResult computation failed:', e); return undefined; }
  }, [qualitative?.cps, quantitative]);

  // ── Callbacks ──────────────────────────────────────────

  const setAnalysis = useCallback(
    (updater: (prev: StoredAnalysis) => StoredAnalysis) => {
      setAnalysisState((prev) => {
        const updated = updater(prev);
        saveAnalysis(updated).catch((err) => {
          console.error('[saveAnalysis]', err);
          // The error will be a user-friendly message if it's QuotaExceededError
        });
        return updated;
      });
    },
    [],
  );

  const mergeQualitative = useCallback(
    (patch: Partial<QualitativeAnalysis>) => {
      setAnalysis((prev) => {
        const merged: QualitativeAnalysis = {
          ...(prev.qualitative ?? { status: 'pending' as const }),
          ...patch,
        };
        return { ...prev, qualitative: merged };
      });
    },
    [setAnalysis],
  );

  const onAIComplete = useCallback(
    (q: QualitativeAnalysis) => mergeQualitative(q),
    [mergeQualitative],
  );
  const onRoastComplete = useCallback(
    (roast: RoastResult) => mergeQualitative({ roast }),
    [mergeQualitative],
  );
  const onEnhancedRoastComplete = useCallback(
    (enhancedRoast: RoastResult) => mergeQualitative({ enhancedRoast }),
    [mergeQualitative],
  );
  const onCPSComplete = useCallback(
    (cps: CPSResult) => mergeQualitative({ cps }),
    [mergeQualitative],
  );
  const onSubtextComplete = useCallback(
    (subtext: SubtextResult) => mergeQualitative({ subtext }),
    [mergeQualitative],
  );
  const onCourtComplete = useCallback(
    (courtTrial: CourtResult) => mergeQualitative({ courtTrial }),
    [mergeQualitative],
  );
  const onMegaRoastComplete = useCallback(
    (result: MegaRoastResult) => {
      setAnalysis((prev) => {
        const existing = prev.qualitative?.megaRoast ?? {};
        const merged: QualitativeAnalysis = {
          ...(prev.qualitative ?? { status: 'pending' as const }),
          megaRoast: { ...existing, [result.targetName]: result },
        };
        return { ...prev, qualitative: merged };
      });
    },
    [setAnalysis],
  );
  const onPrzegrywComplete = useCallback(
    (przegrywTygodnia: PrzegrywTygodniaResult) => mergeQualitative({ przegrywTygodnia }),
    [mergeQualitative],
  );
  const onDatingProfileComplete = useCallback(
    (datingProfile: DatingProfileResult) => mergeQualitative({ datingProfile }),
    [mergeQualitative],
  );
  const onDelusionComplete = useCallback(
    (delusionQuiz: DelusionQuizResult) => mergeQualitative({ delusionQuiz }),
    [mergeQualitative],
  );
  const onStandupComplete = useCallback(
    (standupRoast: StandUpRoastResult) => mergeQualitative({ standupRoast }),
    [mergeQualitative],
  );
  const onMoralFoundationsComplete = useCallback(
    (moralFoundations: MoralFoundationsResult) => mergeQualitative({ moralFoundations }),
    [mergeQualitative],
  );
  const onEmotionCausesComplete = useCallback(
    (emotionCauses: EmotionCausesResult) => mergeQualitative({ emotionCauses }),
    [mergeQualitative],
  );
  const onCapitalizationComplete = useCallback(
    (capitalization: CapitalizationResult) => mergeQualitative({ capitalization }),
    [mergeQualitative],
  );
  const onArgumentSimulationComplete = useCallback(
    (argumentSimulation: ArgumentSimulationResult) => mergeQualitative({ argumentSimulation }),
    [mergeQualitative],
  );
  const onEksComplete = useCallback(
    (eksAnalysis: EksResult) => {
      // Archive previous result before overwriting
      setAnalysis((prev) => {
        const updates: Record<string, unknown> = { eksAnalysisTimestamp: Date.now() };
        if (prev.qualitative?.eksAnalysis && prev.eksAnalysisTimestamp) {
          updates.eksResultPrevious = prev.qualitative.eksAnalysis;
          updates.eksResultPreviousTimestamp = prev.eksAnalysisTimestamp;
        }
        return { ...prev, ...updates };
      });
      mergeQualitative({ eksAnalysis });
    },
    [mergeQualitative, setAnalysis],
  );

  const onPhotoUpload = useCallback(
    (name: string, base64: string) => {
      setParticipantPhotos((prev) => ({ ...prev, [name]: base64 }));
      setAnalysis((prev) => {
        const photos = { ...(prev.participantPhotos ?? {}), [name]: base64 };
        return { ...prev, participantPhotos: photos };
      });
    },
    [setAnalysis],
  );

  const onPhotoRemove = useCallback(
    (name: string) => {
      setParticipantPhotos((prev) => {
        const { [name]: _removed, ...rest } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
        return rest;
      });
      setAnalysis((prev) => {
        const { [name]: _removed, ...rest } = prev.participantPhotos ?? {}; // eslint-disable-line @typescript-eslint/no-unused-vars
        return { ...prev, participantPhotos: rest };
      });
    },
    [setAnalysis],
  );

  // ── Global operation tracking ────────────────────────────
  const [runningOps, setRunningOps] = useState<Map<string, OperationInfo>>(new Map());

  const startOperation = useCallback((id: string, label: string, status = 'Uruchamianie...') => {
    setRunningOps(prev => {
      const next = new Map(prev);
      next.set(id, { label, progress: 0, status, startedAt: Date.now() });
      return next;
    });
  }, []);

  const updateOperation = useCallback((id: string, patch: Partial<OperationInfo>) => {
    setRunningOps(prev => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, ...patch });
      return next;
    });
  }, []);

  const stopOperation = useCallback((id: string) => {
    setRunningOps(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Backward-compatible wrapper
  const setOperationRunning = useCallback((op: string, running: boolean) => {
    if (running) startOperation(op, op);
    else stopOperation(op);
  }, [startOperation, stopOperation]);

  const onImageSaved = useCallback(
    (key: string, dataUrl: string) => {
      setAnalysis((prev) => {
        const images = { ...(prev.generatedImages ?? {}), [key]: dataUrl };
        return { ...prev, generatedImages: images };
      });
    },
    [setAnalysis],
  );

  // ── Memoized context value ─────────────────────────────

  const value = useMemo<AnalysisContextValue>(
    () => ({
      analysis,
      quantitative,
      qualitative,
      conversation,
      participants,
      sortedParticipants,
      participantPhotos,
      isServerView,
      hasQualitative,
      threatMeters,
      damageReport,
      cognitiveFunctions,
      gottmanResult,
      mergeQualitative,
      onAIComplete,
      onRoastComplete,
      onEnhancedRoastComplete,
      onCPSComplete,
      onSubtextComplete,
      onCourtComplete,
      onMegaRoastComplete,
      onPrzegrywComplete,
      onDatingProfileComplete,
      onDelusionComplete,
      onStandupComplete,
      onMoralFoundationsComplete,
      onEmotionCausesComplete,
      onCapitalizationComplete,
      onArgumentSimulationComplete,
      onEksComplete,
      onPhotoUpload,
      onPhotoRemove,
      onImageSaved,
      runningOperations: runningOps,
      startOperation,
      updateOperation,
      stopOperation,
      setOperationRunning,
      setAnalysis,
    }),
    [
      analysis,
      quantitative,
      qualitative,
      conversation,
      participants,
      sortedParticipants,
      participantPhotos,
      isServerView,
      hasQualitative,
      threatMeters,
      damageReport,
      cognitiveFunctions,
      gottmanResult,
      mergeQualitative,
      onAIComplete,
      onRoastComplete,
      onEnhancedRoastComplete,
      onCPSComplete,
      onSubtextComplete,
      onCourtComplete,
      onMegaRoastComplete,
      onPrzegrywComplete,
      onDatingProfileComplete,
      onDelusionComplete,
      onStandupComplete,
      onMoralFoundationsComplete,
      onEmotionCausesComplete,
      onCapitalizationComplete,
      onArgumentSimulationComplete,
      onEksComplete,
      onPhotoUpload,
      onPhotoRemove,
      onImageSaved,
      runningOps,
      startOperation,
      updateOperation,
      stopOperation,
      setOperationRunning,
      setAnalysis,
    ],
  );

  // Set data-eks-mode on documentElement when relationship context is 'eks'
  // so the crimson branding cascades to Navigation and all child components
  const isEks = analysis.relationshipContext === 'eks';
  useEffect(() => {
    if (isEks) {
      document.documentElement.setAttribute('data-eks-mode', 'true');
    }
    return () => {
      document.documentElement.removeAttribute('data-eks-mode');
    };
  }, [isEks]);

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error('useAnalysis must be used within an <AnalysisProvider>');
  }
  return ctx;
}
