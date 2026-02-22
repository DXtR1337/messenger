/**
 * Stawiam Zakład — Delusion Quiz
 *
 * 15 questions about the user's own conversation data.
 * 100% client-side — uses QuantitativeAnalysis metrics, no AI.
 */

import type { QuantitativeAnalysis, ParsedConversation } from '../parsers/types';

// ============================================================
// Types
// ============================================================

export interface DelusionQuestion {
  id: string;
  question: string;
  options: Array<{ label: string; value: string }>;
  getCorrectAnswer: (
    quantitative: QuantitativeAnalysis,
    conversation: ParsedConversation,
  ) => string;
  getRevealText: (
    correct: string,
    userAnswer: string,
    quantitative: QuantitativeAnalysis,
    conversation: ParsedConversation,
  ) => string;
}

export interface DelusionAnswer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  revealText: string;
}

export interface DelusionQuizResult {
  answers: DelusionAnswer[];
  score: number;
  delusionIndex: number;
  label: string;
}

// ============================================================
// Helpers
// ============================================================

function getNames(conversation: ParsedConversation): string[] {
  return conversation.participants.map((p) => p.name);
}

function pickPersonA(conversation: ParsedConversation): string {
  return conversation.participants[0]?.name ?? 'Osoba A';
}

function formatMs(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}

function getDelusionLabel(index: number): string {
  if (index <= 20) return 'BAZOWANY';
  if (index <= 40) return 'REALISTA';
  if (index <= 60) return 'LEKKO ODJECHANY';
  if (index <= 80) return 'TOTAL DELULU';
  return 'POZA RZECZYWISTOŚCIĄ';
}

function getPeakHourBucket(heatmap: QuantitativeAnalysis['heatmap'], name: string): string {
  const matrix = heatmap.perPerson[name];
  if (!matrix) return 'Wieczór';

  const hourly = new Array<number>(24).fill(0);
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      hourly[hour] += matrix[day]?.[hour] ?? 0;
    }
  }

  let peakHour = 0;
  let peakCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourly[h] > peakCount) {
      peakCount = hourly[h];
      peakHour = h;
    }
  }

  if (peakHour >= 6 && peakHour < 12) return 'Rano';
  if (peakHour >= 12 && peakHour < 17) return 'Popołudnie';
  if (peakHour >= 17 && peakHour < 22) return 'Wieczór';
  return 'Noc';
}

function getPeakExactHour(heatmap: QuantitativeAnalysis['heatmap'], name: string): number {
  const matrix = heatmap.perPerson[name];
  if (!matrix) return 21;

  const hourly = new Array<number>(24).fill(0);
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      hourly[hour] += matrix[day]?.[hour] ?? 0;
    }
  }

  let peakHour = 0;
  let peakCount = 0;
  for (let h = 0; h < 24; h++) {
    if (hourly[h] > peakCount) {
      peakCount = hourly[h];
      peakHour = h;
    }
  }
  return peakHour;
}

// ============================================================
// Questions (15)
// ============================================================

export const DELUSION_QUESTIONS: DelusionQuestion[] = [
  // Q1: Who sends more messages?
  {
    id: 'q1_more_messages',
    question: 'Kto wysyła więcej wiadomości?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const countA = q.perPerson[names[0]]?.totalMessages ?? 0;
      const countB = q.perPerson[names[1]]?.totalMessages ?? 0;
      return countA >= countB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const countA = q.perPerson[names[0]]?.totalMessages ?? 0;
      const countB = q.perPerson[names[1]]?.totalMessages ?? 0;
      const ratio = countA > 0 && countB > 0
        ? `${Math.round(countA / (countA + countB) * 100)}:${Math.round(countB / (countA + countB) * 100)}`
        : '—';
      return `${names[0]}: ${countA.toLocaleString('pl-PL')} vs ${names[1]}: ${countB.toLocaleString('pl-PL')}. Proporcja ${ratio}.`;
    },
  },
  // Q2: Your median response time
  {
    id: 'q2_response_time',
    question: 'Ile wynosi twój medianowy czas odpowiedzi?',
    options: [
      { label: '<5 min', value: '<5min' },
      { label: '5-30 min', value: '5-30min' },
      { label: '30 min — 2h', value: '30min-2h' },
      { label: '2h+', value: '2h+' },
    ],
    getCorrectAnswer(q, c) {
      const name = pickPersonA(c);
      const medianMs = q.timing.perPerson[name]?.medianResponseTimeMs ?? 0;
      const minutes = medianMs / 60_000;
      if (minutes < 5) return '<5min';
      if (minutes < 30) return '5-30min';
      if (minutes < 120) return '30min-2h';
      return '2h+';
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const name = pickPersonA(c);
      const medianMs = q.timing.perPerson[name]?.medianResponseTimeMs ?? 0;
      return `Mediana odpowiedzi ${name}: ${formatMs(medianMs)}. Dane nie kłamią.`;
    },
  },
  // Q3: Who writes longer messages?
  {
    id: 'q3_longer_messages',
    question: 'Kto pisze dłuższe wiadomości?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const lenA = q.perPerson[names[0]]?.averageMessageLength ?? 0;
      const lenB = q.perPerson[names[1]]?.averageMessageLength ?? 0;
      return lenA >= lenB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const lenA = q.perPerson[names[0]]?.averageMessageLength ?? 0;
      const lenB = q.perPerson[names[1]]?.averageMessageLength ?? 0;
      return `${names[0]}: ${lenA.toFixed(1)} słów/msg. ${names[1]}: ${lenB.toFixed(1)} słów/msg.`;
    },
  },
  // Q4: Who initiates conversations more often?
  {
    id: 'q4_initiator',
    question: 'Kto częściej inicjuje rozmowę?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const initA = q.timing.conversationInitiations[names[0]] ?? 0;
      const initB = q.timing.conversationInitiations[names[1]] ?? 0;
      return initA >= initB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const initA = q.timing.conversationInitiations[names[0]] ?? 0;
      const initB = q.timing.conversationInitiations[names[1]] ?? 0;
      const total = initA + initB;
      const pctA = total > 0 ? Math.round((initA / total) * 100) : 50;
      return `${names[0]}: ${initA}x (${pctA}%), ${names[1]}: ${initB}x (${100 - pctA}%).`;
    },
  },
  // Q5: Who uses more emoji?
  {
    id: 'q5_emoji',
    question: 'Kto używa więcej emoji?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const emojiA = q.perPerson[names[0]]?.emojiCount ?? 0;
      const emojiB = q.perPerson[names[1]]?.emojiCount ?? 0;
      return emojiA >= emojiB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const emojiA = q.perPerson[names[0]]?.emojiCount ?? 0;
      const emojiB = q.perPerson[names[1]]?.emojiCount ?? 0;
      const diff = Math.abs(emojiA - emojiB);
      return `${names[0]}: ${emojiA}, ${names[1]}: ${emojiB}. Różnica: ${diff}.`;
    },
  },
  // Q6: What % of conversations do YOU start?
  {
    id: 'q6_initiation_pct',
    question: 'Ile procent rozmów zaczynasz ty?',
    options: [
      { label: '<30%', value: '<30%' },
      { label: '30-70%', value: '~50%' },
      { label: '>70%', value: '>70%' },
    ],
    getCorrectAnswer(q, c) {
      const name = pickPersonA(c);
      const total = Object.values(q.timing.conversationInitiations).reduce((a, b) => a + b, 0);
      if (total === 0) return '~50%';
      const pct = ((q.timing.conversationInitiations[name] ?? 0) / total) * 100;
      if (pct < 30) return '<30%';
      if (pct <= 70) return '~50%';
      return '>70%';
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const name = pickPersonA(c);
      const total = Object.values(q.timing.conversationInitiations).reduce((a, b) => a + b, 0);
      const pct = total > 0 ? ((q.timing.conversationInitiations[name] ?? 0) / total) * 100 : 50;
      return `${name} inicjuje ${pct.toFixed(1)}% rozmów. Reszta czeka.`;
    },
  },
  // Q7: Who double-texts more?
  {
    id: 'q7_double_text',
    question: 'Kto częściej double-textuje?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const dtA = q.engagement.doubleTexts[names[0]] ?? 0;
      const dtB = q.engagement.doubleTexts[names[1]] ?? 0;
      return dtA >= dtB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const dtA = q.engagement.doubleTexts[names[0]] ?? 0;
      const dtB = q.engagement.doubleTexts[names[1]] ?? 0;
      const winner = dtA >= dtB ? names[0] : names[1];
      return `${names[0]}: ${dtA}x, ${names[1]}: ${dtB}x. ${winner} nie umie czekać.`;
    },
  },
  // Q8: Peak activity hour
  {
    id: 'q8_peak_hour',
    question: 'O której porze dnia piszesz najczęściej?',
    options: [
      { label: 'Rano (6-12)', value: 'Rano' },
      { label: 'Popołudnie (12-17)', value: 'Popołudnie' },
      { label: 'Wieczór (17-22)', value: 'Wieczór' },
      { label: 'Noc (22-6)', value: 'Noc' },
    ],
    getCorrectAnswer(q, c) {
      const name = pickPersonA(c);
      return getPeakHourBucket(q.heatmap, name);
    },
    getRevealText(correct, _userAnswer, q, c) {
      const name = pickPersonA(c);
      const peakH = getPeakExactHour(q.heatmap, name);
      return `Peak ${name}: ${correct.toLowerCase()}, szczyt o ${peakH}:00.`;
    },
  },
  // Q9: Longest silence
  {
    id: 'q9_longest_silence',
    question: 'Jak długo trwała najdłuższa cisza?',
    options: [
      { label: '<1 dzień', value: '<1d' },
      { label: '1-3 dni', value: '1-3d' },
      { label: '3-7 dni', value: '3-7d' },
      { label: '7+ dni', value: '7d+' },
    ],
    getCorrectAnswer(q) {
      const durationMs = q.timing.longestSilence?.durationMs ?? 0;
      const days = durationMs / 86_400_000;
      if (days < 1) return '<1d';
      if (days < 3) return '1-3d';
      if (days < 7) return '3-7d';
      return '7d+';
    },
    getRevealText(_correct, _userAnswer, q) {
      const durationMs = q.timing.longestSilence?.durationMs ?? 0;
      const lastSender = q.timing.longestSilence?.lastSender ?? '?';
      return `Najdłuższa cisza: ${formatMs(durationMs)}. Ostatni pisał: ${lastSender}.`;
    },
  },
  // Q10: Who replies faster?
  {
    id: 'q10_faster_reply',
    question: 'Kto odpowiada szybciej?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const rtA = q.timing.perPerson[names[0]]?.medianResponseTimeMs ?? Infinity;
      const rtB = q.timing.perPerson[names[1]]?.medianResponseTimeMs ?? Infinity;
      return rtA <= rtB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const rtA = q.timing.perPerson[names[0]]?.medianResponseTimeMs ?? 0;
      const rtB = q.timing.perPerson[names[1]]?.medianResponseTimeMs ?? 0;
      const ratio = rtA > 0 && rtB > 0 ? (Math.max(rtA, rtB) / Math.min(rtA, rtB)).toFixed(1) : '—';
      return `${names[0]}: ${formatMs(rtA)}, ${names[1]}: ${formatMs(rtB)}. Stosunek: ${ratio}x.`;
    },
  },
  // Q11: Total messages
  {
    id: 'q11_total_messages',
    question: 'Ile wiadomości wysłaliście łącznie?',
    options: [
      { label: '<1 000', value: '<1k' },
      { label: '1 000 — 5 000', value: '1-5k' },
      { label: '5 000 — 20 000', value: '5-20k' },
      { label: '20 000+', value: '20k+' },
    ],
    getCorrectAnswer(_q, c) {
      const total = c.metadata.totalMessages;
      if (total < 1000) return '<1k';
      if (total < 5000) return '1-5k';
      if (total < 20000) return '5-20k';
      return '20k+';
    },
    getRevealText(_correct, _userAnswer, _q, c) {
      const total = c.metadata.totalMessages;
      const days = c.metadata.durationDays;
      const perDay = days > 0 ? (total / days).toFixed(1) : '—';
      return `${total.toLocaleString('pl-PL')} wiadomości w ${days} dni. Średnio ${perDay}/dzień.`;
    },
  },
  // Q12: Who sends more late-night messages?
  {
    id: 'q12_late_night',
    question: 'Kto wysyła więcej wiadomości po 22:00?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const lnA = q.timing.lateNightMessages[names[0]] ?? 0;
      const lnB = q.timing.lateNightMessages[names[1]] ?? 0;
      return lnA >= lnB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const lnA = q.timing.lateNightMessages[names[0]] ?? 0;
      const lnB = q.timing.lateNightMessages[names[1]] ?? 0;
      const totalA = q.perPerson[names[0]]?.totalMessages ?? 1;
      const totalB = q.perPerson[names[1]]?.totalMessages ?? 1;
      const pctA = ((lnA / totalA) * 100).toFixed(1);
      const pctB = ((lnB / totalB) * 100).toFixed(1);
      return `${names[0]}: ${lnA} nocnych (${pctA}%), ${names[1]}: ${lnB} (${pctB}%).`;
    },
  },
  // Q13: Compatibility score range
  {
    id: 'q13_compatibility',
    question: 'Jaki jest wasz Compatibility Score?',
    options: [
      { label: '<30', value: '<30' },
      { label: '30-60', value: '30-60' },
      { label: '60-80', value: '60-80' },
      { label: '80+', value: '80+' },
    ],
    getCorrectAnswer(q) {
      const score = q.viralScores?.compatibilityScore ?? 50;
      if (score < 30) return '<30';
      if (score < 60) return '30-60';
      if (score < 80) return '60-80';
      return '80+';
    },
    getRevealText(_correct, _userAnswer, q) {
      const score = q.viralScores?.compatibilityScore ?? 50;
      return `Compatibility Score: ${score}/100. Bez komentarza.`;
    },
  },
  // Q14: Who gives more reactions?
  {
    id: 'q14_reactions',
    question: 'Kto daje więcej reakcji?',
    get options() {
      return [];
    },
    getCorrectAnswer(q, c) {
      const names = getNames(c);
      if (names.length < 2) return names[0] ?? '';
      const rA = q.perPerson[names[0]]?.reactionsGiven ?? 0;
      const rB = q.perPerson[names[1]]?.reactionsGiven ?? 0;
      return rA >= rB ? names[0] : names[1];
    },
    getRevealText(_correct, _userAnswer, q, c) {
      const names = getNames(c);
      const rA = q.perPerson[names[0]]?.reactionsGiven ?? 0;
      const rB = q.perPerson[names[1]]?.reactionsGiven ?? 0;
      const diff = Math.abs(rA - rB);
      return `${names[0]}: ${rA} reakcji, ${names[1]}: ${rB}. Różnica: ${diff}.`;
    },
  },
  // Q15: Is the conversation growing or fading?
  {
    id: 'q15_volume_trend',
    question: 'Czy rozmowa się rozwija czy zanika?',
    options: [
      { label: 'Rozwija się', value: 'Rozwija' },
      { label: 'Stabilna', value: 'Stabilna' },
      { label: 'Zanika', value: 'Zanika' },
    ],
    getCorrectAnswer(q) {
      const trend = q.patterns.volumeTrend;
      if (trend > 0.1) return 'Rozwija';
      if (trend < -0.1) return 'Zanika';
      return 'Stabilna';
    },
    getRevealText(_correct, _userAnswer, q) {
      const trend = q.patterns.volumeTrend;
      const sign = trend > 0 ? '+' : '';
      return `Trend wolumenu: ${sign}${(trend * 100).toFixed(0)}%. Liczby mówią same za siebie.`;
    },
  },
];

// ============================================================
// Build dynamic options for "Pick A/B" questions
// ============================================================

/**
 * Returns a copy of DELUSION_QUESTIONS with participant-specific options
 * populated for "Pick A/B" questions (questions that have empty options).
 */
export function buildQuestions(conversation: ParsedConversation): DelusionQuestion[] {
  const names = getNames(conversation);
  const nameA = names[0] ?? 'Osoba A';
  const nameB = names[1] ?? 'Osoba B';

  return DELUSION_QUESTIONS.map((q) => {
    if (q.options.length > 0) return q;
    return {
      ...q,
      options: [
        { label: nameA, value: nameA },
        { label: nameB, value: nameB },
      ],
    };
  });
}

// ============================================================
// Self-referencing questions (about Person A) get double weight
// ============================================================

const SELF_QUESTIONS = new Set([
  'q2_response_time',
  'q6_initiation_pct',
  'q8_peak_hour',
]);

// ============================================================
// Compute result
// ============================================================

export function computeDelusionResult(
  answers: Array<{ questionId: string; userAnswer: string }>,
  quantitative: QuantitativeAnalysis,
  conversation: ParsedConversation,
): DelusionQuizResult {
  const questions = buildQuestions(conversation);
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let totalWeight = 0;
  let correctWeight = 0;

  const resultAnswers: DelusionAnswer[] = answers.map((a) => {
    const question = questionMap.get(a.questionId);
    if (!question) {
      return {
        questionId: a.questionId,
        userAnswer: a.userAnswer,
        correctAnswer: '?',
        isCorrect: false,
        revealText: '',
      };
    }

    const correctAnswer = question.getCorrectAnswer(quantitative, conversation);
    const isCorrect = a.userAnswer === correctAnswer;
    const revealText = question.getRevealText(
      correctAnswer,
      a.userAnswer,
      quantitative,
      conversation,
    );

    const weight = SELF_QUESTIONS.has(a.questionId) ? 2 : 1;
    totalWeight += weight;
    if (isCorrect) correctWeight += weight;

    return {
      questionId: a.questionId,
      userAnswer: a.userAnswer,
      correctAnswer,
      isCorrect,
      revealText,
    };
  });

  const score = resultAnswers.filter((a) => a.isCorrect).length;
  const delusionIndex = totalWeight > 0
    ? Math.round(100 - (correctWeight / totalWeight) * 100)
    : 0;
  const label = getDelusionLabel(delusionIndex);

  return {
    answers: resultAnswers,
    score,
    delusionIndex,
    label,
  };
}
