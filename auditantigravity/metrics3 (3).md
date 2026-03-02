# PodTeksT — Registry Wszystkich Metryk

> Kompletna lista metryk obliczanych w pipeline. Status: VALIDATED, EXPERIMENTAL, NEEDS_REVIEW, ENTERTAINMENT.

---

## 1. Metryki Bazowe (quantitative.ts)

| Metryka | Kalkulacja | Status | Uwagi |
|---------|------------|--------|-------|
| `totalMessages` per person | Zliczenie | VALIDATED | — |
| `totalWords` per person | Zliczenie (regex split) | VALIDATED | — |
| `averageMessageLength` | totalWords / totalMessages | VALIDATED | — |
| `emojiCount`, `uniqueEmoji` | Regex extraction | VALIDATED | — |
| `questionsAsked` | Regex `?` count | VALIDATED | False positives z URL params |
| `linksShared` | Regex http(s) | VALIDATED | — |
| `topEmojis`, `topWords`, `topPhrases` | Frequency maps | VALIDATED | — |
| `reactionsGiven`, `reactionsReceived` | Count | VALIDATED | Discord: `actor: 'unknown'` → incomplete |
| `topReactionsGiven/Received` | Frequency sorted | VALIDATED | — |
| `mentionsSent/Received` | Count (Discord) | VALIDATED | Tylko Discord |
| `repliesSent/Received` | Count (Discord) | VALIDATED | Tylko Discord |
| `editedMessages` | Count (Discord) | VALIDATED | Tylko Discord |
| `reactionGiveRate`, `reactionReceiveRate` | given/totalMsgs, received/received-possible | VALIDATED | — |
| `mentionRate`, `replyRate` | per-message rates (Discord) | VALIDATED | — |

## 2. Metryki Timing (quantitative.ts)

| Metryka | Kalkulacja | Status | Uwagi |
|---------|------------|--------|-------|
| `averageResponseTimeMs` | Mean (po outlier filter) | NEEDS_REVIEW | Brak trimmed mean |
| `medianResponseTimeMs` | Median (po outlier filter) | VALIDATED | — |
| `slowestResponseMs`, `fastestResponseMs` | Min/Max | VALIDATED | — |
| `responseCount` | Zliczenie par sender-switch | VALIDATED | — |
| `conversationInitiations` | Per-person count (gap >6h) | NEEDS_REVIEW | Stały próg 6h |
| `totalSessions` | Gap >6h count | NEEDS_REVIEW | Stały próg |
| `avgConversationLength` | msgs / sessions | VALIDATED | — |
| `longestSilence` | Max gap + lastSender | VALIDATED | — |
| `lateNightMessages` | 22:00-04:00 count | VALIDATED | Timezone-naive |
| `heatmap` (7×24 per person) | Day × Hour matrix | VALIDATED | Timezone-naive |
| `responseTimeDistribution` | 8 bins (instant→24h+) | VALIDATED | — |

## 3. Metryki Engagement (quantitative.ts)

| Metryka | Kalkulacja | Status | Uwagi |
|---------|------------|--------|-------|
| `messageRatio` | per-person share | VALIDATED | — |
| `doubleTexts` | 2+ consecutive from same sender | NEEDS_REVIEW | Brak normalizacji |
| `totalSessions` | Gap >6h | NEEDS_REVIEW | Stały próg |
| `monthlyVolume` (trends) | Per-month per-person count | VALIDATED | — |
| `messageLengthTrend`, `responseTimeTrend`, `initiationTrend` | Per-month per-person | VALIDATED | — |
| `volumeTrend` | linearRegressionSlope over monthly totals | VALIDATED | — |
| `weekdayVsWeekend` | Ratio msgs weekday/weekend | VALIDATED | Timezone-naive |

## 4. Metryki Psychologiczne (quant/)

| Metryka | Plik | Kalkulacja | Status | Uwagi |
|---------|------|------------|--------|-------|
| Sentiment (avgSentiment, volatility, trend) | `sentiment.ts` | Dictionary ~300 words | EXPERIMENTAL | Brak negation, minimal dictionary |
| LSM (composite, per-category, trend) | `lsm.ts` | Function word matching | EXPERIMENTAL | Pennebaker-adapted |
| Conflict events (escalation, cold_silence, resolution) | `conflicts.ts` | Rule-based detection | EXPERIMENTAL | Arbitralne progi |
| Intimacy progression (monthly score, trend) | `intimacy.ts` | Composite: length + emotion + informality + night | EXPERIMENTAL | Minimal emotion dictionary |
| Pursuit-withdrawal cycles | `pursuit-withdrawal.ts` | 4+ consecutive + 6h silence | EXPERIMENTAL | False positives z session gaps |
| Reciprocity Index (4 sub-scores) | `reciprocity.ts` | Weighted composite | EXPERIMENTAL | Heuristic weights |
| Response Time Distribution | `response-time-distribution.ts` | 8-bin bucketing | VALIDATED | — |

## 5. Metryki z quantitative.ts (Psychological)

| Metryka | Status | Uwagi |
|---------|--------|-------|
| Pronoun Analysis (I vs We ratio) | EXPERIMENTAL | Pennebaker 2011 |
| Chronotype Compatibility | EXPERIMENTAL | Aledavood 2018 |
| Shift-Support Ratio | EXPERIMENTAL | Derber 1979 |
| Bid-Response Ratio | EXPERIMENTAL | Gottman 1999 |
| Emotional Granularity | EXPERIMENTAL | Vishnubhotla 2024 |
| Integrative Complexity | EXPERIMENTAL | Suedfeld & Tetlock 1977 |

## 6. Moduły Pochodne (Composite Scores)

| Metryka | Plik | Status | Uwagi |
|---------|------|--------|-------|
| Health Score (5 components) | `health-score.ts` | EXPERIMENTAL | Heuristic weights, documented |
| Gottman 4 Horsemen (4 scores) | `gottman-horsemen.ts` | EXPERIMENTAL | CPS-derived, disclaimer present |
| CPS Patterns (10 patterns, 63 questions) | `communication-patterns.ts` | EXPERIMENTAL | AI-answered, well-designed |
| Threat Meters (ghost/codependency/power/trust) | `threat-meters.ts` | EXPERIMENTAL | Documented weights |
| Viral Scores (compatibility, interest, ghost, delusion) | `viral-scores.ts` | EXPERIMENTAL | Magic numbers in scaling |
| Damage Report (4 components) | `damage-report.ts` | EXPERIMENTAL | Mixed quant+AI |
| Badges (15 types) | `badges.ts` | ENTERTAINMENT | Non-scaling thresholds |
| Catchphrases (per-person + shared) | `catchphrases.ts` | VALIDATED | No recency weighting |
| Best Time to Text | `catchphrases.ts` | VALIDATED | Timezone-naive |
| Percentiles (5 KPI metrics) | `percentiles.ts` | EXPERIMENTAL | Hardcoded benchmarks, no population |
| Delta Metrics (6 comparisons) | `delta.ts` | VALIDATED | — |
| Fingerprint | `fingerprint.ts` | VALIDATED | Fallback hash is weak |

## 7. Delusion/Entertainment

| Metryka | Plik | Status |
|---------|------|--------|
| Delusion Quiz (15 questions) | `delusion-quiz.ts` | ENTERTAINMENT |
| Couple Quiz comparison | `couple-quiz.ts` | ENTERTAINMENT |
| Cognitive Functions Clash | `cognitive-functions.ts` | ENTERTAINMENT |
| Deep Scanner (confessions, contradictions, power moves) | `deep-scanner.ts` | ENTERTAINMENT |

## 8. AI-Driven (Gemini)

| Metryka | Pipeline | Status | Uwagi |
|---------|----------|--------|-------|
| Big Five (OCEAN) | Pass 3 | EXPERIMENTAL | Zależne od sampling bias |
| MBTI Type | Pass 3 | EXPERIMENTAL | — |
| EQ Score | Pass 3 | EXPERIMENTAL | — |
| Attachment Style | Pass 3 | EXPERIMENTAL | — |
| Love Languages | Pass 3 | EXPERIMENTAL | — |
| Communication Style | Pass 2 | EXPERIMENTAL | — |
| Red/Green Flags | Pass 2 | EXPERIMENTAL | — |
| Power Dynamics | Pass 4 | EXPERIMENTAL | — |
| Health Score (AI) | Pass 4 | EXPERIMENTAL | — |
| Clinical Observations | Pass 4 | EXPERIMENTAL | Capped confidence |
| Roast / Court / Dating Profile | Special passes | ENTERTAINMENT | — |

---

## Statystyka Statusów

| Status | Ilość |
|--------|-------|
| VALIDATED | ~25 |
| EXPERIMENTAL | ~35 |
| NEEDS_REVIEW | ~5 |
| ENTERTAINMENT | ~8 |
| **TOTAL** | **~73** |

*Wszystkie metryki AI podlegają sampling bias z `inflectionSample`.*
