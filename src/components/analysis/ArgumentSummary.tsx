'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Swords, ShieldAlert, AlertTriangle, VolumeX, Download, Loader2, MessageSquare } from 'lucide-react';
import AnalysisCard from '@/components/shared/AnalysisCard';

import type { ArgumentSummary as ArgumentSummaryType, ArgumentSimulationMessage } from '@/lib/analysis/types';
import type { ConflictFingerprintResult } from '@/lib/analysis/quant/conflict-fingerprint';

// ── Types ──────────────────────────────────────────────────

interface ArgumentSummaryProps {
  summary: ArgumentSummaryType;
  participants: string[];
  conflictFingerprint?: ConflictFingerprintResult;
  onReset: () => void;
  /** Full message list + topic for PDF export (optional) */
  messages?: ArgumentSimulationMessage[];
  topic?: string;
  /** Callback to switch to review/replay mode */
  onReviewChat?: () => void;
}

// ── Horseman config ────────────────────────────────────────

const HORSEMAN_LABELS: Record<string, string> = {
  criticism: 'Krytycyzm',
  contempt: 'Pogarda',
  defensiveness: 'Defensywnosc',
  stonewalling: 'Wycofanie',
};

const HORSEMAN_COLORS: Record<string, string> = {
  criticism: '#ef4444',
  contempt: '#a855f7',
  defensiveness: '#f59e0b',
  stonewalling: '#6b7280',
};

const HORSEMAN_ICONS: Record<string, typeof Swords> = {
  criticism: Swords,
  contempt: ShieldAlert,
  defensiveness: AlertTriangle,
  stonewalling: VolumeX,
};

// ── Phase labels ───────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  trigger: 'Wyzwalacz',
  escalation: 'Eskalacja',
  peak: 'Szczyt',
  deescalation: 'Deeskalacja',
  aftermath: 'Nastepstwa',
};

// ── Container animation ────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// ── Horseman bar ───────────────────────────────────────────

function HorsemanBar({
  horseman,
  score,
  isDominant,
}: {
  horseman: string;
  score: number;
  isDominant: boolean;
}) {
  const color = HORSEMAN_COLORS[horseman] ?? '#6b7280';
  const Icon = HORSEMAN_ICONS[horseman] ?? Swords;
  const label = HORSEMAN_LABELS[horseman] ?? horseman;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5" style={{ color: `${color}99` }} />
          <span className="font-mono text-xs text-[#ccc]">{label}</span>
          {isDominant && (
            <span
              className="rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
              style={{
                color,
                backgroundColor: `${color}15`,
                border: `1px solid ${color}30`,
              }}
            >
              Dominujacy
            </span>
          )}
        </div>
        <span className="font-mono text-xs font-bold" style={{ color }}>
          {score}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(2, score)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Escalation contribution bar ────────────────────────────

function EscalationBar({ value, name }: { value: number; name: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
          Wklad w eskalacje
        </span>
        <span className="font-mono text-xs font-bold text-[#ef4444]">{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <motion.div
          className="h-full rounded-full bg-[#ef4444]"
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(2, value)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          aria-label={`${name}: ${value}% wkladu w eskalacje`}
        />
      </div>
    </div>
  );
}

// ═══ MAIN COMPONENT ═══════════════════════════════════════

export default function ArgumentSummary({
  summary,
  participants,
  onReset,
  messages,
  topic,
  onReviewChat,
}: ArgumentSummaryProps) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!messages || !topic) return;
    setPdfLoading(true);
    try {
      const { generateArgumentPdf } = await import('@/lib/export/argument-pdf');
      await generateArgumentPdf(
        { topic, messages, summary, enrichedFingerprint: { topics: [], perPerson: {} } },
        participants,
      );
    } catch (err) {
      console.error('[ArgumentPDF] Export failed:', err);
    } finally {
      setPdfLoading(false);
    }
  }, [messages, topic, summary, participants]);
  const horsemen = ['criticism', 'contempt', 'defensiveness', 'stonewalling'] as const;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Card 1: Dynamika konfliktu ─────────────────── */}
      <motion.div variants={itemVariants}>
        <AnalysisCard>
          <h3 className="mb-5 font-[var(--font-syne)] text-lg font-bold tracking-tight text-white">
            Dynamika konfliktu
          </h3>

          <div className="space-y-4">
            {/* Escalator */}
            <div className="flex items-start gap-3">
              <Swords className="mt-0.5 size-4 shrink-0 text-[#ef4444]/60" />
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
                  Eskalator:
                </span>
                <span className="ml-2 font-[var(--font-syne)] text-sm font-bold text-[#ef4444]">
                  {summary.escalator}
                </span>
              </div>
            </div>

            {/* First de-escalator */}
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#10b981]/60" />
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
                  Pierwsza proba deeskalacji:
                </span>
                <span className="ml-2 font-[var(--font-syne)] text-sm font-bold text-[#10b981]">
                  {summary.firstDeescalator}
                </span>
              </div>
            </div>

            {/* Escalation count */}
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#f59e0b]/60" />
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
                  Eskalacja zajela:
                </span>
                <span className="ml-2 font-mono text-sm font-bold text-[#f59e0b]">
                  {summary.escalationMessageCount}
                </span>
                <span className="ml-1 text-sm text-[#888]">wiadomości</span>
              </div>
            </div>

            {/* Pattern description */}
            {summary.patternDescription && (
              <p className="mt-2 text-sm italic leading-relaxed text-[#888]">
                {summary.patternDescription}
              </p>
            )}
          </div>
        </AnalysisCard>
      </motion.div>

      {/* ── Card 2: Czterej Jezdcy Apokalipsy ──────────── */}
      <motion.div variants={itemVariants}>
        <AnalysisCard>
          <h3 className="mb-5 font-[var(--font-syne)] text-lg font-bold tracking-tight text-white">
            Czterej Jezdcy Apokalipsy
            <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-widest text-[#888]">
              Gottman
            </span>
          </h3>

          <div className="space-y-4">
            {horsemen.map((h) => (
              <HorsemanBar
                key={h}
                horseman={h}
                score={summary.horsemanScores[h] ?? 0}
                isDominant={summary.dominantHorseman === h}
              />
            ))}
          </div>
        </AnalysisCard>
      </motion.div>

      {/* ── Card 3: Porownanie z rzeczywistoscia ───────── */}
      <motion.div variants={itemVariants}>
        <AnalysisCard>
          <h3 className="mb-5 font-[var(--font-syne)] text-lg font-bold tracking-tight text-white">
            Porownanie z rzeczywistoscia
          </h3>

          {/* Comparison text */}
          {summary.comparisonWithReal && (
            <p className="mb-6 text-sm leading-relaxed text-[#ccc]">
              {summary.comparisonWithReal}
            </p>
          )}

          {/* Per-person breakdown */}
          <div className="grid gap-4 sm:grid-cols-2">
            {participants.map((name, i) => {
              const breakdown = summary.personBreakdown?.[name];
              if (!breakdown) return null;

              return (
                <div
                  key={name}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  {/* Name header */}
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className="inline-flex size-7 items-center justify-center rounded-full font-mono text-[10px] font-bold text-black"
                      style={{
                        background: i === 0
                          ? 'linear-gradient(135deg, #ef4444, #f97316)'
                          : 'linear-gradient(135deg, #3b82f6, #a855f7)',
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-[var(--font-syne)] text-sm font-bold text-white">
                      {name}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
                        Wiadomości
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {breakdown.messagesCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
                        Sr. dlugosc
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {Math.round(breakdown.avgLength)} slow
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
                        Dominujaca faza
                      </span>
                      <span className="font-mono text-xs font-bold text-[#ef4444]">
                        {PHASE_LABELS[breakdown.dominantPhase] ?? breakdown.dominantPhase}
                      </span>
                    </div>

                    {/* Escalation contribution bar */}
                    <EscalationBar value={breakdown.escalationContribution} name={name} />
                  </div>
                </div>
              );
            })}
          </div>
        </AnalysisCard>
      </motion.div>

      {/* ── Card 4: Actions ────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* PDF download */}
          {messages && topic && (
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 font-mono text-xs font-medium uppercase tracking-wider text-white transition-all hover:bg-white/[0.08] disabled:opacity-40"
            >
              {pdfLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Pobierz PDF
            </button>
          )}

          {/* Review chat */}
          {onReviewChat && (
            <button
              onClick={onReviewChat}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 font-mono text-xs font-medium uppercase tracking-wider text-[#888] transition-all hover:bg-white/[0.08] hover:text-white"
            >
              <MessageSquare className="size-4" />
              Przejrzyj rozmowe
            </button>
          )}

          {/* New simulation */}
          <button
            onClick={onReset}
            className="flex items-center gap-2 rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/10 px-5 py-3 font-mono text-xs font-medium uppercase tracking-wider text-[#ef4444] transition-all hover:bg-[#ef4444]/20"
          >
            <RotateCcw className="size-4" />
            Nowa symulacja
          </button>
        </div>
      </motion.div>

      {/* ── Disclaimer ─────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <p className="text-center font-mono text-[10px] italic text-zinc-500">
          Tryb rozrywkowy — symulacja oparta na wzorcach komunikacji,
          nie stanowi analizy psychologicznej ani profesjonalnej oceny.
        </p>
      </motion.div>
    </motion.div>
  );
}
