# PodTeksT Engine — Threshold & Constant Reference

All hardcoded constants used in the quantitative analysis engine.
Each entry: **value**, **file:line**, **rationale**.

---

## Session & Timing

| Constant | Value | File | Rationale |
|---|---|---|---|
| SESSION_GAP_MS | 6h (21,600,000ms) | constants.ts | Overnight convention. 4h: +30% sessions. 8h: -20% sessions. |
| LATE_NIGHT_HOURS | 22:00-04:00 | constants.ts | Consistent across intimacy, chronotype, helpers |
| PURSUIT_WINDOW_MS | 30min | pursuit-withdrawal.ts | Consecutive messages within 30min = same burst |
| WITHDRAWAL_THRESHOLD_MS | 4h | pursuit-withdrawal.ts | Silence after burst. 2h too normal (lunch/commute) |
| MIN_CONSECUTIVE | 4 msgs | pursuit-withdrawal.ts | 3 msgs = normal message-splitting |
| OVERNIGHT_SUPPRESSION | 21:00-09:00 | pursuit-withdrawal.ts | Extended for timezone uncertainty |
| OVERNIGHT_MAX_GAP | 12h | pursuit-withdrawal.ts | >12h always suppressed (day off, not withdrawal) |

## Conflict Detection

| Constant | Value | File | Rationale |
|---|---|---|---|
| ROLLING_WINDOW_SIZE | 10 msgs | conflicts.ts | Stable baseline without over-smoothing |
| ESCALATION_MULTIPLIER | 2x | conflicts.ts | 1.5x: too sensitive. 3x: only extreme rants |
| ESCALATION_CONFIRM_WINDOW_MS | 15min | conflicts.ts | Captures rapid back-and-forth exchanges |
| MIN_ESCALATION_GAP_MS | 4h | conflicts.ts | Deduplication — one event per distinct conflict |
| INTENSE_MSG_PER_HOUR | 8 | conflicts.ts | Casual: 2-4. Heated: 10-20. Threshold: moderate |
| COLD_SILENCE_MS | 24h | conflicts.ts | Deliberate disengagement vs normal daily rhythm |
| INTENSITY_LOOKBACK_MS | 1h | conflicts.ts | Aligns with INTENSE_MSG_PER_HOUR threshold |
| PRE_SILENCE_MSG_COUNT | 5 | conflicts.ts | Enough to confirm bidirectional exchange |
| MIN_SILENCE_GAP_MS | 12h | conflicts.ts | Silence event deduplication |
| MIN_MESSAGES (conflicts) | 50 | conflicts.ts | Enough history for rolling window baselines |

## Scoring Formulas

| Formula | Value | File | Rationale |
|---|---|---|---|
| Guiraud's R | unique/sqrt(total) | quantitative.ts | Replaces TTR — corrects Heaps' Law bias (Guiraud 1960) |
| Codependency weights | 0.35+0.18+0.27+0.20=1.0 | threat-meters.ts | Initiation imbalance highest signal |
| Trust weights | 0.40+0.40+0.20=1.0 | threat-meters.ts | Reciprocity + RT consistency + ghost risk |
| Damage weights | 0.35+0.25+0.20+0.20=1.0 | damage-report.ts | 80% quant + 20% AI health |
| RT asymmetry ×30 | log10 scale | threat-meters.ts | 2x diff → 9 points. ±1 OOM → 0-30 |
| DT norm cap | 80/1000 | threat-meters.ts | 8% DT rate = saturation |
| Pursuit /8 | 8 msgs = 100% | threat-meters.ts | 8+ consecutive = extreme burst |
| IC compression | ×6.5 | integrative-complexity.ts | 0-15 phrases/100msgs → 0-100. Heuristic |
| Repair ×500 | 0.2% rate → 100 | repair-patterns.ts | Typical: 0.01-0.05% |
| Granularity 70/30 | diversity/coverage | emotional-granularity.ts | Kashdan 2015: type diversity is core |
| Granularity ×300 | coverage multiplier | emotional-granularity.ts | 10% density → max score |
| Co-occurrence 0.3 | penalty cap | emotional-granularity.ts | Moderate 30% max reduction |
| Temporal 0.35/0.20 | past/future thresholds | temporal-focus.ts | Polish empirical, NOT LIWC-calibrated |
| RT trend ÷1200 | scoring factor | viral-scores.ts | 60s/month change → 50 points |
| Length trend ÷25 | scoring factor | viral-scores.ts | 2 words/month → 50 points |
| Reaction rate ×500 | scoring factor | viral-scores.ts | 20% rate → score 100 |

## Minimum Sample Sizes

| Module | Threshold | Returns when below |
|---|---|---|
| bid-response | 10 bids | undefined |
| chronotype | 20 msgs/person | undefined |
| conflicts | 50 msgs | empty ConflictAnalysis |
| emotional-granularity | 200 words/person | skips person |
| integrative-complexity | 30 msgs/person + 3 phrases | skips person |
| lsm | 50 tokens/person | undefined |
| pronouns | 200 words/person | skips person |
| pursuit-withdrawal | 50 msgs + 2 participants | undefined |
| reciprocity | 30 msgs + 2 participants | default balanced |
| repair-patterns | 100 msgs | undefined |
| shift-support | 10 responses/person | skips person |
| temporal-focus | 500 words/person | skips person |
| trends | 2 months | empty arrays |
| ghost risk | 3 months data | null |

## Classification Thresholds

| Metric | Thresholds | File |
|---|---|---|
| Communication Grade | A:80+ B:65+ C:45+ D:25+ F:<25 reciprocity | damage-report.ts |
| Threat level | low:<30 moderate:30-49 elevated:50-74 critical:75+ | threat-meters.ts |
| Cold silence severity | 1:24-47h 2:48-71h 3:72h+ | conflicts.ts |
| Pursuit mutual | <20% diff between senders = "mutual" | pursuit-withdrawal.ts |
| Chronotype match | <=2h:90+ 2-4h:70-90 4-6h:40-70 >6h:<40 | chronotype.ts |

## AI Temperature Configuration

| Context | Temperature | Rationale |
|---|---|---|
| Pass 1-3A, CPS | 0.1 (ANALYTICAL) | Structured JSON, Big Five ±0.5 variance |
| Pass 3B, Pass 4 | 0.3 (SYNTHESIS) | Slight creativity for narrative insights |
| Court, Enhanced Roast, Subtext | 0.5 (SEMI_CREATIVE) | Balanced factual/stylistic |
| Dating Profile, Stand-Up, Mega Roast | 0.7 (CREATIVE) | Maximum voice variety |

## Confidence Caps (Post-Processing)

| Pass | Max Confidence | Rationale |
|---|---|---|
| Pass 3A personality | 85 | Big Five from chat cannot reach clinical certainty |
| Pass 3B clinical | 60 | Behavioral patterns ≠ clinical diagnosis |
| Attachment style | 65 | Requires clinical interview for higher confidence |
| Pass 4 predictions | 75 | Cannot predict external life events |

---

*Last updated: Phase 4 of engine audit. See metric-registry.ts for experimental flags.*
