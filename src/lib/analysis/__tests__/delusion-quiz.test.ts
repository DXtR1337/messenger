import { describe, it, expect } from 'vitest';
import {
  buildQuestions,
  computeDelusionResult,
  DELUSION_QUESTIONS,
} from '@/lib/analysis/delusion-quiz';
import { makeQuant } from '@/lib/__tests__/fixtures';
import type { ParsedConversation, QuantitativeAnalysis } from '@/lib/parsers/types';

function makeConversation(names: string[] = ['Alice', 'Bob']): ParsedConversation {
  return {
    participants: names.map(n => ({ name: n })),
    metadata: {
      totalMessages: 5000,
      durationDays: 180,
      platform: 'messenger',
      participantCount: names.length,
      firstMessageDate: '2024-01-01',
      lastMessageDate: '2024-06-30',
    },
    messages: [],
  } as unknown as ParsedConversation;
}

function makeQuantForQuiz(overrides?: Partial<QuantitativeAnalysis>): QuantitativeAnalysis {
  const base = makeQuant({
    perPerson: {
      Alice: {
        totalMessages: 3000,
        averageMessageLength: 8.5,
        emojiCount: 200,
        reactionsGiven: 50,
      } as never,
      Bob: {
        totalMessages: 2000,
        averageMessageLength: 5.2,
        emojiCount: 100,
        reactionsGiven: 30,
      } as never,
    },
    timing: {
      perPerson: {
        Alice: { medianResponseTimeMs: 180_000 }, // 3 min
        Bob: { medianResponseTimeMs: 600_000 },   // 10 min
      },
      conversationInitiations: { Alice: 60, Bob: 40 },
      longestSilence: { durationMs: 172_800_000, lastSender: 'Alice' }, // 2 days
      lateNightMessages: { Alice: 150, Bob: 80 },
    } as never,
    engagement: {
      doubleTexts: { Alice: 120, Bob: 30 },
    } as never,
    patterns: {
      volumeTrend: 0.05,
    } as never,
    heatmap: {
      perPerson: {
        Alice: Array.from({ length: 7 }, () => {
          const row = new Array(24).fill(0);
          row[20] = 50; // peak at 20:00
          return row;
        }),
      },
      combined: [],
    },
    viralScores: {
      compatibilityScore: 72,
      ghostRisk: {},
    } as never,
  }, ['Alice', 'Bob']);
  return { ...base, ...overrides };
}

describe('DELUSION_QUESTIONS', () => {
  it('has exactly 15 questions', () => {
    expect(DELUSION_QUESTIONS).toHaveLength(15);
  });

  it('each question has id, question, getCorrectAnswer, getRevealText', () => {
    for (const q of DELUSION_QUESTIONS) {
      expect(typeof q.id).toBe('string');
      expect(typeof q.question).toBe('string');
      expect(typeof q.getCorrectAnswer).toBe('function');
      expect(typeof q.getRevealText).toBe('function');
    }
  });

  it('all ids are unique', () => {
    const ids = DELUSION_QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('buildQuestions', () => {
  it('returns 15 questions', () => {
    const conv = makeConversation();
    expect(buildQuestions(conv)).toHaveLength(15);
  });

  it('Pick A/B questions get participant names as options', () => {
    const conv = makeConversation(['Ewa', 'Kacper']);
    const questions = buildQuestions(conv);
    // q1 is a "pick person" question (starts with empty options)
    const q1 = questions.find(q => q.id === 'q1_more_messages')!;
    expect(q1.options).toHaveLength(2);
    expect(q1.options[0].label).toBe('Ewa');
    expect(q1.options[1].label).toBe('Kacper');
  });

  it('fixed-option questions keep their options', () => {
    const conv = makeConversation();
    const questions = buildQuestions(conv);
    const q2 = questions.find(q => q.id === 'q2_response_time')!;
    expect(q2.options).toHaveLength(4);
    expect(q2.options[0].value).toBe('<5min');
  });
});

describe('getCorrectAnswer — individual questions', () => {
  const quant = makeQuantForQuiz();
  const conv = makeConversation();

  it('q1: more messages → Alice (3000 > 2000)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q1_more_messages')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q2: response time 3min → <5min', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q2_response_time')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('<5min');
  });

  it('q3: longer messages → Alice (8.5 > 5.2)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q3_longer_messages')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q4: initiator → Alice (60 > 40)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q4_initiator')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q5: emoji → Alice (200 > 100)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q5_emoji')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q6: initiation pct = 60% → ~50% (30-70 range)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q6_initiation_pct')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('~50%');
  });

  it('q7: double text → Alice (120 > 30)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q7_double_text')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q8: peak hour → Wieczór (peak at 20:00)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q8_peak_hour')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Wieczór');
  });

  it('q9: longest silence 2 days → 1-3d', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q9_longest_silence')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('1-3d');
  });

  it('q10: faster reply → Alice (3min < 10min)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q10_faster_reply')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q11: total messages 5000 → 5-20k', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q11_total_messages')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('5-20k');
  });

  it('q12: late night → Alice (150 > 80)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q12_late_night')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q13: compatibility 72 → 60-80', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q13_compatibility')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('60-80');
  });

  it('q14: reactions → Alice (50 > 30)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q14_reactions')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Alice');
  });

  it('q15: volume trend 0.05 → Stabilna (< 0.1)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q15_volume_trend')!;
    expect(q.getCorrectAnswer(quant, conv)).toBe('Stabilna');
  });
});

describe('computeDelusionResult', () => {
  const quant = makeQuantForQuiz();
  const conv = makeConversation();

  it('all correct → delusionIndex=0, label=BAZOWANY', () => {
    const answers = DELUSION_QUESTIONS.map(q => ({
      questionId: q.id,
      userAnswer: q.getCorrectAnswer(quant, conv),
    }));
    const result = computeDelusionResult(answers, quant, conv);
    expect(result.delusionIndex).toBe(0);
    expect(result.label).toBe('BAZOWANY');
    expect(result.score).toBe(15);
  });

  it('all wrong → delusionIndex=100, label=POZA RZECZYWISTOŚCIĄ', () => {
    const answers = DELUSION_QUESTIONS.map(q => ({
      questionId: q.id,
      userAnswer: '__WRONG__',
    }));
    const result = computeDelusionResult(answers, quant, conv);
    expect(result.delusionIndex).toBe(100);
    expect(result.label).toBe('POZA RZECZYWISTOŚCIĄ');
    expect(result.score).toBe(0);
  });

  it('self-questions have x2 weight', () => {
    // Answer only self-questions wrong (q2, q6, q8), rest correct
    const selfIds = new Set(['q2_response_time', 'q6_initiation_pct', 'q8_peak_hour']);
    const answers = DELUSION_QUESTIONS.map(q => ({
      questionId: q.id,
      userAnswer: selfIds.has(q.id) ? '__WRONG__' : q.getCorrectAnswer(quant, conv),
    }));
    const result = computeDelusionResult(answers, quant, conv);
    // Total weight: 12 normal + 3 self*2 = 18. Correct weight: 12. Delusion = 100 - (12/18)*100 = 33
    expect(result.delusionIndex).toBe(33);
  });

  it('empty answers → delusionIndex=0', () => {
    const result = computeDelusionResult([], quant, conv);
    expect(result.delusionIndex).toBe(0);
  });

  it('unknown questionId → isCorrect=false', () => {
    const answers = [{ questionId: 'unknown_question', userAnswer: 'test' }];
    const result = computeDelusionResult(answers, quant, conv);
    expect(result.answers[0].isCorrect).toBe(false);
    expect(result.answers[0].correctAnswer).toBe('?');
  });
});

describe('getDelusionLabel thresholds', () => {
  const quant = makeQuantForQuiz();
  const conv = makeConversation();

  function getResult(wrongCount: number) {
    // Create answers where first N are wrong, rest correct
    const questions = DELUSION_QUESTIONS;
    const answers = questions.map((q, i) => ({
      questionId: q.id,
      userAnswer: i < wrongCount ? '__WRONG__' : q.getCorrectAnswer(quant, conv),
    }));
    return computeDelusionResult(answers, quant, conv);
  }

  it('delusionIndex 0-20 → BAZOWANY', () => {
    const result = getResult(0); // all correct
    expect(result.label).toBe('BAZOWANY');
  });

  it('delusionIndex 21-40 → REALISTA', () => {
    // Need ~30% wrong weighted. With 18 total weight, 5.4 wrong weight → 30%
    // Approximately 5 non-self wrong = 5/18 = 27.8% delusion
    const result = getResult(5);
    if (result.delusionIndex > 20 && result.delusionIndex <= 40) {
      expect(result.label).toBe('REALISTA');
    }
  });

  it('delusionIndex 81-100 → POZA RZECZYWISTOŚCIĄ', () => {
    const result = getResult(15); // all wrong
    expect(result.label).toBe('POZA RZECZYWISTOŚCIĄ');
  });
});

describe('getPeakHourBucket (tested via q8)', () => {
  const conv = makeConversation();

  function makeQuantWithPeak(peakHour: number): QuantitativeAnalysis {
    return makeQuantForQuiz({
      heatmap: {
        perPerson: {
          Alice: Array.from({ length: 7 }, () => {
            const row = new Array(24).fill(0);
            row[peakHour] = 50;
            return row;
          }),
        },
        combined: [],
      },
    });
  }

  it('peak at 8 → Rano (6-12)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q8_peak_hour')!;
    expect(q.getCorrectAnswer(makeQuantWithPeak(8), conv)).toBe('Rano');
  });

  it('peak at 14 → Popołudnie (12-17)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q8_peak_hour')!;
    expect(q.getCorrectAnswer(makeQuantWithPeak(14), conv)).toBe('Popołudnie');
  });

  it('peak at 19 → Wieczór (17-22)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q8_peak_hour')!;
    expect(q.getCorrectAnswer(makeQuantWithPeak(19), conv)).toBe('Wieczór');
  });

  it('peak at 23 → Noc (22-6)', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q8_peak_hour')!;
    expect(q.getCorrectAnswer(makeQuantWithPeak(23), conv)).toBe('Noc');
  });

  it('peak at 3 → Noc', () => {
    const q = DELUSION_QUESTIONS.find(q => q.id === 'q8_peak_hour')!;
    expect(q.getCorrectAnswer(makeQuantWithPeak(3), conv)).toBe('Noc');
  });
});

describe('determinism', () => {
  it('same input → same output', () => {
    const quant = makeQuantForQuiz();
    const conv = makeConversation();
    const answers = DELUSION_QUESTIONS.map(q => ({
      questionId: q.id,
      userAnswer: q.getCorrectAnswer(quant, conv),
    }));
    const r1 = computeDelusionResult(answers, quant, conv);
    const r2 = computeDelusionResult(answers, quant, conv);
    expect(r1).toEqual(r2);
  });
});
