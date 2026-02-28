'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ArgumentSimulationMessage } from '@/lib/analysis/types';

// ============================================================
// Types
// ============================================================

interface ArgumentChatProps {
  visibleMessages: ArgumentSimulationMessage[];
  isTyping: boolean;
  typingSender: string;
  currentMessageIndex: number;
  totalMessages: number;
  playbackState: 'idle' | 'playing' | 'paused' | 'finished';
  speed: 1 | 2 | 3;
  participants: string[];
  participantPhotos: Record<string, string>;
  onPause: () => void;
  onResume: () => void;
  onSpeedChange: (speed: 1 | 2 | 3) => void;
  onSkipToEnd: () => void;
  onStartPlayback: () => void;
}

// ============================================================
// Phase labels (Polish)
// ============================================================

const PHASE_LABELS: Record<ArgumentSimulationMessage['phase'], string> = {
  trigger: 'Iskra',
  escalation: 'Eskalacja',
  peak: 'Punkt kulminacyjny',
  deescalation: 'Wyciszenie',
  aftermath: 'Po burzy',
};

// ============================================================
// Avatar component
// ============================================================

function Avatar({
  name,
  photo,
  color,
}: {
  name: string;
  photo?: string;
  color: 'blue' | 'purple';
}) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const bgClass = color === 'blue' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#a855f7]/20 text-[#a855f7]';

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className="size-7 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold',
        bgClass,
      )}
    >
      {initials}
    </div>
  );
}

// ============================================================
// Typing indicator component
// ============================================================

function TypingIndicator({
  name,
  color,
  photo,
  isLeft,
}: {
  name: string;
  color: 'blue' | 'purple';
  photo?: string;
  isLeft: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        'flex items-end gap-2',
        isLeft ? 'flex-row' : 'flex-row-reverse',
      )}
    >
      <Avatar name={name} photo={photo} color={color} />
      <div className="flex flex-col" style={{ alignItems: isLeft ? 'flex-start' : 'flex-end' }}>
        <span className="mb-0.5 font-mono text-[9px] text-muted-foreground/30">
          {name} pisze...
        </span>
        <div className="flex items-center gap-1.5 rounded-2xl border border-border/30 bg-card px-4 py-2.5">
          <motion.div
            className="size-1.5 rounded-full bg-muted-foreground/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="size-1.5 rounded-full bg-muted-foreground/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="size-1.5 rounded-full bg-muted-foreground/40"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Phase divider component
// ============================================================

function PhaseDivider({ phase }: { phase: ArgumentSimulationMessage['phase'] }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border/30" />
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/30">
        {PHASE_LABELS[phase]}
      </span>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function ArgumentChat({
  visibleMessages,
  isTyping,
  typingSender,
  currentMessageIndex,
  totalMessages,
  playbackState,
  speed,
  participants,
  participantPhotos,
  onPause,
  onResume,
  onSpeedChange,
  onSkipToEnd,
  onStartPlayback,
}: ArgumentChatProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAutoScrollingRef = useRef(true);

  // ── Determine participant alignment ─────────────────────────
  // participants[0] = right (blue), participants[1] = left (purple)

  const getAlignment = useCallback(
    (sender: string): 'left' | 'right' => {
      return sender === participants[0] ? 'right' : 'left';
    },
    [participants],
  );

  const getColor = useCallback(
    (sender: string): 'blue' | 'purple' => {
      return sender === participants[0] ? 'blue' : 'purple';
    },
    [participants],
  );

  // ── Track manual scroll ─────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    // If the user scrolled up more than 80px from the bottom, disable auto-scroll
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAutoScrollingRef.current = distanceFromBottom < 80;
  }, []);

  // ── Auto-scroll on new messages ─────────────────────────────

  useEffect(() => {
    if (isAutoScrollingRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages, isTyping]);

  // ── Pre-compute burst grouping (which messages show avatars) ─

  const messageRenderData = useMemo(() => {
    return visibleMessages.map((msg, idx) => {
      const prevMsg = idx > 0 ? visibleMessages[idx - 1] : null;
      const isSameSender = prevMsg?.sender === msg.sender;
      const isSameBurst = isSameSender && prevMsg?.burstGroup === msg.burstGroup;

      // Show avatar on first message of a burst from this sender
      const showAvatar = !isSameBurst;

      // Show phase divider when phase changes
      const showPhaseDivider = prevMsg !== null && prevMsg.phase !== msg.phase;

      return { msg, showAvatar, showPhaseDivider, isSameBurst };
    });
  }, [visibleMessages]);

  // ── Progress computation ────────────────────────────────────

  const progress = totalMessages > 0 ? (currentMessageIndex / totalMessages) * 100 : 0;

  // ── Typing indicator position ───────────────────────────────

  const typingAlignment = typingSender ? getAlignment(typingSender) : 'left';
  const typingColor = typingSender ? getColor(typingSender) : 'purple';

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div className="flex flex-col rounded-2xl border border-[#1a1a1a] bg-[#111] overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Participant indicators */}
          <div className="flex -space-x-1.5">
            {participants.slice(0, 2).map((name, i) => (
              <div
                key={name}
                className={cn(
                  'flex size-6 items-center justify-center rounded-full font-mono text-[9px] font-bold ring-2 ring-[#111]',
                  i === 0
                    ? 'bg-[#3b82f6]/20 text-[#3b82f6]'
                    : 'bg-[#a855f7]/20 text-[#a855f7]',
                )}
              >
                {name[0]?.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#fafafa]">
              {participants[0]} vs {participants[1] ?? '?'}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/30">
              {playbackState === 'playing'
                ? 'symulacja trwa...'
                : playbackState === 'paused'
                  ? 'wstrzymano'
                  : playbackState === 'finished'
                    ? 'zakonczono'
                    : 'gotowe'}
            </span>
          </div>
        </div>

        {/* Message counter */}
        <span className="rounded border border-border bg-[#0a0a0a] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {currentMessageIndex}/{totalMessages}
        </span>
      </div>

      {/* Chat message area */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex flex-col overflow-y-auto p-4"
        style={{ maxHeight: '70vh', minHeight: 300 }}
      >
        {/* Empty state — idle before playback */}
        {visibleMessages.length === 0 && !isTyping && playbackState === 'idle' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-16">
            <span className="font-mono text-xs text-muted-foreground/40">
              Nacisnij &quot;Rozpocznij&quot; aby odtworzyc symulacje
            </span>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {messageRenderData.map(({ msg, showAvatar, showPhaseDivider, isSameBurst }, idx) => {
            const alignment = getAlignment(msg.sender);
            const color = getColor(msg.sender);
            const isLeft = alignment === 'left';

            return (
              <div key={idx}>
                {/* Phase divider */}
                {showPhaseDivider && <PhaseDivider phase={msg.phase} />}

                {/* Message row */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'flex items-end',
                    isLeft ? 'flex-row' : 'flex-row-reverse',
                    isSameBurst ? 'mt-1' : 'mt-3',
                  )}
                  style={{ gap: '0.5rem' }}
                >
                  {/* Avatar slot — 28px wide, only renders content on first of burst */}
                  <div className="w-7 shrink-0">
                    {showAvatar && (
                      <Avatar
                        name={msg.sender}
                        photo={participantPhotos[msg.sender]}
                        color={color}
                      />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2',
                      isLeft
                        ? 'rounded-bl-sm border-l-2 border-[#a855f7]/40 bg-[#a855f7]/10'
                        : 'rounded-br-sm border-l-2 border-[#3b82f6]/40 bg-[#3b82f6]/10',
                    )}
                  >
                    <span className="text-sm leading-relaxed text-[#fafafa]">
                      {msg.text}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && typingSender && (
            <div className={cn('mt-3', typingAlignment === 'left' ? '' : '')}>
              <TypingIndicator
                name={typingSender}
                color={typingColor}
                photo={participantPhotos[typingSender]}
                isLeft={typingAlignment === 'left'}
              />
            </div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Controls overlay */}
      <div className="border-t border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3">
        {/* Idle state — big play button */}
        {playbackState === 'idle' && (
          <div className="flex items-center justify-center">
            <button
              onClick={onStartPlayback}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all',
                'bg-gradient-to-r from-[#EF4444] to-[#DC2626] hover:from-[#DC2626] hover:to-[#B91C1C]',
                'shadow-[0_4px_24px_-4px_rgba(239,68,68,0.3)]',
              )}
            >
              <Play className="size-4" />
              Rozpocznij
            </button>
          </div>
        )}

        {/* Playing / Paused — full controls */}
        {(playbackState === 'playing' || playbackState === 'paused') && (
          <div className="flex flex-col gap-2.5">
            {/* Progress bar */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-border/30">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#EF4444] to-[#DC2626]"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              {/* Left: play/pause + skip */}
              <div className="flex items-center gap-2">
                <button
                  onClick={playbackState === 'playing' ? onPause : onResume}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-[#111] text-[#fafafa] transition-colors hover:bg-[#161616]"
                >
                  {playbackState === 'playing' ? (
                    <Pause className="size-3.5" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                </button>

                <button
                  onClick={onSkipToEnd}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-[#111] text-muted-foreground transition-colors hover:bg-[#161616] hover:text-[#fafafa]"
                  title="Przewin do konca"
                >
                  <ChevronsRight className="size-3.5" />
                </button>
              </div>

              {/* Center: progress text */}
              <span className="font-mono text-[10px] text-muted-foreground/50">
                Wiadomosc {currentMessageIndex}/{totalMessages}
              </span>

              {/* Right: speed pills */}
              <div className="flex items-center gap-1">
                {([1, 2, 3] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onSpeedChange(s)}
                    className={cn(
                      'rounded-md px-2 py-0.5 font-mono text-[10px] font-bold transition-all',
                      speed === s
                        ? 'bg-[#EF4444]/20 text-[#EF4444] ring-1 ring-[#EF4444]/30'
                        : 'text-muted-foreground/40 hover:text-muted-foreground/60',
                    )}
                  >
                    x{s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Finished state */}
        {playbackState === 'finished' && (
          <div className="flex items-center justify-center">
            <span className="font-mono text-xs text-muted-foreground/40">
              Symulacja zakonczona
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
