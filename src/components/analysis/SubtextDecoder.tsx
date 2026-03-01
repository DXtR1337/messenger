'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, ChevronUp, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SubtextResult, SubtextItem, SubtextCategory } from '@/lib/analysis/subtext';
import { CATEGORY_META } from '@/lib/analysis/subtext';
import BrandLogo from '@/components/shared/BrandLogo';

interface SubtextDecoderProps {
  subtextResult?: SubtextResult;
  onRunSubtext: () => Promise<void>;
  isLoading: boolean;
  progress: number;
  canRun: boolean;
  error?: string | null;
}

function formatTime(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
}

function CategoryBadge({ category }: { category: SubtextCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        backgroundColor: `${meta.color}20`,
        color: meta.color,
        border: `1px solid ${meta.color}30`,
      }}
    >
      {meta.emoji} {meta.label}
    </span>
  );
}

function SubtextItemCard({ item, index }: { item: SubtextItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = CATEGORY_META[item.category];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 1) }}
      className="group relative overflow-hidden rounded-xl border bg-card transition-colors hover:bg-card-hover"
      style={{
        borderColor: item.isHighlight ? '#f59e0b40' : `${meta.color}25`,
      }}
    >
      {/* Highlight glow */}
      {item.isHighlight && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
      )}

      <div className="relative p-4 space-y-3">
        {/* Header: sender + time + badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">{item.sender}</span>
            <span className="text-[10px] text-text-muted shrink-0">{formatTime(item.timestamp)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.isHighlight && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 rounded-full px-1.5 py-0.5 border border-amber-400/20">
                WOW
              </span>
            )}
            <CategoryBadge category={item.category} />
          </div>
        </div>

        {/* Original message */}
        <div className="rounded-lg bg-white/5 p-3 border border-white/5">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Co napisal/a:</p>
          <p className="text-sm text-foreground leading-relaxed">&ldquo;{item.originalMessage}&rdquo;</p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1 text-text-muted">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-white/20" />
            <ChevronDown className="size-3.5" />
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-white/20" />
          </div>
        </div>

        {/* Decoded subtext */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, delay: Math.min(index * 0.05 + 0.2, 1.2) }}
          className="rounded-lg p-3 border"
          style={{
            backgroundColor: `${meta.color}08`,
            borderColor: `${meta.color}20`,
          }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: meta.color }}>
            Co naprawde mial/a na mysli:
          </p>
          <p className="text-sm text-foreground leading-relaxed font-medium">&ldquo;{item.subtext}&rdquo;</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-text-muted">
              {meta.emoji} {item.emotion}
            </span>
            <span className="text-[10px] text-text-muted">
              Pewnosc AI: {item.confidence}%
            </span>
          </div>
        </motion.div>

        {/* Context (expandable) */}
        {item.exchangeContext && (
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="flex items-center gap-1 text-[10px] text-text-muted hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            Kontekst: {item.exchangeContext}
          </button>
        )}

        <AnimatePresence>
          {expanded && item.surroundingMessages.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-1 pt-2 border-t border-border">
                {item.surroundingMessages.map((sm, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <span className="text-text-muted shrink-0 font-medium">{sm.sender.split(' ')[0]}:</span>
                    <span className="text-text-secondary truncate">{sm.content}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function SummaryStrip({ summary, participants }: { summary: SubtextResult['summary']; participants: string[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Deception scores */}
      {participants.map(name => {
        const score = summary.deceptionScore[name] ?? 0;
        const barColor = score > 60 ? '#ef4444' : score > 40 ? '#f59e0b' : '#10b981';
        return (
          <div key={name} className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{name.split(' ')[0]}</span>
              <span className="text-xs font-bold" style={{ color: barColor }}>{score}% ukrytych emocji</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}

      {/* Top categories */}
      <div className="sm:col-span-2 rounded-lg border border-border bg-card p-3">
        <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">Najczestsze wzorce</p>
        <div className="flex flex-wrap gap-1.5">
          {summary.topCategories.slice(0, 5).map(({ category, count }) => (
            <span
              key={category}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${CATEGORY_META[category].color}15`,
                color: CATEGORY_META[category].color,
              }}
            >
              {CATEGORY_META[category].emoji} {CATEGORY_META[category].label} ({count})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SubtextDecoder({
  subtextResult,
  onRunSubtext,
  isLoading,
  progress,
  canRun,
  error,
}: SubtextDecoderProps) {
  const [showAll, setShowAll] = useState(false);

  // Not yet run — show launch button
  if (!subtextResult && !isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Search className="size-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Translator <BrandLogo size="sm" /></h3>
            <p className="text-xs text-text-muted">Co naprawde mieli na mysli? AI dekoduje ukryte znaczenia.</p>
          </div>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Analiza szuka wiadomości z ukrytym podtekstem — krótkie odpowiedzi po długich wiadomościach,
          pasywne markery (&ldquo;ok&rdquo;, &ldquo;spoko&rdquo;, &ldquo;jak chcesz&rdquo;), nagłe zmiany tematu,
          opóźnione odpowiedzi. Dla każdej odkodowuje co naprawdę miał/a na myśli.
        </p>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
            <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <Button
          onClick={onRunSubtext}
          disabled={!canRun}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white gap-2"
        >
          <Sparkles className="size-4" />
          Dekoduj podteksty
        </Button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Search className="size-5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Dekodowanie podtekstow...</h3>
            <p className="text-xs text-text-muted">Analizowanie wymian zdan w kontekscie rozmowy</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-500"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-text-muted text-center">{Math.round(progress)}%</p>
        </div>
      </div>
    );
  }

  // Results
  if (!subtextResult) return null;

  const { items, summary } = subtextResult;
  const participants = Object.keys(summary.deceptionScore);
  const displayItems = showAll ? items : items.slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
          <Search className="size-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Translator <BrandLogo size="sm" /></h3>
          <p className="text-xs text-text-muted">{items.length} zdekodowanych wiadomości</p>
        </div>
      </div>

      {/* Summary */}
      <SummaryStrip summary={summary} participants={participants} />

      {/* Biggest reveal */}
      {summary.biggestReveal && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Najwieksze odkrycie</p>
          <p className="text-sm text-foreground">
            <span className="text-text-muted">{summary.biggestReveal.sender}:</span>{' '}
            &ldquo;{summary.biggestReveal.originalMessage}&rdquo;
          </p>
          <p className="text-sm font-semibold text-amber-300">
            → &ldquo;{summary.biggestReveal.subtext}&rdquo;
          </p>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {displayItems.map((item, i) => (
          <SubtextItemCard key={`${item.timestamp}-${item.sender}-${i}`} item={item} index={i} />
        ))}
      </div>

      {/* Show more/less */}
      {items.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full rounded-lg border border-border bg-card p-3 text-xs font-medium text-text-secondary hover:text-foreground hover:bg-card-hover transition-colors"
        >
          {showAll ? `Pokaz mniej` : `Pokaz wszystkie ${items.length} podtekstow`}
        </button>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-text-muted leading-relaxed text-center px-4">
        {subtextResult.disclaimer}
      </p>
    </div>
  );
}
