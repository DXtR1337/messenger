import { describe, it, expect } from 'vitest';
import {
  calculatePatternResults,
  getPatternFrequency,
  getPatternByKey,
  getQuestionById,
  getTopPatterns,
  getOverallRiskLevel,
  CPS_PATTERNS,
  CPS_QUESTIONS,
  CPS_REQUIREMENTS,
  CPS_DISCLAIMER,
  type CPSAnswer,
  type CPSPatternResult,
} from '@/lib/analysis/communication-patterns';

// ── Helpers ─────────────────────────────────────────────────

function makeAnswer(answer: boolean | null, confidence = 80): CPSAnswer {
  return { answer, confidence, evidence: answer ? ['example evidence'] : [] };
}

/** Build answers map where every question for the given pattern key gets the same answer */
function makePatternAnswers(
  patternKey: string,
  answer: boolean | null,
  confidence = 80,
): Record<number, CPSAnswer> {
  const pattern = CPS_PATTERNS.find((p) => p.key === patternKey);
  if (!pattern) throw new Error(`Unknown pattern: ${patternKey}`);
  const answers: Record<number, CPSAnswer> = {};
  for (const qId of pattern.questions) {
    answers[qId] = makeAnswer(answer, confidence);
  }
  return answers;
}

/** Build answers for ALL 63 questions with a given answer value */
function makeAllAnswers(answer: boolean | null, confidence = 80): Record<number, CPSAnswer> {
  const answers: Record<number, CPSAnswer> = {};
  for (const q of CPS_QUESTIONS) {
    answers[q.id] = makeAnswer(answer, confidence);
  }
  return answers;
}

// ── getPatternFrequency ─────────────────────────────────────

describe('getPatternFrequency', () => {
  it('returns not_observed for 0%', () => {
    expect(getPatternFrequency(0)).toBe('not_observed');
  });

  it('returns not_observed for negative percentage', () => {
    expect(getPatternFrequency(-5)).toBe('not_observed');
  });

  it('returns occasional for 1-25%', () => {
    expect(getPatternFrequency(1)).toBe('occasional');
    expect(getPatternFrequency(25)).toBe('occasional');
  });

  it('returns recurring for 26-60%', () => {
    expect(getPatternFrequency(26)).toBe('recurring');
    expect(getPatternFrequency(60)).toBe('recurring');
  });

  it('returns pervasive for >60%', () => {
    expect(getPatternFrequency(61)).toBe('pervasive');
    expect(getPatternFrequency(100)).toBe('pervasive');
  });
});

// ── getPatternByKey / getQuestionById ───────────────────────

describe('getPatternByKey', () => {
  it('finds an existing pattern', () => {
    const p = getPatternByKey('intimacy_avoidance');
    expect(p).toBeDefined();
    expect(p!.key).toBe('intimacy_avoidance');
    expect(p!.nameEn).toBe('Intimacy Avoidance');
  });

  it('returns undefined for unknown key', () => {
    expect(getPatternByKey('nonexistent')).toBeUndefined();
  });
});

describe('getQuestionById', () => {
  it('finds question 1', () => {
    const q = getQuestionById(1);
    expect(q).toBeDefined();
    expect(q!.id).toBe(1);
    expect(q!.pattern).toBe('intimacy_avoidance');
  });

  it('returns undefined for out-of-range ID', () => {
    expect(getQuestionById(999)).toBeUndefined();
  });
});

// ── CPS_PATTERNS / CPS_QUESTIONS data integrity ────────────

describe('CPS data integrity', () => {
  it('has exactly 10 patterns', () => {
    expect(CPS_PATTERNS).toHaveLength(10);
  });

  it('has exactly 63 questions', () => {
    expect(CPS_QUESTIONS).toHaveLength(63);
  });

  it('every question belongs to a valid pattern', () => {
    for (const q of CPS_QUESTIONS) {
      const pattern = CPS_PATTERNS.find((p) => p.key === q.pattern);
      expect(pattern, `Question ${q.id} references unknown pattern "${q.pattern}"`).toBeDefined();
    }
  });

  it('every pattern.questions list matches the questions that reference it', () => {
    for (const pattern of CPS_PATTERNS) {
      const questionIdsFromQuestions = CPS_QUESTIONS
        .filter((q) => q.pattern === pattern.key)
        .map((q) => q.id)
        .sort((a, b) => a - b);
      const questionIdsFromPattern = [...pattern.questions].sort((a, b) => a - b);
      expect(questionIdsFromPattern).toEqual(questionIdsFromQuestions);
    }
  });

  it('all question IDs are unique', () => {
    const ids = CPS_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has valid requirements', () => {
    expect(CPS_REQUIREMENTS.minMessages).toBeGreaterThan(0);
    expect(CPS_REQUIREMENTS.minTimespanMonths).toBeGreaterThan(0);
  });

  it('has a non-empty disclaimer', () => {
    expect(CPS_DISCLAIMER.length).toBeGreaterThan(0);
  });
});

// ── calculatePatternResults ─────────────────────────────────

describe('calculatePatternResults', () => {
  it('returns results for all 10 patterns', () => {
    const results = calculatePatternResults({});
    const keys = Object.keys(results);
    expect(keys).toHaveLength(10);
    for (const pattern of CPS_PATTERNS) {
      expect(results[pattern.key]).toBeDefined();
    }
  });

  it('all zeros when no answers provided', () => {
    const results = calculatePatternResults({});
    for (const key of Object.keys(results)) {
      const r = results[key];
      expect(r.yesCount).toBe(0);
      expect(r.total).toBe(0);
      expect(r.percentage).toBe(0);
      expect(r.frequency).toBe('not_observed');
      expect(r.meetsThreshold).toBe(false);
      expect(r.confidence).toBe(0);
    }
  });

  it('all yes answers for one pattern gives 100% and pervasive', () => {
    const answers = makePatternAnswers('intimacy_avoidance', true, 90);
    const results = calculatePatternResults(answers);

    const ia = results['intimacy_avoidance'];
    expect(ia.yesCount).toBe(6); // intimacy_avoidance has 6 questions
    expect(ia.total).toBe(6);
    expect(ia.percentage).toBe(100);
    expect(ia.frequency).toBe('pervasive');
    expect(ia.meetsThreshold).toBe(true);
    expect(ia.confidence).toBe(90);
  });

  it('all no answers for one pattern gives 0% and not_observed', () => {
    const answers = makePatternAnswers('control_perfectionism', false, 70);
    const results = calculatePatternResults(answers);

    const cp = results['control_perfectionism'];
    expect(cp.yesCount).toBe(0);
    expect(cp.total).toBe(6);
    expect(cp.percentage).toBe(0);
    expect(cp.frequency).toBe('not_observed');
    expect(cp.meetsThreshold).toBe(false);
    expect(cp.confidence).toBe(70);
  });

  it('null answers are not counted toward total', () => {
    const answers: Record<number, CPSAnswer> = {};
    // intimacy_avoidance: questions 1-6
    // Set 3 yes, 1 no, 2 null
    answers[1] = makeAnswer(true);
    answers[2] = makeAnswer(true);
    answers[3] = makeAnswer(true);
    answers[4] = makeAnswer(false);
    answers[5] = makeAnswer(null);
    answers[6] = makeAnswer(null);

    const results = calculatePatternResults(answers);
    const ia = results['intimacy_avoidance'];

    expect(ia.yesCount).toBe(3);
    expect(ia.total).toBe(4); // only non-null count
    expect(ia.percentage).toBe(75); // 3/4 = 75%
    expect(ia.frequency).toBe('pervasive');
    expect(ia.meetsThreshold).toBe(true);
  });

  it('confidence is average of non-null answers', () => {
    const answers: Record<number, CPSAnswer> = {};
    answers[1] = makeAnswer(true, 60);
    answers[2] = makeAnswer(false, 80);
    answers[3] = makeAnswer(null, 50); // should not be counted

    const results = calculatePatternResults(answers);
    const ia = results['intimacy_avoidance'];

    // Average of 60 and 80 = 70
    expect(ia.confidence).toBe(70);
  });

  it('meetsThreshold is true for recurring and pervasive only', () => {
    // occasional = 25% or below, should NOT meet threshold
    const answers: Record<number, CPSAnswer> = {};
    // over_dependence has 7 questions (7-13)
    // 1 yes out of 7 = ~14% = occasional
    answers[7] = makeAnswer(true);
    answers[8] = makeAnswer(false);
    answers[9] = makeAnswer(false);
    answers[10] = makeAnswer(false);
    answers[11] = makeAnswer(false);
    answers[12] = makeAnswer(false);
    answers[13] = makeAnswer(false);

    const results = calculatePatternResults(answers);
    const od = results['over_dependence'];

    expect(od.yesCount).toBe(1);
    expect(od.total).toBe(7);
    expect(od.percentage).toBe(14); // Math.round(1/7*100) = 14
    expect(od.frequency).toBe('occasional');
    expect(od.meetsThreshold).toBe(false);
  });

  it('correctly handles all 63 answers as yes', () => {
    const answers = makeAllAnswers(true, 85);
    const results = calculatePatternResults(answers);

    for (const pattern of CPS_PATTERNS) {
      const r = results[pattern.key];
      expect(r.yesCount).toBe(pattern.questions.length);
      expect(r.total).toBe(pattern.questions.length);
      expect(r.percentage).toBe(100);
      expect(r.frequency).toBe('pervasive');
      expect(r.meetsThreshold).toBe(true);
      expect(r.confidence).toBe(85);
    }
  });

  it('correctly handles all 63 answers as no', () => {
    const answers = makeAllAnswers(false, 90);
    const results = calculatePatternResults(answers);

    for (const pattern of CPS_PATTERNS) {
      const r = results[pattern.key];
      expect(r.yesCount).toBe(0);
      expect(r.total).toBe(pattern.questions.length);
      expect(r.percentage).toBe(0);
      expect(r.frequency).toBe('not_observed');
      expect(r.meetsThreshold).toBe(false);
    }
  });

  it('stores per-question answers in each pattern result', () => {
    const answers: Record<number, CPSAnswer> = {};
    answers[1] = makeAnswer(true, 90);
    answers[2] = makeAnswer(false, 70);

    const results = calculatePatternResults(answers);
    const ia = results['intimacy_avoidance'];

    expect(ia.answers[1]).toBeDefined();
    expect(ia.answers[1].answer).toBe(true);
    expect(ia.answers[2]).toBeDefined();
    expect(ia.answers[2].answer).toBe(false);
    // Question 3 was not provided
    expect(ia.answers[3]).toBeUndefined();
  });

  it('answers for unrelated questions do not affect a pattern', () => {
    // Question 58 belongs to passive_aggression, not intimacy_avoidance
    const answers: Record<number, CPSAnswer> = {};
    answers[58] = makeAnswer(true, 90);

    const results = calculatePatternResults(answers);
    const ia = results['intimacy_avoidance'];

    expect(ia.yesCount).toBe(0);
    expect(ia.total).toBe(0);

    const pa = results['passive_aggression'];
    expect(pa.yesCount).toBe(1);
    expect(pa.total).toBe(1);
  });
});

// ── getTopPatterns ──────────────────────────────────────────

describe('getTopPatterns', () => {
  it('returns top N patterns sorted by percentage descending', () => {
    const answers = {
      ...makePatternAnswers('passive_aggression', true, 80),     // 100%
      ...makePatternAnswers('emotional_distance', false, 80),     // 0%
      ...makePatternAnswers('intimacy_avoidance', true, 80),      // 100%
    };

    const results = calculatePatternResults(answers);
    const top = getTopPatterns(results, 2);

    expect(top).toHaveLength(2);
    // Both passive_aggression and intimacy_avoidance are at 100%, emotional_distance at 0%
    const topKeys = top.map((t) => t.key);
    expect(topKeys).toContain('passive_aggression');
    expect(topKeys).toContain('intimacy_avoidance');
    expect(topKeys).not.toContain('emotional_distance');
  });

  it('defaults to 4 results', () => {
    const results = calculatePatternResults(makeAllAnswers(true));
    const top = getTopPatterns(results);
    expect(top).toHaveLength(4);
  });

  it('each entry has key, result, and pattern', () => {
    const results = calculatePatternResults(makeAllAnswers(true));
    const top = getTopPatterns(results, 1);
    expect(top[0].key).toBeDefined();
    expect(top[0].result).toBeDefined();
    expect(top[0].pattern).toBeDefined();
    expect(top[0].pattern.key).toBe(top[0].key);
  });
});

// ── getOverallRiskLevel ─────────────────────────────────────

describe('getOverallRiskLevel', () => {
  it('returns niski when no thresholds met', () => {
    const results = calculatePatternResults({});
    const risk = getOverallRiskLevel(results);
    expect(risk.level).toBe('niski');
  });

  it('returns umiarkowany when 1 pattern meets threshold', () => {
    // Make one pattern recurring (meetsThreshold = true)
    const answers = makePatternAnswers('intimacy_avoidance', true, 80);
    const results = calculatePatternResults(answers);
    const risk = getOverallRiskLevel(results);
    expect(risk.level).toBe('umiarkowany');
  });

  it('returns podwyzszony when 2 patterns meet threshold', () => {
    const answers = {
      ...makePatternAnswers('intimacy_avoidance', true, 80),
      ...makePatternAnswers('passive_aggression', true, 80),
    };
    const results = calculatePatternResults(answers);
    const risk = getOverallRiskLevel(results);
    expect(risk.level).toBe('podwyższony');
  });

  it('returns wysoki when 4+ patterns meet threshold', () => {
    const answers = {
      ...makePatternAnswers('intimacy_avoidance', true, 80),
      ...makePatternAnswers('passive_aggression', true, 80),
      ...makePatternAnswers('emotional_intensity', true, 80),
      ...makePatternAnswers('control_perfectionism', true, 80),
    };
    const results = calculatePatternResults(answers);
    const risk = getOverallRiskLevel(results);
    expect(risk.level).toBe('wysoki');
  });

  it('returns wysoki when 5+ patterns have percentage >= 75', () => {
    const answers = makeAllAnswers(true, 80);
    const results = calculatePatternResults(answers);
    const risk = getOverallRiskLevel(results);
    expect(risk.level).toBe('wysoki');
  });

  it('always returns a description string', () => {
    const results = calculatePatternResults({});
    const risk = getOverallRiskLevel(results);
    expect(risk.description).toBeTruthy();
    expect(typeof risk.description).toBe('string');
  });
});
