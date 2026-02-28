'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArgumentTopic } from '@/lib/analysis/types';

// ============================================================
// Types
// ============================================================

interface ArgumentTopicPickerProps {
  topics: ArgumentTopic[];
  isLoading: boolean;
  progressMessage: string;
  hasEnoughData: boolean;
  onTopicSelect: (topic: string) => void;
  participants: string[];
}

// ============================================================
// Volatility helpers
// ============================================================

const VOLATILITY_CONFIG = {
  low: { color: 'bg-[#10B981]', ring: 'ring-[#10B981]/30', label: 'Niska' },
  medium: { color: 'bg-[#F59E0B]', ring: 'ring-[#F59E0B]/30', label: 'Średnia' },
  high: { color: 'bg-[#EF4444]', ring: 'ring-[#EF4444]/30', label: 'Wysoka' },
} as const;

// ============================================================
// Loading state component
// ============================================================

function LoadingState({ progressMessage }: { progressMessage: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex items-center gap-2">
        <motion.div
          className="size-2 rounded-full bg-[#EF4444]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="size-2 rounded-full bg-[#EF4444]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="size-2 rounded-full bg-[#EF4444]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          ANALIZA KONFLIKTOW
        </span>
        <motion.p
          key={progressMessage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm text-center text-sm text-muted-foreground"
        >
          {progressMessage || 'Przygotowuję dane...'}
        </motion.p>
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function ArgumentTopicPicker({
  topics,
  isLoading,
  progressMessage,
  hasEnoughData,
  onTopicSelect,
  participants,
}: ArgumentTopicPickerProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // The effective topic — either a selected chip or the custom input
  const effectiveTopic = selectedTopic ?? (customTopic.trim() || null);

  const handleTopicClick = useCallback((topic: string) => {
    setSelectedTopic((prev) => (prev === topic ? null : topic));
    // Clear custom topic when selecting a chip
    setCustomTopic('');
  }, []);

  const handleCustomChange = useCallback((value: string) => {
    setCustomTopic(value);
    // Deselect chip when typing a custom topic
    if (value.trim()) setSelectedTopic(null);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!effectiveTopic) return;
    onTopicSelect(effectiveTopic);
  }, [effectiveTopic, onTopicSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && effectiveTopic) {
        e.preventDefault();
        handleGenerate();
      }
    },
    [effectiveTopic, handleGenerate],
  );

  // ── Loading state ──────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-[#111] p-5 sm:p-7">
        <LoadingState progressMessage={progressMessage} />
      </div>
    );
  }

  // ── Main picker ────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-[#1a1a1a] bg-[#111] p-5 sm:p-7">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
          SYMULACJA KLOTNI
        </span>
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold tracking-tight text-[#fafafa]">
          O co chcecie sie poklocic?
        </h2>
        <p className="text-sm text-muted-foreground">
          Wasze tematy zapalne:
        </p>
      </div>

      {/* Data warning */}
      {!hasEnoughData && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-3.5 py-2.5"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#F59E0B]" />
          <p className="text-xs leading-relaxed text-[#F59E0B]/80">
            Za malo danych o konfliktach — symulacja bedzie oparta na ogolnym stylu komunikacji
          </p>
        </motion.div>
      )}

      {/* Topic chips grid */}
      {topics.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          <AnimatePresence>
            {topics.map((topic, idx) => {
              const isSelected = selectedTopic === topic.topic;
              const isExpanded = expandedTopic === topic.topic;
              const vol = VOLATILITY_CONFIG[topic.volatility];

              return (
                <motion.button
                  key={topic.topic}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  onClick={() => handleTopicClick(topic.topic)}
                  onMouseEnter={() => setExpandedTopic(topic.topic)}
                  onMouseLeave={() => setExpandedTopic(null)}
                  className={cn(
                    'group relative flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-all',
                    isSelected
                      ? 'border-[#EF4444]/40 bg-[#EF4444]/5'
                      : 'border-[#1a1a1a] bg-[#111] hover:border-[#2a2a2a] hover:bg-[#161616]',
                  )}
                >
                  {/* Topic name + volatility */}
                  <div className="flex w-full items-center gap-2">
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full ring-2',
                        vol.color,
                        vol.ring,
                      )}
                      title={`Zmiennosc: ${vol.label}`}
                    />
                    <span className="flex-1 text-sm font-medium text-[#fafafa]">
                      {topic.topic}
                    </span>
                    <ChevronRight
                      className={cn(
                        'size-3.5 text-muted-foreground/20 transition-all',
                        isSelected && 'rotate-90 text-[#EF4444]/60',
                        !isSelected && 'group-hover:text-muted-foreground/40',
                      )}
                    />
                  </div>

                  {/* Expanded stance view */}
                  <AnimatePresence>
                    {(isExpanded || isSelected) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mt-2 flex w-full flex-col gap-1.5 overflow-hidden"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#3b82f6]" />
                          <span className="text-xs leading-snug text-muted-foreground">
                            <span className="font-medium text-[#3b82f6]/80">
                              {participants[0]}:
                            </span>{' '}
                            {topic.stanceA}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-[#a855f7]" />
                          <span className="text-xs leading-snug text-muted-foreground">
                            <span className="font-medium text-[#a855f7]/80">
                              {participants[1] ?? 'Osoba B'}:
                            </span>{' '}
                            {topic.stanceB}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Custom topic input */}
      <div className="mb-4">
        <input
          type="text"
          value={customTopic}
          onChange={(e) => handleCustomChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Lub wpisz wlasny temat..."
          maxLength={120}
          className={cn(
            'w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-3.5 py-2.5 text-sm text-[#fafafa]',
            'placeholder:text-muted-foreground/25 focus:border-[#EF4444]/30 focus:outline-none',
            'transition-colors',
          )}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!effectiveTopic}
        className={cn(
          'flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all',
          effectiveTopic
            ? 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C] cursor-pointer shadow-[0_4px_24px_-4px_rgba(239,68,68,0.3)]'
            : 'bg-[#1a1a1a] text-muted-foreground/40 cursor-not-allowed',
        )}
      >
        <Swords className="size-4" />
        Generuj klotnie
      </button>
    </div>
  );
}
