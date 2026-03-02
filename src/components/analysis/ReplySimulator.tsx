'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, RotateCcw, Share2, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sampleMessages } from '@/lib/analysis/qualitative';
import { trackEvent } from '@/lib/analytics/events';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import SimulatorCard from '@/components/share-cards/SimulatorCard';
import type { SimulatorExchange } from '@/components/share-cards/SimulatorCard';
import DiscordSendButton from '@/components/shared/DiscordSendButton';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';
import type { QualitativeAnalysis } from '@/lib/analysis/types';

// ============================================================
// Types
// ============================================================

interface ReplySimulatorProps {
  conversation: ParsedConversation;
  quantitative: QuantitativeAnalysis;
  qualitative?: QualitativeAnalysis;
  participants: string[];
}

interface ChatMessage {
  role: 'user' | 'target';
  message: string;
  timestamp: number;
  confidence?: number;
}

type SimulatorPhase = 'select' | 'chat' | 'summary';

const MAX_EXCHANGES = 5;
const MAX_MESSAGE_LENGTH = 200;
const MIN_MESSAGES_REQUIRED = 500;

// ============================================================
// Typing indicator component
// ============================================================

function TypingIndicator({ name }: { name: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <span className="mb-1 pl-3 font-mono text-[10px] text-muted-foreground/40">{name}</span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border/30 bg-card px-4 py-2.5">
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
  );
}

// ============================================================
// Helper: format response time
// ============================================================

function formatResponseTime(ms: number): string {
  const sec = ms / 1000;
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ${Math.round(sec % 60)}s`;
  return `${(sec / 3600).toFixed(1)}h`;
}

// ============================================================
// Main component
// ============================================================

export default function ReplySimulator({
  conversation,
  quantitative,
  qualitative,
  participants,
}: ReplySimulatorProps) {
  const { startOperation, updateOperation, stopOperation } = useAnalysis();
  // ── State ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<SimulatorPhase>('select');
  const [targetPerson, setTargetPerson] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [styleNotes, setStyleNotes] = useState<string>('');
  const [showShareCard, setShowShareCard] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Do NOT abort SSE on unmount — let it finish in the background
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (phase === 'chat') {
      inputRef.current?.focus();
    }
  }, [phase]);

  // ── Computed values ───────────────────────────────────────

  const targetMetrics = targetPerson ? quantitative.perPerson[targetPerson] : null;
  const targetTiming = targetPerson ? quantitative.timing.perPerson[targetPerson] : null;
  const targetTotalMessages = targetMetrics?.totalMessages ?? 0;
  const medianResponseTimeMs = targetTiming?.medianResponseTimeMs ?? 300000;

  const averageConfidence = messages.length > 0
    ? Math.round(
        messages
          .filter((m) => m.role === 'target' && m.confidence !== undefined)
          .reduce((sum, m) => sum + (m.confidence ?? 0), 0) /
        Math.max(1, messages.filter((m) => m.role === 'target').length),
      )
    : 0;

  // ── Person selection handler ──────────────────────────────

  const handleSelectPerson = useCallback((name: string) => {
    setTargetPerson(name);
    setPhase('chat');
    setMessages([]);
    setExchangeCount(0);
    setError(null);
    setStyleNotes('');
    startOperation('simulator', 'Symulator', `Symulacja z ${name}...`);
    trackEvent({ name: 'analysis_start', params: { mode: 'standard' } });
  }, [startOperation]);

  // ── Cancel handler ────────────────────────────────────────

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsTyping(false);
  }, []);

  // ── Send message handler ──────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping || exchangeCount >= MAX_EXCHANGES) return;

    setError(null);

    const userMsg: ChatMessage = {
      role: 'user',
      message: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    const previousExchanges: Array<{ role: 'user' | 'target'; message: string }> = [
      ...messages.map((m) => ({ role: m.role, message: m.message })),
      { role: 'user' as const, message: trimmed },
    ];

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsTyping(true);

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      const samples = sampleMessages(conversation, quantitative);
      const personMetrics = quantitative.perPerson[targetPerson];
      const personTiming = quantitative.timing.perPerson[targetPerson];

      let quantCtx = samples.quantitativeContext ?? '';
      if (qualitative?.reconBriefing) quantCtx += '\n\n' + qualitative.reconBriefing;

      const body = {
        userMessage: trimmed,
        targetPerson,
        participants,
        samples,
        quantitativeContext: quantCtx,
        topWords: personMetrics?.topWords ?? [],
        topPhrases: personMetrics?.topPhrases ?? [],
        avgMessageLengthWords: personMetrics?.averageMessageLength ?? 8,
        avgMessageLengthChars: personMetrics?.averageMessageChars ?? 40,
        emojiFrequency: personMetrics
          ? personMetrics.emojiCount / Math.max(1, personMetrics.totalMessages)
          : 0,
        topEmojis: personMetrics?.topEmojis ?? [],
        medianResponseTimeMs: personTiming?.medianResponseTimeMs ?? 300000,
        previousExchanges,
        personalityProfile: qualitative?.pass3?.[targetPerson] ?? undefined,
        toneAnalysis: qualitative?.pass1 ?? undefined,
        dynamicsAnalysis: qualitative?.pass2 ?? undefined,
      };

      const response = await fetch('/api/analyze/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Symulacja: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('Brak odpowiedzi z serwera');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let typingDelay = 1500;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data) as {
              type: string;
              delay?: number;
              message?: string;
              confidence?: number;
              responseTimeEstimate?: string;
              styleNotes?: string;
              error?: string;
            };

            if (event.type === 'typing' && typeof event.delay === 'number') {
              typingDelay = event.delay;
              await new Promise((r) => setTimeout(r, typingDelay));
            } else if (event.type === 'reply' && event.message) {
              const targetMsg: ChatMessage = {
                role: 'target',
                message: event.message,
                timestamp: Date.now(),
                confidence: event.confidence,
              };
              if (mountedRef.current) {
                setMessages((prev) => [...prev, targetMsg]);
                setExchangeCount((prev) => {
                  const next = prev + 1;
                  updateOperation('simulator', {
                    progress: Math.round((next / MAX_EXCHANGES) * 100),
                    status: `Wymiana ${next}/${MAX_EXCHANGES}`,
                  });
                  return next;
                });
              }
            } else if (event.type === 'meta' && event.styleNotes) {
              if (mountedRef.current) setStyleNotes(event.styleNotes);
            } else if (event.type === 'error') {
              throw new Error(event.error ?? 'Nieznany błąd symulacji');
            }
          } catch (parseError) {
            if (parseError instanceof SyntaxError) continue;
            throw parseError;
          }
        }
      }
    } catch (err) {
      await reader?.cancel();
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mountedRef.current) {
        setIsTyping(false);
        setExchangeCount((current) => {
          if (current >= MAX_EXCHANGES) {
            setPhase('summary');
            stopOperation('simulator');
          }
          return current;
        });
      }
      controllerRef.current = null;
    }
  }, [inputText, isTyping, exchangeCount, messages, conversation, quantitative, qualitative, targetPerson, participants, updateOperation, stopOperation]);

  // ── Reset handler ─────────────────────────────────────────

  const handleReset = useCallback(() => {
    controllerRef.current?.abort();
    stopOperation('simulator');
    setPhase('select');
    setTargetPerson('');
    setMessages([]);
    setInputText('');
    setExchangeCount(0);
    setError(null);
    setStyleNotes('');
    setIsTyping(false);
    setShowShareCard(false);
  }, [stopOperation]);

  // ── Key handler ───────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ================================================================
  // RENDER: Person select
  // ================================================================

  if (phase === 'select') {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-6 py-8">
          {/* Section label */}
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
              SYMULATOR ODPOWIEDZI
            </span>
            <h3 className="font-mono text-base font-semibold tracking-tight">
              Wybierz cel symulacji
            </h3>
            <p className="max-w-sm text-xs text-muted-foreground/60">
              AI wciela się w styl pisania wybranej osoby. {participants.length} uczestników.
              Wymaga min. {MIN_MESSAGES_REQUIRED} wiadomości do nauki wzorców.
            </p>
          </div>

          <div className="flex w-full flex-col gap-1.5">
            {participants.map((name) => {
              const metrics = quantitative.perPerson[name];
              const timing = quantitative.timing.perPerson[name];
              const messageCount = metrics?.totalMessages ?? 0;
              const avgLen = metrics?.averageMessageLength ?? 0;
              const hasEnoughMessages = messageCount >= MIN_MESSAGES_REQUIRED;

              return (
                <button
                  key={name}
                  onClick={() => hasEnoughMessages && handleSelectPerson(name)}
                  disabled={!hasEnoughMessages}
                  className={cn(
                    'group flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all',
                    hasEnoughMessages
                      ? 'border-border hover:border-[#3B82F6]/30 hover:bg-[#3B82F6]/5 cursor-pointer'
                      : 'border-border/30 opacity-40 cursor-not-allowed',
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{name}</span>
                    <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground/60">
                      <span>{messageCount.toLocaleString('pl-PL')} msg</span>
                      {timing && (
                        <span>mediana: {formatResponseTime(timing.medianResponseTimeMs)}</span>
                      )}
                      <span>avg: {avgLen.toFixed(1)} slow/msg</span>
                    </div>
                    {!hasEnoughMessages && (
                      <span className="font-mono text-[10px] text-[#EF4444]/70">
                        min. {MIN_MESSAGES_REQUIRED} wiadomości
                      </span>
                    )}
                  </div>
                  {hasEnoughMessages && (
                    <ChevronRight className="size-4 text-muted-foreground/20 transition-colors group-hover:text-[#3B82F6]" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ================================================================
  // RENDER: Summary
  // ================================================================

  if (phase === 'summary') {
    const exchanges: SimulatorExchange[] = messages.map((m) => ({
      role: m.role,
      message: m.message,
    }));

    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-6 py-8">
          {/* Section label */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
              SYMULACJA ZAKONCZONA
            </span>
            <span className="font-mono text-xs text-muted-foreground/40">
              {exchangeCount} wymian | AI-{targetPerson} | {targetTotalMessages.toLocaleString('pl-PL')} wiadomości bazowych
            </span>
          </div>

          {/* KPI: Confidence — data is the hero */}
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                'font-mono text-5xl font-bold tracking-tight',
                averageConfidence >= 70
                  ? 'text-[#10B981]'
                  : averageConfidence >= 40
                    ? 'text-[#F59E0B]'
                    : 'text-[#EF4444]',
              )}
            >
              {averageConfidence}%
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
              pewność symulacji
            </span>
          </div>

          {/* Confidence bar */}
          <div className="w-full max-w-xs">
            <div className="h-1 w-full overflow-hidden rounded-full bg-border/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${averageConfidence}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={cn(
                  'h-full rounded-full',
                  averageConfidence >= 70
                    ? 'bg-[#10B981]'
                    : averageConfidence >= 40
                      ? 'bg-[#F59E0B]'
                      : 'bg-[#EF4444]',
                )}
              />
            </div>
          </div>

          {styleNotes && (
            <p className="max-w-sm text-center text-xs text-muted-foreground/40 italic">
              {styleNotes}
            </p>
          )}

          {/* Share card toggle */}
          <div className="flex w-full flex-col items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareCard((v) => !v)}
              className="gap-2 border-border text-xs"
            >
              <Share2 className="size-3" />
              {showShareCard ? 'Ukryj kartę' : 'Share card'}
            </Button>

            <AnimatePresence>
              {showShareCard && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="w-full overflow-hidden"
                >
                  <SimulatorCard
                    cardRef={shareCardRef}
                    exchanges={exchanges}
                    targetPerson={targetPerson}
                    confidence={averageConfidence}
                    totalMessages={targetTotalMessages}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Discord send */}
          {conversation?.metadata?.discordChannelId && (
            <DiscordSendButton
              channelId={conversation.metadata.discordChannelId}
              payload={{
                type: 'simulator',
                simulator: {
                  targetPerson,
                  exchanges: messages.map(m => ({
                    role: m.role,
                    message: m.message,
                    confidence: m.confidence,
                  })),
                  averageConfidence,
                  styleNotes: styleNotes || undefined,
                },
              }}
            />
          )}

          {/* Actions */}
          <Button onClick={handleReset} variant="outline" size="sm" className="gap-2 border-border text-xs">
            <RotateCcw className="size-3" />
            Nowa symulacja
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ================================================================
  // RENDER: Chat interface
  // ================================================================

  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col p-0">
        {/* Chat header — data-dense bar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{targetPerson}</span>
                <span className="font-mono text-[9px] text-muted-foreground/30">
                  {isTyping ? 'pisze...' : 'symulacja'}
                </span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground/40">
                {targetTotalMessages.toLocaleString('pl-PL')} msg | mediana: {formatResponseTime(medianResponseTimeMs)} | avg: {(targetMetrics?.averageMessageLength ?? 0).toFixed(1)} slow/msg
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {exchangeCount}/{MAX_EXCHANGES}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleCancel();
                handleReset();
              }}
              className="size-7 p-0 text-muted-foreground hover:text-[#EF4444]"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Chat messages area */}
        <div
          className="flex flex-col gap-3 overflow-y-auto p-4"
          style={{ minHeight: 300, maxHeight: 460 }}
        >
          {/* Welcome — data-first empty state */}
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8">
              <span className="font-mono text-xs text-muted-foreground/40">
                Napisz coś. AI-{targetPerson} odpowie.
              </span>
              <span className="font-mono text-[10px] text-muted-foreground/20">
                mediana odpowiedzi z danych: {formatResponseTime(medianResponseTimeMs)}
              </span>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'target' && (
                  <span className="mb-0.5 pl-3 font-mono text-[9px] text-muted-foreground/30">
                    {targetPerson}
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2',
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-[#3B82F6] text-white'
                      : 'rounded-bl-sm border border-border bg-card',
                  )}
                >
                  <span className="text-sm leading-relaxed">{msg.message}</span>
                </div>
                {msg.role === 'target' && msg.confidence !== undefined && (
                  <span className="mt-0.5 pl-3 font-mono text-[9px] text-muted-foreground/25">
                    ~{formatResponseTime(medianResponseTimeMs)} | {msg.confidence}% pewności
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <TypingIndicator name={targetPerson} />
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 border-t border-[#EF4444]/20 bg-[#EF4444]/5 px-4 py-2">
            <AlertCircle className="size-3.5 text-[#EF4444]" />
            <span className="font-mono text-xs text-[#EF4444]">{error}</span>
          </div>
        )}

        {/* Input area */}
        {exchangeCount < MAX_EXCHANGES ? (
          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) =>
                setInputText(e.target.value.slice(0, MAX_MESSAGE_LENGTH))
              }
              onKeyDown={handleKeyDown}
              placeholder={`Wiadomość do ${targetPerson}...`}
              disabled={isTyping}
              className={cn(
                'flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground/25 focus:border-[#3B82F6]/30 focus:outline-none',
                'disabled:opacity-40',
              )}
              maxLength={MAX_MESSAGE_LENGTH}
            />
            <div className="flex flex-col items-end gap-0.5">
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!inputText.trim() || isTyping}
                className="size-9 rounded-lg bg-[#3B82F6] p-0 hover:bg-[#3B82F6]/80"
              >
                <Send className="size-4" />
              </Button>
              {inputText.length > 0 && (
                <span className="font-mono text-[8px] text-muted-foreground/20">
                  {inputText.length}/{MAX_MESSAGE_LENGTH}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center border-t border-border p-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPhase('summary')}
              className="gap-2 border-border text-xs"
            >
              Podsumowanie
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
