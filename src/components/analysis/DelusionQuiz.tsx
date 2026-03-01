'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  buildQuestions,
  computeDelusionResult,
} from '@/lib/analysis/delusion-quiz';
import type {
  DelusionQuestion,
  DelusionQuizResult,
} from '@/lib/analysis/delusion-quiz';
import type { QuantitativeAnalysis, ParsedConversation } from '@/lib/parsers/types';
import { trackEvent } from '@/lib/analytics/events';
import PsychDisclaimer from '@/components/shared/PsychDisclaimer';

// ============================================================
// Props
// ============================================================

interface DelusionQuizProps {
  quantitative: QuantitativeAnalysis;
  conversation: ParsedConversation;
  onComplete: (result: DelusionQuizResult) => void;
}

// ============================================================
// Sub-components
// ============================================================

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center gap-6 rounded-xl border border-border bg-card p-8 text-center"
    >
      <div className="font-mono text-5xl leading-none tracking-tight text-foreground">
        ?!
      </div>
      <div>
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-foreground">
          STAWIAM ZAKŁAD
        </h2>
        <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-text-tertiary">
          QUIZ SAMOŚWIADOMOŚCI
        </p>
      </div>
      <p className="max-w-sm text-sm text-text-secondary">
        15 pytań. Twoje odpowiedzi vs twarde dane z analizy.
        Na końcu: Indeks Samoświadomości 0-100.
      </p>
      <button
        onClick={onStart}
        className="rounded-lg border border-blue-500/30 bg-blue-600/10 px-8 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-blue-400 transition-all hover:border-blue-500/50 hover:bg-blue-600/20"
      >
        START
      </button>
    </motion.div>
  );
}

function QuestionCard({
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
          {String(questionIndex + 1).padStart(2, '0')}/{String(totalQuestions).padStart(2, '0')}
        </span>
        <div className="flex gap-[3px]">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`h-[3px] w-3 rounded-sm transition-colors ${
                i <= questionIndex ? 'bg-blue-500' : 'bg-border'
              }`}
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
            className="rounded-lg border border-border bg-background px-4 py-3 text-left font-mono text-sm text-foreground transition-all hover:border-blue-500/40 hover:bg-card-hover active:scale-[0.98]"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function RevealCard({
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
  const userLabel = question.options.find((o) => o.value === userAnswer)?.label ?? userAnswer;
  const correctLabel = question.options.find((o) => o.value === correctAnswer)?.label ?? correctAnswer;

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
          className={`flex h-8 w-8 items-center justify-center rounded font-mono text-sm font-bold ${
            isCorrect
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {isCorrect ? '+1' : '0'}
        </motion.div>
        <span className={`font-mono text-sm font-bold uppercase tracking-wider ${
          isCorrect ? 'text-emerald-400' : 'text-red-400'
        }`}>
          {isCorrect ? 'TRAFIONE' : 'PUDŁO'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs text-text-tertiary">
          Twoja odpowiedź:{' '}
          <span className={isCorrect ? 'text-emerald-400' : 'text-red-400'}>{userLabel}</span>
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
        {isLast ? 'WYNIKI' : 'DALEJ'}
      </button>
    </motion.div>
  );
}

function ResultsScreen({
  result,
  questions,
}: {
  result: DelusionQuizResult;
  questions: DelusionQuestion[];
}) {
  const { delusionIndex, label, score, answers } = result;

  const labelColor =
    delusionIndex <= 20 ? '#10b981' :
    delusionIndex <= 40 ? '#3b82f6' :
    delusionIndex <= 60 ? '#eab308' :
    delusionIndex <= 80 ? '#f97316' :
    '#ef4444';

  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - delusionIndex / 100);

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  const verdict =
    delusionIndex <= 20 ? 'Widzisz rzeczywistość taką jaka jest.' :
    delusionIndex <= 40 ? 'Przyzwoita samoświadomość. Mogło być gorzej.' :
    delusionIndex <= 60 ? 'Połowa odpowiedzi to konfabulacja. Ciekawe.' :
    delusionIndex <= 80 ? 'Twoja wersja tej rozmowy istnieje w alternatywnym wymiarze.' :
    'Dane mówią co innego niż myślisz. Dosłownie we wszystkim.';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-6 rounded-xl border border-border bg-card p-6"
    >
      <div className="text-center">
        <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-text-tertiary">
          INDEKS SAMOŚWIADOMOŚCI
        </h2>
      </div>

      {/* Circular gauge */}
      <div className="flex justify-center">
        <div className="relative w-[min(190px,70vw)] aspect-square">
          <svg viewBox="0 0 190 190" className="h-full w-full">
            <circle cx={95} cy={95} r={r} fill="none" stroke="#1a1a1a" strokeWidth={10} />
            <motion.circle
              cx={95}
              cy={95}
              r={r}
              fill="none"
              stroke={labelColor}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              transform="rotate(-90 95 95)"
              style={{ filter: `drop-shadow(0 0 8px ${labelColor}40)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.5 }}
              className="font-mono text-5xl font-black"
              style={{ color: labelColor, textShadow: `0 0 30px ${labelColor}33` }}
            >
              {delusionIndex}
            </motion.span>
            <span className="font-mono text-xs text-text-tertiary">/ 100</span>
          </div>
        </div>
      </div>

      {/* Label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <span
          className="rounded px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider"
          style={{ color: labelColor, background: `${labelColor}15`, border: `1px solid ${labelColor}30` }}
        >
          {label}
        </span>
      </motion.div>

      {/* Verdict */}
      <p className="text-center text-sm text-text-secondary">
        {verdict}
      </p>

      <PsychDisclaimer
        text="Indeks Samoświadomości to metryka rozrywkowa porównująca subiektywną samoocenę z danymi ilościowymi. Różnice w postrzeganiu są naturalne i nie świadczą o zaburzeniach."
        showGenericFooter
      />

      {/* Score */}
      <div className="flex items-baseline justify-center gap-2">
        <span className="font-mono text-2xl font-bold text-foreground">{score}</span>
        <span className="font-mono text-sm text-text-tertiary">/ 15</span>
      </div>

      {/* Answer list */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-tertiary">
          ODPOWIEDZI
        </span>
        {answers.map((a) => {
          const q = questionMap.get(a.questionId);
          return (
            <div
              key={a.questionId}
              className={`flex items-start gap-3 rounded-lg border bg-background p-3 ${
                a.isCorrect ? 'border-emerald-500/20' : 'border-red-500/15'
              }`}
            >
              <span className={`mt-0.5 flex-shrink-0 font-mono text-[0.65rem] font-bold ${
                a.isCorrect ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {a.isCorrect ? '+1' : ' 0'}
              </span>
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium text-foreground">
                  {q?.question ?? a.questionId}
                </p>
                <p className="mt-0.5 font-mono text-[0.65rem] text-text-tertiary">{a.revealText}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================
// Main Component
// ============================================================

type QuizState = 'intro' | 'quiz' | 'reveal' | 'results';

export default function DelusionQuiz({
  quantitative,
  conversation,
  onComplete,
}: DelusionQuizProps) {
  const [state, setState] = useState<QuizState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Array<{ questionId: string; userAnswer: string }>>([]);
  const [currentReveal, setCurrentReveal] = useState<{
    userAnswer: string;
    correctAnswer: string;
    revealText: string;
    isCorrect: boolean;
  } | null>(null);
  const [result, setResult] = useState<DelusionQuizResult | null>(null);

  const questions = buildQuestions(conversation);

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
      const revealText = question.getRevealText(correctAnswer, value, quantitative, conversation);

      setUserAnswers((prev) => [...prev, { questionId: question.id, userAnswer: value }]);
      setCurrentReveal({ userAnswer: value, correctAnswer, revealText, isCorrect });
      setState('reveal');
    },
    [currentIndex, questions, quantitative, conversation],
  );

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      const allAnswers = userAnswers;
      const computed = computeDelusionResult(allAnswers, quantitative, conversation);
      setResult(computed);
      setState('results');
      trackEvent({
        name: 'analysis_complete',
        params: { mode: 'standard', passCount: computed.score },
      });
      onComplete(computed);
    } else {
      setCurrentIndex(nextIndex);
      setCurrentReveal(null);
      setState('quiz');
    }
  }, [currentIndex, questions.length, userAnswers, quantitative, conversation, onComplete]);

  return (
    <div className="mx-auto w-full max-w-md">
      <AnimatePresence mode="wait">
        {state === 'intro' && <IntroScreen key="intro" onStart={handleStart} />}

        {state === 'quiz' && questions[currentIndex] && (
          <QuestionCard
            key={`q-${currentIndex}`}
            question={questions[currentIndex]}
            questionIndex={currentIndex}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
          />
        )}

        {state === 'reveal' && currentReveal && questions[currentIndex] && (
          <RevealCard
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

        {state === 'results' && result && (
          <ResultsScreen key="results" result={result} questions={questions} />
        )}
      </AnimatePresence>
    </div>
  );
}
