'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalysis } from '@/lib/analysis/analysis-context';
import { useEksAnalysis } from '@/hooks/useEksAnalysis';
import type { EksResult } from '@/lib/analysis/eks-prompts';

// ── Quiz types ──────────────────────────────────────────────────

export interface EksQuizQuestion {
  id: string;
  question: string;
  type: 'choice' | 'slider';
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface EksQuizAnswer {
  questionId: string;
  answer: string | number;
}

/** Build quiz questions using participant names */
function buildQuizQuestions(participants: string[]): EksQuizQuestion[] {
  const [a, b] = participants.length >= 2
    ? [participants[0], participants[1]]
    : ['Osoba A', 'Osoba B'];

  return [
    {
      id: 'who-left',
      question: 'Kto odszedł pierwszy?',
      type: 'choice',
      options: [a, b],
    },
    {
      id: 'manner-of-death',
      question: 'Kto zabił ten związek?',
      type: 'choice',
      options: [`${a} (zabójstwo)`, `${b} (zabójstwo)`, 'Oboje (samobójstwo)', 'Nikt — umarł sam (naturalna)', 'Coś z zewnątrz (wypadek)'],
    },
    {
      id: 'preventable',
      question: 'Czy ten związek można było uratować?',
      type: 'choice',
      options: ['Tak, gdybyśmy chcieli', 'Nie, było za późno'],
    },
    {
      id: 'who-hurt-more',
      question: 'Kto skrzywdził bardziej?',
      type: 'choice',
      options: [a, b, 'Po równo'],
    },
    {
      id: 'golden-age',
      question: 'Kiedy było najlepiej?',
      type: 'choice',
      options: ['Na samym początku', 'Po kilku miesiącach', 'Gdzieś w środku', 'Pod koniec — tuż przed rozpadem'],
    },
    {
      id: 'comeback',
      question: 'Jakie jest prawdopodobieństwo, że wrócicie do siebie?',
      type: 'slider',
      min: 0,
      max: 100,
      unit: '%',
    },
    {
      id: 'last-words-tone',
      question: 'Jak wyglądały wasze ostatnie wiadomości?',
      type: 'choice',
      options: ['Dramatyczne pożegnanie', 'Cisza — po prostu przestaliśmy pisać', 'Banalnie — jakby nic się nie stało', 'Kłótnia bez zakończenia'],
    },
    {
      id: 'pattern',
      question: 'Jaki wzorzec powtórzysz w następnym związku?',
      type: 'choice',
      options: ['Zbyt szybkie przywiązywanie się', 'Unikanie trudnych rozmów', 'Nadmierne analizowanie', 'Wycofywanie się gdy jest za blisko'],
    },
  ];
}

/** Extract manner-of-death from quiz answer */
function extractMannerFromAnswer(answer: string): string {
  if (answer.includes('zabójstwo')) return 'homicide';
  if (answer.includes('samobójstwo')) return 'suicide';
  if (answer.includes('naturalna')) return 'natural';
  if (answer.includes('wypadek') || answer.includes('zewnątrz')) return 'accident';
  return 'undetermined';
}

const MANNER_LABEL_MAP: Record<string, string> = {
  natural: 'Śmierć naturalna',
  accident: 'Wypadek',
  homicide: 'Zabójstwo',
  suicide: 'Samobójstwo',
  undetermined: 'Nieustalone',
};

// ── Compare quiz answers with AI results ────────────────────────

export interface QuizComparison {
  questionId: string;
  question: string;
  userAnswer: string;
  aiAnswer: string;
  isMatch: boolean;
  isClose?: boolean; // for slider — within ±15
}

export function compareQuizWithResult(
  answers: EksQuizAnswer[],
  questions: EksQuizQuestion[],
  result: EksResult,
): QuizComparison[] {
  const comparisons: QuizComparison[] = [];

  for (const ans of answers) {
    const q = questions.find(qq => qq.id === ans.questionId);
    if (!q) continue;

    let aiAnswer = '—';
    let isMatch = false;
    let isClose: boolean | undefined;

    switch (ans.questionId) {
      case 'who-left':
        aiAnswer = result.whoLeftFirst?.name ?? '—';
        {
          const uL = String(ans.answer).toLowerCase();
          const aL = aiAnswer.toLowerCase();
          isMatch = uL === aL || aL.startsWith(uL) || aL.includes(uL) || uL.includes(aL);
        }
        break;

      case 'manner-of-death': {
        const aiManner = result.deathCertificate?.mannerOfDeath ?? 'undetermined';
        aiAnswer = MANNER_LABEL_MAP[aiManner] ?? aiManner;
        const userManner = extractMannerFromAnswer(String(ans.answer).toLowerCase());
        isMatch = userManner === aiManner;
        break;
      }

      case 'preventable': {
        const aiPrev = result.causeOfDeath?.wasItPreventable;
        aiAnswer = aiPrev ? 'Tak' : 'Nie';
        const userSaysTak = String(ans.answer).toLowerCase().includes('tak');
        isMatch = userSaysTak === !!aiPrev;
        break;
      }

      case 'who-hurt-more':
        aiAnswer = result.painSymmetry?.whoHurtMore ?? '—';
        {
          const userLower = String(ans.answer).toLowerCase();
          const aiLower = aiAnswer.toLowerCase();
          isMatch = userLower === aiLower
            || aiLower.startsWith(userLower)
            || aiLower.includes(userLower)
            || (userLower === 'po równo' && (aiLower.includes('równo') || aiLower.includes('oboje') || aiLower.includes('obydw')));
        }
        break;

      case 'golden-age': {
        // Compare user's guess about when it was best with AI's golden age period
        const ga = result.goldenAge;
        if (ga?.periodStart && ga?.periodEnd) {
          // Parse golden age months to determine position in relationship
          const phases = result.phases ?? [];
          const allMonths = phases.flatMap(p => [p.periodStart, p.periodEnd]).sort();
          const earliest = allMonths[0] ?? ga.periodStart;
          const latest = allMonths[allMonths.length - 1] ?? ga.periodEnd;

          // Determine golden age position
          const totalMonths = monthDiff(earliest, latest) || 1;
          const gaStart = monthDiff(earliest, ga.periodStart);
          const gaPosition = gaStart / totalMonths;

          let aiPosition: string;
          if (gaPosition < 0.15) aiPosition = 'Na samym początku';
          else if (gaPosition < 0.35) aiPosition = 'Po kilku miesiącach';
          else if (gaPosition < 0.75) aiPosition = 'Gdzieś w środku';
          else aiPosition = 'Pod koniec — tuż przed rozpadem';

          aiAnswer = `${aiPosition} (${ga.periodStart} – ${ga.periodEnd})`;
          isMatch = String(ans.answer) === aiPosition;
        }
        break;
      }

      case 'comeback': {
        const aiVal = result.postBreakupForecast?.willTheyComeBack ?? 0;
        aiAnswer = `${aiVal}%`;
        const userVal = typeof ans.answer === 'number' ? ans.answer : parseInt(String(ans.answer), 10);
        const diff = Math.abs(userVal - aiVal);
        isMatch = diff <= 10;
        isClose = diff <= 20 && diff > 10;
        break;
      }

      case 'last-words-tone': {
        // Analyze AI's last words to determine tone
        const lw = result.lastWords;
        if (lw?.analysis) {
          const analysis = lw.analysis.toLowerCase();
          const exchange = (lw.lastMeaningfulExchange ?? []).join(' ').toLowerCase();
          let aiTone: string;
          if (analysis.includes('cisz') || analysis.includes('milcz') || analysis.includes('brak odpowiedzi') || exchange.length < 50) {
            aiTone = 'Cisza — po prostu przestaliśmy pisać';
          } else if (analysis.includes('kłótni') || analysis.includes('oskarż') || analysis.includes('złoś') || analysis.includes('pretensj')) {
            aiTone = 'Kłótnia bez zakończenia';
          } else if (analysis.includes('pożegnan') || analysis.includes('żegnaj') || analysis.includes('koniec')) {
            aiTone = 'Dramatyczne pożegnanie';
          } else {
            aiTone = 'Banalnie — jakby nic się nie stało';
          }
          aiAnswer = aiTone;
          isMatch = String(ans.answer) === aiTone;
        }
        break;
      }

      case 'pattern': {
        // Match with AI's repeating patterns
        const patterns = result.expandedPatterns?.perPerson ?? result.repeatingPatterns ?? {};
        const allPatterns = Object.values(patterns).flat();
        const patternTexts = allPatterns.map(p => {
          const desc = ('description' in p ? p.description : p.pattern ?? '').toLowerCase();
          return desc;
        }).join(' ');

        let aiPattern: string;
        if (patternTexts.includes('przywi') || patternTexts.includes('szybko') || patternTexts.includes('intensywn')) {
          aiPattern = 'Zbyt szybkie przywiązywanie się';
        } else if (patternTexts.includes('unika') || patternTexts.includes('milcz') || patternTexts.includes('trudnych rozmów')) {
          aiPattern = 'Unikanie trudnych rozmów';
        } else if (patternTexts.includes('analiz') || patternTexts.includes('myśl') || patternTexts.includes('zapętl')) {
          aiPattern = 'Nadmierne analizowanie';
        } else if (patternTexts.includes('wycofy') || patternTexts.includes('dystans') || patternTexts.includes('odsuwa')) {
          aiPattern = 'Wycofywanie się gdy jest za blisko';
        } else {
          aiPattern = 'Unikanie trudnych rozmów'; // default
        }
        aiAnswer = aiPattern;
        isMatch = String(ans.answer) === aiPattern;
        break;
      }
    }

    comparisons.push({
      questionId: ans.questionId,
      question: q.question,
      userAnswer: typeof ans.answer === 'number' ? `${ans.answer}%` : String(ans.answer),
      aiAnswer,
      isMatch,
      isClose,
    });
  }

  return comparisons;
}

/** Helper: approximate month difference between YYYY-MM strings */
function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}

// ── Post-quiz waiting messages ──────────────────────────────────

const POST_QUIZ_MESSAGES = [
  {
    icon: '⚠️',
    text: 'Ta analiza może być emocjonalnie trudna. Jeśli poczujesz, że to za dużo — zamknij stronę. Twoje zdrowie psychiczne jest ważniejsze niż jakikolwiek wynik.',
  },
  {
    icon: '🔬',
    text: 'AI przegląda tysiące wiadomości i szuka wzorców, których sami nie zauważacie. Dostaniesz brutalnie szczerą analizę — bez upiększania.',
  },
  {
    icon: '📉',
    text: 'Zobaczysz wykres "Linia Śmierci" — jak intymność, nastrój i czas odpowiedzi zmieniały się z miesiąca na miesiąc. To rentgen waszej relacji.',
  },
  {
    icon: '🪦',
    text: 'AI ustali kto odszedł pierwszy, kto skrzywdził bardziej, i jaka była przyczyna śmierci tego związku. Nie każda prawda jest łatwa do przełknięcia.',
  },
  {
    icon: '💬',
    text: 'Ostatnie wiadomości — dokładnie tak jak wyglądały. Bez retuszu. Czasem najbardziej boli to, jak banalnie coś się kończy.',
  },
  {
    icon: '🔁',
    text: 'AI zidentyfikuje wzorce, które przeniesiesz do następnego związku. To najtrudniejsza część — bo te wzorce są niewidoczne od środka.',
  },
  {
    icon: '✉️',
    text: 'Dostaniesz list od terapeuty — i zobaczysz co byś sam/sama napisał/a gdybyś musiał/a. Przygotuj się na konfrontację z własnymi ślepymi plamkami.',
  },
  {
    icon: '📞',
    text: 'Jeśli w trakcie poczujesz, że potrzebujesz wsparcia — Telefon Zaufania: 116 123 (bezpłatny, całodobowy). Nie musisz przez to przechodzić sam/sama.',
  },
  {
    icon: '🌅',
    text: 'Ale nie wszystko będzie ciężkie. AI znajdzie też "Złoty Okres" — najlepszy moment waszej relacji. Bo było też coś dobrego. I to też jest część twojej historii.',
  },
  {
    icon: '⚖️',
    text: 'To nie jest diagnoza psychologiczna. To interpretacja wzorców komunikacyjnych oparta na AI. Traktuj to jako punkt wyjścia do refleksji, nie wyrok.',
  },
];

const POST_QUIZ_INTERVAL_MS = 6000;

// ── Quiz UI — shown during loading ─────────────────────────────

function LoadingQuiz({
  progress,
  phaseName,
  participants,
  onQuizComplete,
}: {
  progress: number;
  phaseName: string;
  participants: string[];
  onQuizComplete: (answers: EksQuizAnswer[], questions: EksQuizQuestion[]) => void;
}) {
  const questions = useRef(buildQuizQuestions(participants)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<EksQuizAnswer[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [quizDone, setQuizDone] = useState(false);
  const notifiedRef = useRef(false);
  const [postQuizIndex, setPostQuizIndex] = useState(0);
  const postQuizTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate post-quiz messages
  useEffect(() => {
    if (!quizDone) return;
    postQuizTimerRef.current = setInterval(() => {
      setPostQuizIndex((prev) => (prev + 1) % POST_QUIZ_MESSAGES.length);
    }, POST_QUIZ_INTERVAL_MS);
    return () => { if (postQuizTimerRef.current) clearInterval(postQuizTimerRef.current); };
  }, [quizDone]);

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleAnswer = useCallback((value: string | number) => {
    const newAnswers = [...answers, { questionId: currentQ.id, answer: value }];
    setAnswers(newAnswers);

    if (isLast) {
      setQuizDone(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSliderValue(50); // reset slider for next question
    }
  }, [answers, currentQ, isLast]);

  // Notify parent when quiz is complete
  useEffect(() => {
    if (quizDone && !notifiedRef.current) {
      notifiedRef.current = true;
      onQuizComplete(answers, questions);
    }
  }, [quizDone, answers, questions, onQuizComplete]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Quiz header */}
      <div className="text-center mb-4">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ color: '#6b3a3a' }}
        >
          {quizDone ? 'Czekam na AI...' : `pytanie ${currentIndex + 1} / ${questions.length}`}
        </p>
      </div>

      {/* Question card */}
      <div
        className="relative rounded-xl p-6 mb-6 min-h-[220px] flex flex-col justify-center"
        style={{
          background: 'rgba(26,8,8,0.6)',
          border: '1px solid rgba(153,27,27,0.2)',
        }}
      >
        <AnimatePresence mode="wait">
          {!quizDone ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Question text */}
              <h3
                className="font-[family-name:var(--font-syne)] font-bold text-base md:text-lg mb-6"
                style={{ color: '#d4a07a' }}
              >
                {currentQ.question}
              </h3>

              {/* Choice buttons */}
              {currentQ.type === 'choice' && currentQ.options && (
                <div className="flex flex-col gap-2">
                  {currentQ.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className="w-full rounded-lg px-4 py-3 text-sm font-mono transition-all duration-200 hover:scale-[1.02]"
                      style={{
                        background: 'rgba(153,27,27,0.1)',
                        border: '1px solid rgba(153,27,27,0.25)',
                        color: '#d4a07a',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Slider */}
              {currentQ.type === 'slider' && (
                <div className="px-2">
                  <div
                    className="font-mono text-3xl font-black mb-4"
                    style={{ color: '#dc2626' }}
                  >
                    {sliderValue}{currentQ.unit}
                  </div>
                  <input
                    type="range"
                    min={currentQ.min ?? 0}
                    max={currentQ.max ?? 100}
                    value={sliderValue}
                    onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
                    className="w-full mb-4 accent-[#dc2626]"
                    style={{
                      accentColor: '#dc2626',
                    }}
                  />
                  <div className="flex justify-between text-xs font-mono mb-4" style={{ color: '#6b3a3a' }}>
                    <span>{currentQ.min ?? 0}{currentQ.unit}</span>
                    <span>{currentQ.max ?? 100}{currentQ.unit}</span>
                  </div>
                  <button
                    onClick={() => handleAnswer(sliderValue)}
                    className="rounded-lg px-6 py-2.5 text-sm font-mono transition-all duration-200 hover:scale-[1.02]"
                    style={{
                      background: 'rgba(153,27,27,0.2)',
                      border: '1px solid rgba(153,27,27,0.4)',
                      color: '#dc2626',
                    }}
                  >
                    Zatwierdź
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={postQuizIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-center px-2"
              >
                <div className="text-3xl mb-3">
                  {POST_QUIZ_MESSAGES[postQuizIndex].icon}
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: '#d4a07a' }}
                >
                  {POST_QUIZ_MESSAGES[postQuizIndex].text}
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </AnimatePresence>
      </div>

      {/* Answered dots */}
      <div className="flex justify-center gap-1.5 mb-5">
        {questions.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: i < answers.length
                ? '#dc2626'
                : i === currentIndex && !quizDone
                  ? 'rgba(220,38,38,0.5)'
                  : '#2a1010',
              transform: i === currentIndex && !quizDone ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mx-auto">
        <div className="flex justify-between text-xs mb-1" style={{ color: '#6b3a3a' }}>
          {phaseName && <span>{phaseName}</span>}
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: '#2a1010' }}>
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #991b1b, #dc2626)',
            }}
          />
        </div>
      </div>

      {/* Hint */}
      <p
        className="text-center text-[10px] mt-3 font-mono uppercase tracking-widest"
        style={{ color: '#4a2020' }}
      >
        {quizDone ? 'AI analizuje twój związek...' : 'jak myślisz, co powie AI?'}
      </p>
    </div>
  );
}

// ── Main button component ──────────────────────────────────────

interface EksButtonProps {
  onComplete: (result: EksResult) => void;
  onQuizComplete?: (answers: EksQuizAnswer[], questions: EksQuizQuestion[]) => void;
}

export default function EksButton({ onComplete, onQuizComplete }: EksButtonProps) {
  const {
    conversation,
    quantitative,
    qualitative,
    startOperation,
    updateOperation,
    stopOperation,
  } = useAnalysis();

  const { runEks, isLoading, progress, phaseName, result, error } = useEksAnalysis({
    conversation,
    quantitative,
    qualitative,
    ops: { startOperation, updateOperation, stopOperation },
    onComplete,
  });

  const participants = conversation.participants.map(p => p.name);

  const handleRun = async () => {
    await runEks();
  };

  const handleQuizComplete = useCallback((answers: EksQuizAnswer[], questions: EksQuizQuestion[]) => {
    onQuizComplete?.(answers, questions);
  }, [onQuizComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      {!isLoading && (
        <button
          onClick={handleRun}
          className="relative px-10 py-4 rounded-lg font-[family-name:var(--font-syne)] font-bold text-lg transition-all duration-300 hover:scale-[1.03]"
          style={{
            background: 'linear-gradient(135deg, rgba(153,27,27,0.3), rgba(120,20,20,0.2))',
            border: '1px solid #991b1b',
            color: '#dc2626',
            boxShadow: '0 0 30px rgba(153,27,27,0.15)',
          }}
        >
          Uruchom Sekcję
        </button>
      )}

      {isLoading && (
        <LoadingQuiz
          progress={progress}
          phaseName={phaseName}
          participants={participants}
          onQuizComplete={handleQuizComplete}
        />
      )}

      {error && (
        <p className="text-sm text-center max-w-sm" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
    </div>
  );
}
