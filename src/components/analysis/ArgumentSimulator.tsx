'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Loader2,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Zap,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

import { useAnalysis } from '@/lib/analysis/analysis-context';
import { useArgumentSimulation } from '@/hooks/useArgumentSimulation';
import { ARGUMENT_PERSON_COLORS } from '@/lib/analysis/constants';
import AnalysisCard from '@/components/shared/AnalysisCard';

import type {
  ArgumentTopic,
  ArgumentSimulationMessage,
  ArgumentSimulationResult,
} from '@/lib/analysis/types';

function getPersonColor(participants: string[], name: string): string {
  const idx = participants.indexOf(name);
  return ARGUMENT_PERSON_COLORS[idx >= 0 ? idx % ARGUMENT_PERSON_COLORS.length : 0];
}

// ── Phase color map ────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  trigger: '#f59e0b',
  escalation: '#ef4444',
  peak: '#dc2626',
  deescalation: '#10b981',
  aftermath: '#6b7280',
};

const PHASE_LABELS: Record<string, string> = {
  trigger: 'Wyzwalacz',
  escalation: 'Eskalacja',
  peak: 'Szczyt',
  deescalation: 'Deeskalacja',
  aftermath: 'Nastepstwa',
};

const VOLATILITY_LABELS: Record<string, string> = {
  low: 'Lagodny',
  medium: 'Sredni',
  high: 'Wybuchowy',
};

const VOLATILITY_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

// ── ArgumentTopicPicker (inline sub-component) ─────────────

function ArgumentTopicPicker({
  topics,
  onSelect,
  isLoading,
  progressMessage,
  participants,
}: {
  topics: ArgumentTopic[];
  onSelect: (topic: string) => void;
  isLoading: boolean;
  progressMessage: string;
  participants?: string[];
}) {
  const [customTopic, setCustomTopic] = useState('');

  if (isLoading) {
    return (
      <AnalysisCard>
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-8 animate-spin text-[#ef4444]/60" />
          <p className="font-mono text-sm text-[#888]">{progressMessage || 'Przygotowuje...'}</p>
        </div>
      </AnalysisCard>
    );
  }

  return (
    <AnalysisCard>
      <h3 className="mb-2 font-[var(--font-syne)] text-lg font-bold tracking-tight text-white">
        Wybierz temat klotni
      </h3>
      <p className="mb-6 font-mono text-xs text-[#888]">
        Tematy wyodrebnione z Waszych prawdziwych konfliktow
      </p>

      {/* Topic grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((t, i) => {
          const volColor = VOLATILITY_COLORS[t.volatility] ?? '#f59e0b';
          return (
            <motion.button
              key={i}
              onClick={() => onSelect(t.topic)}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-[#ef4444]/30 hover:bg-[#ef4444]/[0.04]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-[var(--font-syne)] text-sm font-bold text-white group-hover:text-[#ef4444]">
                  {t.topic}
                </span>
                <span
                  className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                  style={{
                    color: volColor,
                    backgroundColor: `${volColor}15`,
                    border: `1px solid ${volColor}30`,
                  }}
                >
                  {VOLATILITY_LABELS[t.volatility] ?? t.volatility}
                </span>
              </div>
              <div className="space-y-1">
                {(participants ?? []).map((name, pi) => {
                  const stance = t.stances?.[name] || (pi === 0 ? t.stanceA : pi === 1 ? t.stanceB : '') || '';
                  if (!stance) return null;
                  const color = getPersonColor(participants ?? [], name);
                  return (
                    <p key={name} className="text-xs text-[#888] line-clamp-2">
                      <span
                        className="mr-1 inline-block size-1.5 rounded-full align-middle"
                        style={{ backgroundColor: color }}
                      />
                      <span style={{ color: `${color}99` }}>{name}:</span> {stance}
                    </p>
                  );
                })}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Custom topic */}
      <div className="mt-6">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
          ...lub wpisz wlasny temat
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="np. Kto zmywa naczynia?"
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 font-mono text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#ef4444]/30"
            maxLength={120}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customTopic.trim()) {
                onSelect(customTopic.trim());
              }
            }}
          />
          <button
            onClick={() => {
              if (customTopic.trim()) onSelect(customTopic.trim());
            }}
            disabled={!customTopic.trim()}
            className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-[#ef4444] transition-all hover:bg-[#ef4444]/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Zap className="size-4" />
          </button>
        </div>
      </div>
    </AnalysisCard>
  );
}

// ── ArgumentChat (inline sub-component) ────────────────────

function ArgumentChat({
  visibleMessages,
  participants,
  isTyping,
  typingSender,
  playbackState,
  currentMessageIndex,
  totalMessages,
  speed,
  onPause,
  onResume,
  onSkip,
  onSetSpeed,
  onStartPlayback,
}: {
  visibleMessages: ArgumentSimulationMessage[];
  participants: string[];
  isTyping: boolean;
  typingSender: string;
  playbackState: 'idle' | 'playing' | 'paused' | 'finished';
  currentMessageIndex: number;
  totalMessages: number;
  speed: 1 | 2 | 3;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onSetSpeed: (s: 1 | 2 | 3) => void;
  onStartPlayback: () => void;
}) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleMessages.length, isTyping]);

  const progressPct = totalMessages > 0 ? (currentMessageIndex / totalMessages) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Playback controls */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2">
          {playbackState === 'idle' && (
            <button
              onClick={onStartPlayback}
              className="flex items-center gap-1.5 rounded-lg bg-[#ef4444]/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ef4444] transition-colors hover:bg-[#ef4444]/25"
            >
              <Play className="size-3" />
              Start
            </button>
          )}
          {playbackState === 'playing' && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#888] transition-colors hover:text-white"
            >
              <Pause className="size-3" />
              Pauza
            </button>
          )}
          {playbackState === 'paused' && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 rounded-lg bg-[#ef4444]/15 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#ef4444] transition-colors hover:bg-[#ef4444]/25"
            >
              <Play className="size-3" />
              Wznow
            </button>
          )}

          {playbackState !== 'idle' && (
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#888] transition-colors hover:text-white"
            >
              <SkipForward className="size-3" />
              Pomin
            </button>
          )}
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`rounded-md px-2 py-1 font-mono text-[10px] font-bold transition-colors ${
                speed === s
                  ? 'bg-[#ef4444]/20 text-[#ef4444]'
                  : 'text-[#555] hover:text-[#888]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#ef4444] to-[#f97316]"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Chat window — Discord-style */}
      <div className="max-h-[500px] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#313338] p-4 sm:max-h-[600px]">
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg, i) => {
            const senderColor = getPersonColor(participants, msg.sender);
            const phaseColor = PHASE_COLORS[msg.phase] ?? '#6b7280';
            const prevMsg = i > 0 ? visibleMessages[i - 1] : null;
            const isGrouped = prevMsg?.sender === msg.sender && prevMsg?.phase === msg.phase;

            return (
              <motion.div
                key={i}
                className={`flex items-start gap-2.5 ${isGrouped ? 'mt-0.5 pl-[34px]' : 'mt-3 first:mt-0'}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                layout
              >
                {/* Avatar — only for first in group */}
                {!isGrouped && (
                  <div
                    className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: senderColor }}
                  >
                    {msg.sender.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {!isGrouped && (
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: senderColor }}>
                        {msg.sender}
                      </span>
                      <span
                        className="rounded-sm px-1 py-px font-mono text-[8px] uppercase tracking-widest"
                        style={{ color: phaseColor, backgroundColor: `${phaseColor}15` }}
                      >
                        {PHASE_LABELS[msg.phase] ?? msg.phase}
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-[#dbdee1]">{msg.text}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator — Discord-style */}
        <AnimatePresence>
          {isTyping && typingSender && (
            <motion.div
              className="mt-3 flex items-start gap-2.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <div
                className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: getPersonColor(participants, typingSender) }}
              >
                {typingSender.charAt(0).toUpperCase()}
              </div>
              <div>
                <span
                  className="mb-0.5 block text-sm font-bold"
                  style={{ color: getPersonColor(participants, typingSender) }}
                >
                  {typingSender}
                </span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="inline-block size-1.5 rounded-full bg-[#5e6572]"
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </div>

      {/* Message counter */}
      <p className="text-center font-mono text-[10px] text-[#555]">
        {currentMessageIndex} / {totalMessages} wiadomości
      </p>
    </div>
  );
}

// ── ArgumentReviewChat — static replay of all messages ──────

function ArgumentReviewChat({
  messages,
  participants,
  topic,
  onBack,
}: {
  messages: ArgumentSimulationMessage[];
  participants: string[];
  topic: string;
  onBack: () => void;
}) {
  let lastPhase = '';

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#888] transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3" />
          Wstecz
        </button>
        <h3 className="font-[var(--font-syne)] text-sm font-bold tracking-tight text-white">
          {topic}
        </h3>
        <div className="w-16" />
      </div>

      {/* Static chat window — Discord-style */}
      <div className="max-h-[600px] overflow-y-auto rounded-2xl border border-white/[0.06] bg-[#313338] p-4 sm:max-h-[700px]">
        {messages.map((msg, i) => {
          const senderColor = getPersonColor(participants, msg.sender);
          const phaseColor = PHASE_COLORS[msg.phase] ?? '#6b7280';
          const showDivider = msg.phase !== lastPhase;
          if (showDivider) lastPhase = msg.phase;
          const prevMsg = i > 0 ? messages[i - 1] : null;
          const isGrouped = !showDivider && prevMsg?.sender === msg.sender;

          return (
            <div key={i}>
              {showDivider && (
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span
                    className="font-mono text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: phaseColor }}
                  >
                    {PHASE_LABELS[msg.phase] ?? msg.phase}
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>
              )}
              <div className={`flex items-start gap-2.5 ${isGrouped ? 'mt-0.5 pl-[34px]' : 'mt-3 first:mt-0'}`}>
                {!isGrouped && (
                  <div
                    className="flex size-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: senderColor }}
                  >
                    {msg.sender.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {!isGrouped && (
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: senderColor }}>
                        {msg.sender}
                      </span>
                      <span
                        className="rounded-sm px-1 py-px font-mono text-[8px] uppercase tracking-widest"
                        style={{ color: phaseColor, backgroundColor: `${phaseColor}15` }}
                      >
                        {PHASE_LABELS[msg.phase] ?? msg.phase}
                      </span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed text-[#dbdee1]">{msg.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message count */}
      <p className="text-center font-mono text-[10px] text-[#555]">
        {messages.length} wiadomości
      </p>
    </div>
  );
}

// ── Participant selector (multi-checkbox) ───────────────────

function ParticipantSelector({
  participants,
  selected,
  onSelect,
}: {
  participants: string[];
  selected: string[];
  onSelect: (selected: string[]) => void;
}) {
  const [local, setLocal] = useState<Set<string>>(new Set(selected));

  const toggle = (name: string) => {
    setLocal(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    setLocal(prev =>
      prev.size === participants.length ? new Set() : new Set(participants),
    );
  };

  const handleApply = () => {
    const arr = participants.filter(p => local.has(p));
    if (arr.length >= 2) onSelect(arr);
  };

  return (
    <AnalysisCard>
      <h3 className="mb-4 font-[var(--font-syne)] text-lg font-bold tracking-tight text-white">
        Wybierz uczestnikow klotni
      </h3>
      <p className="mb-4 font-mono text-xs text-[#888]">
        Zaznacz osoby do symulacji (minimum 2).
      </p>

      {/* Select all toggle */}
      <button
        onClick={toggleAll}
        className="mb-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#888] transition-colors hover:text-white"
      >
        {local.size === participants.length ? 'Odznacz wszystko' : 'Wszyscy'}
      </button>

      {/* Participant checkboxes */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((name) => {
          const color = getPersonColor(participants, name);
          const checked = local.has(name);
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                checked
                  ? 'border-white/[0.12] bg-white/[0.05]'
                  : 'border-white/[0.04] bg-white/[0.01] opacity-50'
              }`}
            >
              <span
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="truncate font-mono text-xs text-white">{name}</span>
              {checked && (
                <span className="ml-auto font-mono text-[10px] text-[#10b981]">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleApply}
          disabled={local.size < 2}
          className="rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-[#ef4444] transition-all hover:bg-[#ef4444]/20 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Zatwierdz ({local.size})
        </button>
        {local.size < 2 && (
          <span className="font-mono text-[10px] text-[#ef4444]/60">
            Wybierz minimum 2 osoby
          </span>
        )}
      </div>
    </AnalysisCard>
  );
}

// ═══ MAIN ORCHESTRATOR ═══════════════════════════════════════

// Lazy import of ArgumentSummaryComponent so it code-splits
import dynamic from 'next/dynamic';
const ArgumentSummaryComponent = dynamic(() => import('./ArgumentSummary'), {
  ssr: false,
  loading: () => <div className="brand-shimmer h-48" />,
});

export default function ArgumentSimulator() {
  const {
    analysis,
    quantitative,
    qualitative,
    participants: allParticipants,
    isServerView,
    mergeQualitative,
    runningOperations,
  } = useAnalysis();

  // Selectable participants — multi-person
  const defaultSelected = useMemo(() => {
    // For <=5 participants: default all selected
    if (allParticipants.length <= 5) return allParticipants;
    // For 6+: default first 5
    return allParticipants.slice(0, 5);
  }, [allParticipants]);

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(defaultSelected);

  // Whether we need the participant selector (server view with many participants)
  const needsSelector = isServerView && allParticipants.length > 2;

  // The participants used for simulation
  const participants = useMemo(() => {
    if (needsSelector && selectedParticipants.length >= 2) {
      return selectedParticipants;
    }
    return allParticipants;
  }, [needsSelector, selectedParticipants, allParticipants]);

  const handleComplete = useCallback(
    (result: ArgumentSimulationResult) => {
      mergeQualitative({ argumentSimulation: result });
    },
    [mergeQualitative],
  );

  const sim = useArgumentSimulation(analysis, handleComplete);

  // Saved simulation from IndexedDB
  const savedSimulation = qualitative?.argumentSimulation ?? null;

  // View mode: 'review' shows saved/completed simulation, 'flow' runs normal flow
  const [viewMode, setViewMode] = useState<'flow' | 'review' | 'review-chat'>(
    savedSimulation ? 'review' : 'flow',
  );

  // User must click "Start" to begin enrichment (in flow mode)
  const [hasStarted, setHasStarted] = useState(false);

  // Sync viewMode when background operation completes and savedSimulation appears
  useEffect(() => {
    if (savedSimulation && !hasStarted) {
      setViewMode('review');
    }
  }, [savedSimulation, hasStarted]);

  const handleStart = useCallback(() => {
    setHasStarted(true);
    sim.startEnrichment();
  }, [sim]);

  // Get the current result for review (saved or just-completed)
  const reviewResult = useMemo(() => {
    // If we just finished a simulation, use the hook's data
    if (sim.playbackState === 'finished' && sim.script && sim.summary) {
      return {
        topic: savedSimulation?.topic ?? '',
        messages: sim.script,
        summary: sim.summary,
        enrichedFingerprint: sim.enrichedFingerprint ?? { topics: [], perPerson: {} },
      } as ArgumentSimulationResult;
    }
    return savedSimulation;
  }, [sim.playbackState, sim.script, sim.summary, sim.enrichedFingerprint, savedSimulation]);

  // Auto-start playback when generation completes
  useEffect(() => {
    if (sim.generationState === 'ready' && sim.playbackState === 'idle' && sim.script) {
      sim.startPlayback();
    }
  }, [sim.generationState, sim.playbackState, sim.script, sim.startPlayback]);

  const messageCount = analysis.conversation.messages.length;

  // ── Minimum messages guard ───────────────────────────────
  if (messageCount < 100) {
    return (
      <AnalysisCard>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <MessageSquare className="size-10 text-[#ef4444]/30" />
          <h3 className="font-[var(--font-syne)] text-lg font-bold text-white">
            Za mało wiadomości
          </h3>
          <p className="max-w-md font-mono text-xs text-[#888]">
            Symulacja Kłótni wymaga minimum 100 wiadomości w konwersacji
            do zbudowania wiarygodnego profilu konfliktowego.
            Twoja rozmowa ma {messageCount} wiadomości.
          </p>
        </div>
      </AnalysisCard>
    );
  }

  // ── Server view participant selector ─────────────────────
  if (needsSelector && selectedParticipants.length < 2) {
    return (
      <ParticipantSelector
        participants={allParticipants}
        selected={selectedParticipants}
        onSelect={setSelectedParticipants}
      />
    );
  }

  // ── Review mode: show saved simulation ──────────────────
  if (viewMode === 'review-chat' && reviewResult) {
    return (
      <ArgumentReviewChat
        messages={reviewResult.messages}
        participants={participants}
        topic={reviewResult.topic}
        onBack={() => setViewMode('review')}
      />
    );
  }

  if (viewMode === 'review' && reviewResult) {
    return (
      <ArgumentSummaryComponent
        summary={reviewResult.summary}
        participants={participants}
        messages={reviewResult.messages}
        topic={reviewResult.topic}
        onReset={() => {
          sim.reset();
          setHasStarted(false);
          setViewMode('flow');
        }}
        onReviewChat={() => setViewMode('review-chat')}
      />
    );
  }

  // ── Background operation running — show loading state ──
  const isBackgroundRunning = runningOperations.has('argument');
  if (isBackgroundRunning && !savedSimulation) {
    const opInfo = runningOperations.get('argument');
    return (
      <AnalysisCard>
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-8 animate-spin text-[#ef4444]/60" />
          <p className="font-mono text-sm text-[#888]">
            {opInfo?.status || 'Generuję symulację kłótni...'}
          </p>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#ef4444] to-[#f97316]"
              animate={{ width: `${opInfo?.progress ?? 30}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </AnalysisCard>
    );
  }

  // ── Intro screen — user must click to start ────────────
  if (!hasStarted) {
    const conflictCount = quantitative.conflictFingerprint?.totalConflictWindows ?? 0;
    return (
      <AnalysisCard>
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ef4444]/20 to-[#f97316]/20 ring-1 ring-[#ef4444]/20"
          >
            <Zap className="size-10 text-[#ef4444]" />
          </motion.div>

          <div className="space-y-2">
            <h3 className="font-[var(--font-syne)] text-xl font-bold tracking-tight text-white">
              Symulacja Kłótni
            </h3>
            <p className="mx-auto max-w-md font-mono text-xs leading-relaxed text-[#888]">
              AI wygeneruje realistyczną kłótnię między uczestnikami na wybrany temat,
              bazując na ich prawdziwych wzorcach komunikacji i stylu konfliktów.
            </p>
          </div>

          {conflictCount > 0 && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#ef4444]/60">
              Wykryto {conflictCount} {conflictCount === 1 ? 'konflikt' : conflictCount < 5 ? 'konflikty' : 'konfliktów'} w historii rozmowy
            </p>
          )}

          <motion.button
            onClick={handleStart}
            className="flex items-center gap-2.5 rounded-xl border border-[#ef4444]/30 bg-gradient-to-r from-[#ef4444]/15 to-[#f97316]/15 px-8 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.15)] transition-all hover:from-[#ef4444]/25 hover:to-[#f97316]/25 hover:shadow-[0_0_40px_rgba(239,68,68,0.25)] hover:-translate-y-px"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap className="size-4" />
            Rozpocznij analizę
          </motion.button>

          <p className="font-mono text-[9px] italic text-zinc-600">
            Tryb rozrywkowy — nie stanowi oceny psychologicznej
          </p>
        </div>
      </AnalysisCard>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (sim.enrichmentState === 'error' || sim.generationState === 'error') {
    return (
      <AnalysisCard>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertTriangle className="size-8 text-[#ef4444]" />
          <p className="font-mono text-sm text-[#ef4444]">{sim.error}</p>
          <button
            onClick={sim.reset}
            className="flex items-center gap-2 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-2 font-mono text-xs font-medium uppercase tracking-wider text-[#ef4444] transition-all hover:bg-[#ef4444]/20"
          >
            <RotateCcw className="size-3.5" />
            Sprobuj ponownie
          </button>
        </div>
      </AnalysisCard>
    );
  }

  // ── Enrichment loading or idle ───────────────────────────
  if (sim.enrichmentState === 'loading' || sim.enrichmentState === 'idle') {
    return (
      <ArgumentTopicPicker
        topics={[]}
        onSelect={() => {}}
        isLoading
        progressMessage={sim.progressMessage}
        participants={participants}
      />
    );
  }

  // ── Enrichment ready + generation idle: topic picker ─────
  if (sim.enrichmentState === 'ready' && sim.generationState === 'idle') {
    return (
      <ArgumentTopicPicker
        topics={sim.topics}
        onSelect={sim.generateArgument}
        isLoading={false}
        progressMessage=""
        participants={participants}
      />
    );
  }

  // ── Generation loading ───────────────────────────────────
  if (sim.generationState === 'loading') {
    return (
      <AnalysisCard>
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="size-8 animate-spin text-[#ef4444]/60" />
          <p className="font-mono text-sm text-[#888]">
            {sim.progressMessage || 'Generuje klotnie...'}
          </p>
          <div className="h-1 w-48 overflow-hidden rounded-full bg-white/[0.05]">
            <motion.div
              className="h-full rounded-full bg-[#ef4444]"
              animate={{ width: ['0%', '60%', '30%', '80%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </AnalysisCard>
    );
  }

  // ── Playback in progress ─────────────────────────────────
  if (sim.generationState === 'ready' && sim.playbackState !== 'finished') {
    return (
      <ArgumentChat
        visibleMessages={sim.visibleMessages}
        participants={participants}
        isTyping={sim.isTyping}
        typingSender={sim.typingSender}
        playbackState={sim.playbackState}
        currentMessageIndex={sim.currentMessageIndex}
        totalMessages={sim.script?.length ?? 0}
        speed={sim.speed}
        onPause={sim.pausePlayback}
        onResume={sim.resumePlayback}
        onSkip={sim.skipToEnd}
        onSetSpeed={sim.setSpeed}
        onStartPlayback={sim.startPlayback}
      />
    );
  }

  // ── Playback finished: summary ───────────────────────────
  if (sim.playbackState === 'finished' && sim.summary) {
    return (
      <ArgumentSummaryComponent
        summary={sim.summary}
        participants={participants}
        messages={sim.script ?? undefined}
        topic={reviewResult?.topic}
        onReset={() => {
          sim.reset();
          setHasStarted(false);
          setViewMode('flow');
        }}
        onReviewChat={() => setViewMode('review-chat')}
      />
    );
  }

  // ── Fallback (should never reach) ────────────────────────
  return null;
}
