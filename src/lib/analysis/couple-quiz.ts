/**
 * Couple Quiz Comparison — Partner vs Partner
 *
 * Both partners take the Delusion Quiz independently.
 * Person A's session is encoded in a URL and shared with Person B.
 * After Person B completes the quiz, results are compared side-by-side.
 *
 * Uses lz-string for compact URL-safe encoding of session data.
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { DelusionQuizResult } from './delusion-quiz';
import { buildQuestions, computeDelusionResult, DELUSION_QUESTIONS } from './delusion-quiz';
import type { QuantitativeAnalysis, ParsedConversation } from '../parsers/types';

// ============================================================
// Types
// ============================================================

export interface CoupleSessionData {
  analysisId: string;
  personAName: string;
  answers: Array<{ questionId: string; userAnswer: string }>;
}

export interface CoupleQuizPerQuestion {
  questionId: string;
  questionText: string;
  answerA: string;
  answerB: string;
  correctAnswer: string;
  aCorrect: boolean;
  bCorrect: boolean;
  agree: boolean;
}

export interface CoupleQuizComparison {
  personA: { name: string; result: DelusionQuizResult };
  personB: { name: string; result: DelusionQuizResult };
  perQuestion: CoupleQuizPerQuestion[];
  awarenessWinner: string | 'tie';
  delusionGap: number;
  agreementRate: number; // 0-1
  bothWrongCount: number;
  bothRightCount: number;
}

// ============================================================
// URL Encoding / Decoding
// ============================================================

/**
 * Compress Person A's session data into a URL-safe string.
 */
export function encodeCoupleSession(data: CoupleSessionData): string {
  return compressToEncodedURIComponent(JSON.stringify(data));
}

/**
 * Decompress an encoded session string back into CoupleSessionData.
 * Returns null if the input is invalid or corrupted.
 */
export function decodeCoupleSession(encoded: string): CoupleSessionData | null {
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed.analysisId || !parsed.personAName || !Array.isArray(parsed.answers)) return null;
    return parsed as unknown as CoupleSessionData;
  } catch {
    return null;
  }
}

// ============================================================
// Comparison Logic
// ============================================================

/**
 * Compare two partners' quiz answers against actual conversation data.
 *
 * Both sets of answers are evaluated against the same ground truth
 * (quantitative metrics), then compared question-by-question.
 */
export function computeCoupleComparison(
  personAAnswers: Array<{ questionId: string; userAnswer: string }>,
  personBAnswers: Array<{ questionId: string; userAnswer: string }>,
  nameA: string,
  nameB: string,
  quantitative: QuantitativeAnalysis,
  conversation: ParsedConversation,
): CoupleQuizComparison {
  const resultA = computeDelusionResult(personAAnswers, quantitative, conversation);
  const resultB = computeDelusionResult(personBAnswers, quantitative, conversation);

  // Build question text lookup from dynamic questions
  const questions = buildQuestions(conversation);
  const questionTextMap = new Map(questions.map((q) => [q.id, q.question]));

  // Index answers by questionId for fast lookup
  const answersAMap = new Map(resultA.answers.map((a) => [a.questionId, a]));
  const answersBMap = new Map(resultB.answers.map((a) => [a.questionId, a]));

  // Collect all unique question IDs (preserve order from DELUSION_QUESTIONS)
  const allQuestionIds = DELUSION_QUESTIONS.map((q) => q.id).filter(
    (id) => answersAMap.has(id) || answersBMap.has(id),
  );

  let agreeCount = 0;
  let bothWrongCount = 0;
  let bothRightCount = 0;

  const perQuestion: CoupleQuizPerQuestion[] = allQuestionIds.map((questionId) => {
    const aAnswer = answersAMap.get(questionId);
    const bAnswer = answersBMap.get(questionId);

    // correctAnswer is the same regardless of who answered — use A's if available, else B's
    const correctAnswer = aAnswer?.correctAnswer ?? bAnswer?.correctAnswer ?? '?';
    const answerA = aAnswer?.userAnswer ?? '';
    const answerB = bAnswer?.userAnswer ?? '';
    const aCorrect = aAnswer?.isCorrect ?? false;
    const bCorrect = bAnswer?.isCorrect ?? false;
    const agree = answerA === answerB;

    if (agree) agreeCount++;
    if (aCorrect && bCorrect) bothRightCount++;
    if (!aCorrect && !bCorrect) bothWrongCount++;

    return {
      questionId,
      questionText: questionTextMap.get(questionId) ?? questionId,
      answerA,
      answerB,
      correctAnswer,
      aCorrect,
      bCorrect,
      agree,
    };
  });

  const totalQuestions = perQuestion.length;
  const agreementRate = totalQuestions > 0 ? agreeCount / totalQuestions : 0;
  const delusionGap = Math.abs(resultA.delusionIndex - resultB.delusionIndex);

  // Lower delusionIndex = more self-aware = winner
  let awarenessWinner: string | 'tie';
  if (resultA.delusionIndex < resultB.delusionIndex) {
    awarenessWinner = nameA;
  } else if (resultB.delusionIndex < resultA.delusionIndex) {
    awarenessWinner = nameB;
  } else {
    awarenessWinner = 'tie';
  }

  return {
    personA: { name: nameA, result: resultA },
    personB: { name: nameB, result: resultB },
    perQuestion,
    awarenessWinner,
    delusionGap,
    agreementRate,
    bothWrongCount,
    bothRightCount,
  };
}

// ============================================================
// Verdict
// ============================================================

/**
 * Returns a Polish verdict string summarizing the couple comparison.
 */
export function getComparisonVerdict(comparison: CoupleQuizComparison): string {
  const { personA, personB, awarenessWinner, delusionGap } = comparison;
  const idxA = personA.result.delusionIndex;
  const idxB = personB.result.delusionIndex;

  // Both grounded
  if (idxA < 30 && idxB < 30) {
    return 'Oboje stąpacie twardo po ziemi. Rzadkość.';
  }

  // Both delusional
  if (idxA > 60 && idxB > 60) {
    return 'Oboje żyjecie w alternatywnej rzeczywistości.';
  }

  // Big gap — one sees clearly, the other does not
  if (delusionGap > 30 && awarenessWinner !== 'tie') {
    const loser = awarenessWinner === personA.name ? personB.name : personA.name;
    return `${awarenessWinner} widzi relację wyraźnie. ${loser} — niekoniecznie.`;
  }

  // Close match
  if (delusionGap < 10) {
    return 'Podobna perspektywa — widzicie to samo.';
  }

  // Default
  return 'Każdy widzi relację po swojemu. Dane pokazują, kto bliżej prawdy.';
}
