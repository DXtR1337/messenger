'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  encodeCoupleSession,
  computeCoupleComparison,
  getComparisonVerdict,
} from '@/lib/analysis/couple-quiz';
import type {
  CoupleSessionData,
  CoupleQuizComparison,
  CoupleQuizPerQuestion,
} from '@/lib/analysis/couple-quiz';
import {
  buildQuestions,
  computeDelusionResult,
} from '@/lib/analysis/delusion-quiz';
import type { DelusionQuestion } from '@/lib/analysis/delusion-quiz';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';
import { trackEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/utils';

// ============================================================
// Constants
// ============================================================

const COLOR_A = '#3b82f6';
const COLOR_B = '#a855f7';

// ============================================================
// Props
// ============================================================

interface ChallengeProps {
  mode: 'challenge';
  analysisId: string;
  personAName: string;
  personAAnswers: Array<{ questionId: string; userAnswer: string }>;
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
}

interface RespondProps {
  mode: 'respond';
  sessionData: CoupleSessionData;
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
  participants: string[];
}

type CoupleQuizProps = ChallengeProps | RespondProps;

// ============================================================
// SVG Gauge Ring
// ============================================================

function GaugeRing({
  value,
  label,
  name,
  color,
  delay = 0,
}: {
  value: number;
  label: string;
  name: string;
  color: string;
  delay?: number;
}) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="font-mono text-xs font-bold uppercase tracking-wider"
        style={{ color }}
      >
        {name}
      </span>
      <div className="relative aspect-square w-[140px]">
        <svg viewBox="0 0 150 150" className="h-full w-full">
          <circle
            cx={75}
            cy={75}
            r={r}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={8}
          />
          <motion.circle
            cx={75}
            cy={75}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut', delay }}
            transform="rotate(-90 75 75)"
            style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, delay: delay + 0.4 }}
            className="font-mono text-3xl font-black"
            style={{ color, textShadow: `0 0 24px ${color}33` }}
          >
            {value}
          </motion.span>
          <span className="font-mono text-[0.6rem] text-text-tertiary">/ 100</span>
        </div>
      </div>
      <span
        className="rounded px-3 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-wider"
        style={{
          color,
          background: `${color}12`,
          border: `1px solid ${color}25`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ============================================================
// Per-Question Row
// ============================================================

function QuestionRow({
  item,
  index,
  nameA,
  nameB,
}: {
  item: CoupleQuizPerQuestion;
  index: number;
  nameA: string;
  nameB: string;
}) {
  const labelCorrect =
    item.correctAnswer.length > 20
      ? item.correctAnswer.slice(0, 18) + '...'
      : item.correctAnswer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left"
    >
      <p className="min-w-0 truncate font-mono text-[0.65rem] text-text-secondary">
        {item.questionText}
      </p>

      {/* Person A answer */}
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded font-mono text-[0.6rem] font-bold',
          item.aCorrect
            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border border-red-500/30 bg-red-500/10 text-red-400',
        )}
        title={`${nameA}: ${item.answerA}`}
      >
        {item.aCorrect ? '✓' : '✗'}
      </span>

      {/* Person B answer */}
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded font-mono text-[0.6rem] font-bold',
          item.bCorrect
            ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : 'border border-red-500/30 bg-red-500/10 text-red-400',
        )}
        title={`${nameB}: ${item.answerB}`}
      >
        {item.bCorrect ? '✓' : '✗'}
      </span>

      {/* Correct answer */}
      <span
        className="font-mono text-[0.6rem] text-text-tertiary"
        title={item.correctAnswer}
      >
        {labelCorrect}
      </span>
    </motion.div>
  );
}

// ============================================================
// Flow A: Challenge Screen
// ============================================================

function ChallengeScreen({
  analysisId,
  personAName,
  personAAnswers,
  quantitative,
  conversation,
}: Omit<ChallengeProps, 'mode'>) {
  const [copied, setCopied] = useState(false);

  const personAResult = useMemo(
    () => computeDelusionResult(personAAnswers, quantitative, conversation),
    [personAAnswers, quantitative, conversation],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const session: CoupleSessionData = {
      analysisId,
      personAName,
      answers: personAAnswers,
    };
    const encoded = encodeCoupleSession(session);
    return `${window.location.origin}/analysis/${analysisId}?couple=${encoded}`;
  }, [analysisId, personAName, personAAnswers]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed silently
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'PodTeksT — Couple Quiz',
          text: `${personAName} wyzwa Cię na Quiz Samoświadomości! Sprawdź, kto lepiej zna waszą rozmowę.`,
          url: shareUrl,
        });
        trackEvent({ name: 'share_card_share', params: { cardType: 'couple-quiz', method: 'native' } });
      } catch {
        // User cancelled share
      }
    } else {
      await handleCopy();
      trackEvent({ name: 'share_card_share', params: { cardType: 'couple-quiz', method: 'clipboard' } });
    }
  }, [shareUrl, personAName, handleCopy]);

  const labelColor =
    personAResult.delusionIndex <= 20 ? '#10b981'
    : personAResult.delusionIndex <= 40 ? '#3b82f6'
    : personAResult.delusionIndex <= 60 ? '#eab308'
    : personAResult.delusionIndex <= 80 ? '#f97316'
    : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-lg font-bold text-foreground">
          Wyzwij drugą osobę
        </h2>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-text-tertiary">
          COUPLE QUIZ — PORÓWNANIE SAMOŚWIADOMOŚCI
        </p>
      </div>

      {/* Person A summary */}
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background p-4">
        <span className="font-mono text-xs text-text-tertiary">Twój wynik</span>
        <div className="flex items-baseline gap-2">
          <span
            className="font-mono text-3xl font-black"
            style={{ color: COLOR_A }}
          >
            {personAResult.delusionIndex}
          </span>
          <span className="font-mono text-xs text-text-tertiary">/ 100</span>
        </div>
        <span
          className="rounded px-3 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-wider"
          style={{
            color: labelColor,
            background: `${labelColor}15`,
            border: `1px solid ${labelColor}30`,
          }}
        >
          {personAResult.label}
        </span>
        <span className="font-mono text-xs text-text-secondary">
          {personAResult.score} / {personAResult.answers.length} trafień
        </span>
      </div>

      {/* Instructions */}
      <p className="text-center text-sm text-text-secondary">
        Wyślij link drugiej osobie. Po wypełnieniu quizu zobaczycie
        porównanie wyników — kto lepiej zna waszą rozmowę.
      </p>

      {/* URL preview */}
      <div className="overflow-hidden rounded-lg border border-border bg-background px-3 py-2">
        <p className="truncate font-mono text-[0.6rem] text-text-tertiary">
          {shareUrl}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className={cn(
            'flex-1 rounded-lg border px-4 py-3 font-mono text-sm font-semibold uppercase tracking-wider transition-all',
            copied
              ? 'border-emerald-500/30 bg-emerald-600/10 text-emerald-400'
              : 'border-blue-500/30 bg-blue-600/10 text-blue-400 hover:border-blue-500/50 hover:bg-blue-600/20',
          )}
        >
          {copied ? 'SKOPIOWANO' : 'KOPIUJ LINK'}
        </button>

        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            onClick={handleShare}
            className="flex-1 rounded-lg border border-purple-500/30 bg-purple-600/10 px-4 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-purple-400 transition-all hover:border-purple-500/50 hover:bg-purple-600/20"
          >
            UDOSTĘPNIJ
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Flow B: Respond — Quiz taking + Comparison
// ============================================================

type RespondState = 'intro' | 'quiz' | 'reveal' | 'computing' | 'results';

function RespondFlow({
  sessionData,
  quantitative,
  conversation,
  participants,
}: Omit<RespondProps, 'mode'>) {
  const [state, setState] = useState<RespondState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<
    Array<{ questionId: string; userAnswer: string }>
  >([]);
  const [currentReveal, setCurrentReveal] = useState<{
    userAnswer: string;
    correctAnswer: string;
    revealText: string;
    isCorrect: boolean;
  } | null>(null);
  const [comparison, setComparison] = useState<CoupleQuizComparison | null>(null);

  const questions = useMemo(() => buildQuestions(conversation), [conversation]);

  // Determine Person B name: the participant who is NOT Person A
  const personBName = useMemo(() => {
    const other = participants.find((p) => p !== sessionData.personAName);
    return other ?? participants[1] ?? 'Osoba B';
  }, [participants, sessionData.personAName]);

  const handleStart = useCallback(() => {
    trackEvent({ name: 'analysis_start', params: { mode: 'standard' } });
    setState('quiz');
  }, []);

  const handleAnswer = useCallback(
    (value: string) => {
      const question = questions[currentIndex];
      if (!question) return;

      const correctAnswer = question.getCorrectAnswer(quantitative, conversation);
      const isCorrect = value === correctAnswer;
      const revealText = question.getRevealText(
        correctAnswer,
        value,
        quantitative,
        conversation,
      );

      setUserAnswers((prev) => [
        ...prev,
        { questionId: question.id, userAnswer: value },
      ]);
      setCurrentReveal({ userAnswer: value, correctAnswer, revealText, isCorrect });
      setState('reveal');
    },
    [currentIndex, questions, quantitative, conversation],
  );

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setState('computing');

      // Small delay for visual feedback before computing
      setTimeout(() => {
        const result = computeCoupleComparison(
          sessionData.answers,
          userAnswers,
          sessionData.personAName,
          personBName,
          quantitative,
          conversation,
        );
        setComparison(result);
        setState('results');
        trackEvent({
          name: 'analysis_complete',
          params: { mode: 'standard', passCount: result.personB.result.score },
        });
      }, 600);
    } else {
      setCurrentIndex(nextIndex);
      setCurrentReveal(null);
      setState('quiz');
    }
  }, [
    currentIndex,
    questions.length,
    userAnswers,
    sessionData,
    personBName,
    quantitative,
    conversation,
  ]);

  return (
    <div className="mx-auto w-full max-w-lg">
      <AnimatePresence mode="wait">
        {/* Intro */}
        {state === 'intro' && (
          <RespondIntro
            key="intro"
            personAName={sessionData.personAName}
            personBName={personBName}
            onStart={handleStart}
          />
        )}

        {/* Quiz */}
        {state === 'quiz' && questions[currentIndex] && (
          <QuizQuestionCard
            key={`q-${currentIndex}`}
            question={questions[currentIndex]}
            questionIndex={currentIndex}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
          />
        )}

        {/* Reveal */}
        {state === 'reveal' && currentReveal && questions[currentIndex] && (
          <QuizRevealCard
            key={`r-${currentIndex}`}
            question={questions[currentIndex]}
            userAnswer={currentReveal.userAnswer}
            correctAnswer={currentReveal.correctAnswer}
            revealText={currentReveal.revealText}
            isCorrect={currentReveal.isCorrect}
            onNext={handleNext}
            isLast={currentIndex === questions.length - 1}
          />
        )}

        {/* Computing */}
        {state === 'computing' && (
          <motion.div
            key="computing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="h-8 w-8 rounded-full border-2 border-border border-t-blue-500"
            />
            <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
              PORÓWNYWANIE WYNIKÓW...
            </span>
          </motion.div>
        )}

        {/* Results */}
        {state === 'results' && comparison && (
          <ComparisonResults key="results" comparison={comparison} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Respond: Intro Screen
// ============================================================

function RespondIntro({
  personAName,
  personBName,
  onStart,
}: {
  personAName: string;
  personBName: string;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center gap-6 rounded-xl border border-border bg-card p-8 text-center"
    >
      <div className="font-mono text-4xl leading-none tracking-tight text-foreground">
        VS
      </div>
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">
          Couple Quiz
        </h2>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-text-tertiary">
          QUIZ SAMOŚWIADOMOŚCI — WERSJA DLA PAR
        </p>
      </div>
      <p className="max-w-sm text-sm text-text-secondary">
        <span style={{ color: COLOR_A }} className="font-semibold">
          {personAName}
        </span>{' '}
        już wypełnił(a) quiz. Teraz Twoja kolej,{' '}
        <span style={{ color: COLOR_B }} className="font-semibold">
          {personBName}
        </span>
        . 15 pytań o waszą rozmowę. Na końcu: kto widzi
        relację wyraźniej.
      </p>
      <button
        onClick={onStart}
        className="rounded-lg border border-purple-500/30 bg-purple-600/10 px-8 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-purple-400 transition-all hover:border-purple-500/50 hover:bg-purple-600/20"
      >
        ZACZYNAMY
      </button>
    </motion.div>
  );
}

// ============================================================
// Respond: Question Card (reused from DelusionQuiz style)
// ============================================================

function QuizQuestionCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
}: {
  question: DelusionQuestion;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (value: string) => void;
}) {
  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          {String(questionIndex + 1).padStart(2, '0')}/
          {String(totalQuestions).padStart(2, '0')}
        </span>
        <div className="flex gap-[3px]">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-[3px] w-3 rounded-sm transition-colors',
                i <= questionIndex ? 'bg-purple-500' : 'bg-border',
              )}
            />
          ))}
        </div>
      </div>

      <h3 className="font-mono text-base font-semibold text-foreground">
        {question.question}
      </h3>

      <div className="flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onAnswer(opt.value)}
            className="rounded-lg border border-border bg-background px-4 py-3 text-left font-mono text-sm text-foreground transition-all hover:border-purple-500/40 hover:bg-card-hover active:scale-[0.98]"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================
// Respond: Reveal Card
// ============================================================

function QuizRevealCard({
  question,
  userAnswer,
  correctAnswer,
  revealText,
  isCorrect,
  onNext,
  isLast,
}: {
  question: DelusionQuestion;
  userAnswer: string;
  correctAnswer: string;
  revealText: string;
  isCorrect: boolean;
  onNext: () => void;
  isLast: boolean;
}) {
  const userLabel =
    question.options.find((o) => o.value === userAnswer)?.label ?? userAnswer;
  const correctLabel =
    question.options.find((o) => o.value === correctAnswer)?.label ?? correctAnswer;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded font-mono text-sm font-bold',
            isCorrect
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border border-red-500/30 bg-red-500/10 text-red-400',
          )}
        >
          {isCorrect ? '+1' : '0'}
        </motion.div>
        <span
          className={cn(
            'font-mono text-sm font-bold uppercase tracking-wider',
            isCorrect ? 'text-emerald-400' : 'text-red-400',
          )}
        >
          {isCorrect ? 'TRAFIONE' : 'PUDŁO'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs text-text-tertiary">
          Twoja odpowiedź:{' '}
          <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>
            {userLabel}
          </span>
        </p>
        {!isCorrect && (
          <p className="font-mono text-xs text-text-tertiary">
            Prawidłowa:{' '}
            <span className="text-emerald-400">{correctLabel}</span>
          </p>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-background px-4 py-3 font-mono text-xs leading-relaxed text-text-secondary"
      >
        {revealText}
      </motion.div>

      <button
        onClick={onNext}
        className="self-end rounded-lg border border-border bg-card-hover px-5 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-foreground transition-colors hover:border-border-hover"
      >
        {isLast ? 'PORÓWNANIE' : 'DALEJ'}
      </button>
    </motion.div>
  );
}

// ============================================================
// Comparison Results
// ============================================================

function ComparisonResults({
  comparison,
}: {
  comparison: CoupleQuizComparison;
}) {
  const { personA, personB, perQuestion, awarenessWinner, delusionGap, agreementRate, bothWrongCount } =
    comparison;
  const verdict = getComparisonVerdict(comparison);

  const winnerName =
    awarenessWinner === 'tie' ? null : awarenessWinner;
  const winnerColor =
    awarenessWinner === personA.name
      ? COLOR_A
      : awarenessWinner === personB.name
        ? COLOR_B
        : '#eab308';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-lg font-bold text-foreground">
          Wyniki Couple Quiz
        </h2>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-text-tertiary">
          DELUSION INDEX — PORÓWNANIE
        </p>
      </div>

      {/* Gauge rings side by side */}
      <div className="flex items-start justify-center gap-6">
        <GaugeRing
          value={personA.result.delusionIndex}
          label={personA.result.label}
          name={personA.name}
          color={COLOR_A}
          delay={0}
        />
        <div className="mt-14 font-mono text-lg font-bold text-text-tertiary">
          vs
        </div>
        <GaugeRing
          value={personB.result.delusionIndex}
          label={personB.result.label}
          name={personB.name}
          color={COLOR_B}
          delay={0.3}
        />
      </div>

      {/* Awareness Winner Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0, type: 'spring', stiffness: 300 }}
        className="rounded-lg border px-4 py-3 text-center"
        style={{
          borderColor: `${winnerColor}30`,
          background: `${winnerColor}08`,
        }}
      >
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.15em] text-text-tertiary">
          AWARENESS WINNER
        </span>
        <p
          className="mt-1 font-display text-xl font-bold"
          style={{ color: winnerColor }}
        >
          {winnerName ?? 'REMIS'}
        </p>
        {winnerName && (
          <p className="mt-0.5 font-mono text-[0.6rem] text-text-tertiary">
            niższy Delusion Index = lepszy wgląd w relację
          </p>
        )}
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="grid grid-cols-3 gap-3"
      >
        <StatCell
          label="Zgodność"
          value={`${Math.round(agreementRate * 100)}%`}
          sublabel="te same odpowiedzi"
        />
        <StatCell
          label="Oboje źle"
          value={String(bothWrongCount)}
          sublabel="pytań"
        />
        <StatCell
          label="Delusion Gap"
          value={String(delusionGap)}
          sublabel="punktów różnicy"
        />
      </motion.div>

      {/* Verdict */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="rounded-lg border border-border bg-background px-4 py-3 text-center"
      >
        <p className="text-sm font-medium text-text-secondary">{verdict}</p>
      </motion.div>

      {/* Per-question table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
        className="flex flex-col gap-1.5"
      >
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-3 py-1">
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-text-tertiary">
            Pytanie
          </span>
          <span
            className="w-6 text-center font-mono text-[0.55rem] font-bold uppercase"
            style={{ color: COLOR_A }}
          >
            A
          </span>
          <span
            className="w-6 text-center font-mono text-[0.55rem] font-bold uppercase"
            style={{ color: COLOR_B }}
          >
            B
          </span>
          <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-text-tertiary">
            Odp.
          </span>
        </div>

        {perQuestion.map((item, i) => (
          <QuestionRow
            key={item.questionId}
            item={item}
            index={i}
            nameA={personA.name}
            nameB={personB.name}
          />
        ))}
      </motion.div>

      {/* Score summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
        className="flex justify-center gap-8"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-xs" style={{ color: COLOR_A }}>
            {personA.name}
          </span>
          <span className="font-mono text-2xl font-bold text-foreground">
            {personA.result.score}
          </span>
          <span className="font-mono text-[0.6rem] text-text-tertiary">
            / {personA.result.answers.length}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-xs" style={{ color: COLOR_B }}>
            {personB.name}
          </span>
          <span className="font-mono text-2xl font-bold text-foreground">
            {personB.result.score}
          </span>
          <span className="font-mono text-[0.6rem] text-text-tertiary">
            / {personB.result.answers.length}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Small stat cell
// ============================================================

function StatCell({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-background px-2 py-3">
      <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-text-tertiary">
        {label}
      </span>
      <span className="font-mono text-lg font-bold text-foreground">{value}</span>
      <span className="font-mono text-[0.5rem] text-text-tertiary">{sublabel}</span>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function CoupleQuiz(props: CoupleQuizProps) {
  if (props.mode === 'challenge') {
    return (
      <div className="mx-auto w-full max-w-md">
        <ChallengeScreen
          analysisId={props.analysisId}
          personAName={props.personAName}
          personAAnswers={props.personAAnswers}
          quantitative={props.quantitative}
          conversation={props.conversation}
        />
      </div>
    );
  }

  return (
    <RespondFlow
      sessionData={props.sessionData}
      quantitative={props.quantitative}
      conversation={props.conversation}
      participants={props.participants}
    />
  );
}
