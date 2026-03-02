# PodTeksT Metrics Registry

**Date:** 2026-02-28
**Total Metrics Cataloged:** 120+
**Status Legend:**
- **VALIDATED** — Methodology sound, edge cases handled, research-backed
- **NEEDS_REVIEW** — Methodology reasonable but has known issues
- **EXPERIMENTAL** — No research basis, heuristic-only, or stub implementation

---

## 1. Volume Metrics

Computed in: `src/lib/analysis/quantitative.ts` (main loop + `buildPerPersonMetrics()`)

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| totalMessages | quantitative.ts:192 | Counter increment per message | Raw count | N/A — basic counting | Includes media-only messages (no text). Not normalized for duration. | VALIDATED |
| totalWords | quantitative.ts:194 | `countWords(msg.content)` — whitespace split | Sum | N/A | Counts URL words, emoji adjacent text. Media messages = 0 words. | VALIDATED |
| totalCharacters | quantitative.ts:195 | `msg.content.length` | Sum | N/A | Includes whitespace, URLs, emoji codepoints. | VALIDATED |
| averageMessageLength | quantitative.ts:601 | `totalWords / totalMessages` | Mean | N/A | Denominator includes empty/media messages → deflates average. | NEEDS_REVIEW |
| averageMessageChars | quantitative.ts:603 | `totalCharacters / totalMessages` | Mean | N/A | Same deflation issue as averageMessageLength. | NEEDS_REVIEW |
| longestMessage | quantitative.ts:199-205 | Track max wordCount across non-empty messages | Maximum | N/A | Stores content, length, timestamp. Skips empty. | VALIDATED |
| shortestMessage | quantitative.ts:206-213 | Track min wordCount across non-empty messages | Minimum | N/A | Init at Infinity, properly handled in buildPerPersonMetrics. | VALIDATED |
| uniqueWords | quantitative.ts:618 | `wordFreq.size` (Set cardinality) | Count of distinct tokens | N/A | Depends on tokenizer: min 2 chars, stopwords excluded, NFC normalized. | VALIDATED |
| vocabularyRichness | quantitative.ts:619-624 | `uniqueWords / totalTokenizedWords` (TTR) | Type-Token Ratio | Herdan (1960) | TTR decreases with text length (Herdan's law). Not comparable across different-length texts. | NEEDS_REVIEW |
| topWords | quantitative.ts:616 | Top 20 from word frequency map | Frequency ranking | N/A | Stopwords filtered via `tokenizeWords()`. Min 2 chars. | VALIDATED |
| topPhrases | quantitative.ts:617 | Top 10 bigrams from phrase frequency map | Frequency ranking | N/A | Adjacent token pairs only, no trigrams. | VALIDATED |
| messagesWithEmoji | quantitative.ts:218 | Messages containing ≥1 emoji | Count | N/A | Uses `Intl.Segmenter` for ZWJ sequences. | VALIDATED |
| emojiCount | quantitative.ts:219 | Total emoji characters across all messages | Sum | N/A | ZWJ sequences counted as 1 emoji each. | VALIDATED |
| topEmojis | quantitative.ts:608 | Top 10 from emoji frequency map | Frequency ranking | N/A | | VALIDATED |
| questionsAsked | quantitative.ts:227-229 | Messages containing `?` (URLs stripped first) | Count | N/A | URL query params excluded. But rhetorical `?` and multi-`?` counted. | NEEDS_REVIEW |
| mediaShared | quantitative.ts:245 | `msg.hasMedia` flag count | Count | N/A | Platform-dependent. WhatsApp: `<Media omitted>`. | VALIDATED |
| linksShared | quantitative.ts:246 | `msg.hasLink` flag count | Count | N/A | | VALIDATED |
| unsentMessages | quantitative.ts:247 | `msg.isUnsent` flag count | Count | N/A | Only available on Messenger/Instagram. | VALIDATED |
| reactionsGiven | quantitative.ts:265-271 | Attributed via reaction.actor matching | Count | N/A | Discord: no actor info → always 0. Messenger: NFC-normalized actor lookup. | NEEDS_REVIEW |
| reactionsReceived | quantitative.ts:254 | Sum of reactions on person's messages | Count | N/A | Discord: uses `count` field. Other platforms: per-reaction increment. | VALIDATED |
| messagesReceived | quantitative.ts:276-280 | Incremented for all OTHER participants per message | Count | N/A | Used for reactionRate denominator. Undefined for single-participant conversations. | VALIDATED |

---

## 2. Timing Metrics

Computed in: `src/lib/analysis/quantitative.ts` (main loop + `buildTimingPerPerson()`)

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| averageResponseTimeMs | quantitative.ts:637-638 | Mean of filtered response times | Mean (after IQR outlier filter) | N/A | Includes both within-session and return-to-session times. Burst messages inflate it. | NEEDS_REVIEW |
| medianResponseTimeMs | quantitative.ts:639 | `median()` of filtered response times | Median | N/A | Same burst message issue as mean. No trimmed mean/IQR/percentiles exposed. | NEEDS_REVIEW |
| fastestResponseMs | quantitative.ts:640 | `min()` of filtered times | Minimum | N/A | May be 0ms for automated/bot messages. | VALIDATED |
| slowestResponseMs | quantitative.ts:641 | `max()` of filtered times | Maximum | N/A | Capped by 6h session gap. | VALIDATED |
| responseTimeTrend | quantitative.ts:648 | Linear regression slope of monthly median RTs | Linear regression slope | N/A | Monthly aggregation may have sparse months. | VALIDATED |
| conversationInitiations | quantitative.ts:286-313 | First message after 6h gap counts as initiation | Count per person | N/A | Session gap hardcoded at 6h. | NEEDS_REVIEW |
| conversationEndings | quantitative.ts:301,411 | Last message before 6h gap counts as ending | Count per person | N/A | | VALIDATED |
| longestSilence | quantitative.ts:317-325 | Max gap between consecutive messages | Duration (ms), timestamps, senders | N/A | Includes overnight/vacation gaps. No context classification. | VALIDATED |
| lateNightMessages | quantitative.ts:340-341 | Messages between 22:00-04:00 | Count per person | N/A | Uses browser local timezone. No timezone awareness. | NEEDS_REVIEW |
| totalSessions | quantitative.ts:285,299 | Count of 6h+ gaps + 1 | Count | N/A | Hardcoded 6h threshold. | NEEDS_REVIEW |

---

## 3. Engagement Metrics

Computed in: `src/lib/analysis/quantitative.ts:662-694` (`buildEngagementMetrics()`)

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| messageRatio | quantitative.ts:674 | `personMessages / totalMessages` | Proportion | N/A | | VALIDATED |
| reactionRate | quantitative.ts:676 | `reactionsGiven / messagesReceived` | Rate | N/A | Discord: always 0 (no actor data). | NEEDS_REVIEW |
| reactionGiveRate | quantitative.ts:678 | `reactionsGiven / totalMessages` | Rate | N/A | Per-person messages as denominator. Discord: 0. | NEEDS_REVIEW |
| reactionReceiveRate | quantitative.ts:680 | `reactionsReceived / totalMessages` | Rate | N/A | | VALIDATED |
| doubleTexts | quantitative.ts:348-351 | 2+ consecutive messages from same sender | Count per person | N/A | Threshold of 2 consecutive = 1 double text. | VALIDATED |
| maxConsecutive | quantitative.ts:353-356 | Max consecutive messages from same sender | Maximum count | N/A | | VALIDATED |
| avgConversationLength | quantitative.ts:691 | `totalMessages / totalSessions` | Mean | N/A | Session definition impacts this heavily. | NEEDS_REVIEW |

---

## 4. Pattern Metrics

Computed in: `src/lib/analysis/quantitative.ts:697-723` + `quant/bursts.ts` + `quant/trends.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| monthlyVolume | quantitative.ts:704-708 | Group messages by YYYY-MM key | Count per month per person | N/A | Uses local timezone for month assignment. | VALIDATED |
| weekdayWeekend | quantitative.ts:716-719 | Split by `isWeekend()` (Sat/Sun) | Count per category per person | N/A | Cultural weekend differences (Fri-Sat in some regions) not handled. | VALIDATED |
| volumeTrend | quantitative.ts:711 | `linearRegressionSlope(monthlyTotals)` | Linear regression slope | N/A | Simple OLS, no seasonality handling. | VALIDATED |
| bursts | quant/bursts.ts | Days with count > mean + 2*stddev | List of {date, count, z-score} | N/A — basic statistical outlier detection | Z-score threshold of 2 is standard. | VALIDATED |

---

## 5. Linguistic Metrics

### 5.1 Sentiment Analysis

Computed in: `src/lib/analysis/quant/sentiment.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| avgSentiment | sentiment.ts | Mean of per-message `(pos-neg)/total` scores | Mean, range [-1, 1] | AFINN-165, plWordNet-emo, NAWL (Riegel 2015) | Dictionary-based. No context understanding. 2-token negation window. | NEEDS_REVIEW |
| positiveRatio | sentiment.ts | Fraction of messages with score > 0 | Proportion | Same as above | | VALIDATED |
| negativeRatio | sentiment.ts | Fraction of messages with score < 0 | Proportion | Same as above | | VALIDATED |
| neutralRatio | sentiment.ts | Fraction of messages with score = 0 | Proportion | Same as above | High neutral rate for messages without dictionary hits. | VALIDATED |
| emotionalVolatility | sentiment.ts | Standard deviation of per-message scores | Std. Dev. | N/A | Sensitive to message count distribution. | VALIDATED |
| sentimentTrend | sentiment.ts | Monthly average sentiment per person | Time series | N/A | | VALIDATED |

### 5.2 Language Style Matching (LSM)

Computed in: `src/lib/analysis/quant/lsm.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| overall | lsm.ts:197-199 | Mean of per-category LSM scores | Mean of `1 - |rateA-rateB|/(rateA+rateB+ε)` | Ireland & Pennebaker (2010) | Bilingual PL+EN dictionaries may conflate. Static measure, not temporal. | NEEDS_REVIEW |
| perCategory | lsm.ts:191-193 | Per-category LSM formula | Per-category [0,1] | Ireland & Pennebaker (2010) | 9 categories. PL "articles" approximated with demonstratives. | NEEDS_REVIEW |
| interpretation | lsm.ts:204-209 | Threshold-based labels | Categorical | Burke & Rauer 2022, Cannava & Bodie 2017 | Thresholds from couple studies, may not apply to friendships. | NEEDS_REVIEW |
| adaptationDirection (chameleon) | lsm.ts:212-227 | Static proximity to midpoint | Deviation comparison | N/A — NOT temporal adaptation | Misleading label — measures static proximity, not active adaptation. | EXPERIMENTAL |

### 5.3 Pronoun Analysis

Computed in: `src/lib/analysis/quant/pronouns.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| I-rate / We-rate / You-rate | pronouns.ts | Count of pronoun tokens / total words * 1000 | Per-1000-word rate | Pennebaker (2011) | Full Polish declension forms. Rate per 1000 words. | VALIDATED |
| relationship orientation | pronouns.ts | We-rate vs I-rate comparison | Categorical | Pennebaker (2011) | Binary classification (individual vs couple orientation). | VALIDATED |

### 5.4 Temporal Focus

Computed in: `src/lib/analysis/quant/temporal-focus.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| pastRate / presentRate / futureRate | temporal-focus.ts | Marker word counting per 1000 words | Per-1000-word rate | Pennebaker LIWC 2007 | Polish verb morphology too complex for simple markers. Aspect not handled. | NEEDS_REVIEW |
| futureIndex | temporal-focus.ts | `futureRate / (pastRate + presentRate + futureRate)` | Ratio [0,1] | N/A | | VALIDATED |
| orientation | temporal-focus.ts | Categorical from futureIndex | Categorical | N/A | | VALIDATED |

### 5.5 Integrative Complexity (IC)

Computed in: `src/lib/analysis/quant/integrative-complexity.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| icScore | integrative-complexity.ts:105-111 | `(diff + integ*2) / total * 100 * 6.5`, capped at 100 | Normalized count [0-100] | Suedfeld & Tetlock 1977, Conway AutoIC 2014 | Phrase-based heuristic, not full IC coding. 6.5x multiplier arbitrary. | NEEDS_REVIEW |
| differentiationCount | integrative-complexity.ts | Count of differentiation phrases (PL: 27, EN: 19) | Count | Same | Small phrase dictionaries. Chat language may use informal differentiation. | NEEDS_REVIEW |
| integrationCount | integrative-complexity.ts | Count of integration phrases (PL: 18, EN: 14) | Count | Same | Very small dictionary — integration phrases rare in chat. | NEEDS_REVIEW |
| trend | integrative-complexity.ts:178 | Monthly IC linear regression | Slope | Tetlock 1981 | Monthly granularity may be too coarse for conflict escalation. | NEEDS_REVIEW |
| conflictCorrelation | integrative-complexity.ts:200 | **STUB — always returns 0** | N/A | Suedfeld & Tetlock 1977 | Not implemented despite being in the type interface. | EXPERIMENTAL |

### 5.6 Conversational Repair Patterns

Computed in: `src/lib/analysis/quant/repair-patterns.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| selfRepairRate | repair-patterns.ts:142 | Self-repair markers per 100 messages | Rate per 100 | Schegloff, Jefferson & Sacks 1977 | PL: 28 markers, EN: 12 markers. Marker lists too small for natural chat variation. | NEEDS_REVIEW |
| otherRepairRate | repair-patterns.ts:143 | Other-repair markers per 100 messages | Rate per 100 | Same | PL: 18 markers, EN: 14 markers. Misses emoji-based and edit-based repairs. | NEEDS_REVIEW |
| repairInitiationRatio | repair-patterns.ts:144 | `selfRepairs / (selfRepairs + otherRepairs + ε)` | Ratio [0,1] | Same | | VALIDATED |
| mutualRepairIndex | repair-patterns.ts:161 | `totalRepairs / totalMessages * 500`, capped 100 | Normalized [0-100] | N/A | 500x multiplier is arbitrary. | EXPERIMENTAL |

### 5.7 Emotional Granularity

Computed in: `src/lib/analysis/quant/emotional-granularity.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| granularityScore | emotional-granularity.ts | Diversity × density formula | Composite [0-100] | Vishnubhotla 2024, Kashdan 2015 | Sensitive to message length. Short emotional messages score higher density. | NEEDS_REVIEW |
| granularityScoreV2 | emotional-granularity.ts | Adjusted for co-occurrence (Jaccard) | Composite [0-100] | Same + Suvak 2011 | | NEEDS_REVIEW |
| categoryCooccurrenceIndex | emotional-granularity.ts | Jaccard similarity per message | Index [0-1] | N/A | | VALIDATED |

---

## 6. Behavioral Metrics

### 6.1 Pursuit-Withdrawal

Computed in: `src/lib/analysis/quant/pursuit-withdrawal.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| cycleCount | pursuit-withdrawal.ts:86 | Detected pursuit-withdrawal cycles | Count | Christensen & Heavey 1990 | Min 4 consecutive messages, 4h withdrawal, overnight suppression. Requires 2+ cycles. | NEEDS_REVIEW |
| pursuer / withdrawer | pursuit-withdrawal.ts:96-102 | Most frequent pursuit burst sender | Role assignment | Same | "mutual" if within 10% — reasonable threshold. | VALIDATED |
| avgCycleDurationMs | pursuit-withdrawal.ts:105-106 | Mean withdrawal duration | Mean (ms) | N/A | | VALIDATED |
| escalationTrend | pursuit-withdrawal.ts:110-117 | First-half vs second-half avg duration comparison | Ratio | N/A | Binary split is crude; linear regression would be better. | NEEDS_REVIEW |

### 6.2 Shift-Support (Conversational Narcissism Index)

Computed in: `src/lib/analysis/quant/shift-support.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| CNI per person | shift-support.ts | Shift-response ratio per person [0-100] | Ratio | Derber 1979, Vangelisti et al. 1990 | Designed for face-to-face conversation. Chat is inherently multi-threaded. | NEEDS_REVIEW |

### 6.3 Bid-Response Ratio

Computed in: `src/lib/analysis/quant/bid-response.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| bidSuccessRate | bid-response.ts:120 | % of person's bids acknowledged | Percentage [0-100] | Driver & Gottman 2004 | Bid detection too broad (every `?` = bid). Classification too lenient (≥5 chars = toward). | NEEDS_REVIEW |
| responseRate | bid-response.ts:121 | % of partner's bids person responded to | Percentage [0-100] | Same | Same issues — inflated rates. | NEEDS_REVIEW |
| overallResponseRate | bid-response.ts:128 | Total toward / total bids | Percentage [0-100] | Same | Gottman benchmark (86%) from face-to-face couples. Chat dynamics differ. | NEEDS_REVIEW |

### 6.4 Conflict Detection

Computed in: `src/lib/analysis/quant/conflicts.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| totalConflicts | conflicts.ts | Detected conflict events | Count | Gottman & Levenson 2000 | Uses accusatory bigrams (PL+EN), timing spikes, negative sentiment co-occurrence. | NEEDS_REVIEW |
| events | conflicts.ts | List of {timestamp, participants, severity} | Event list | Same | | VALIDATED |

### 6.5 Conflict Fingerprint

Computed in: `src/lib/analysis/quant/conflict-fingerprint.ts` (referenced in CLAUDE.md)

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| Per-person conflict behavior | conflict-fingerprint.ts | Behavior profiles during conflicts | Multi-dimensional | N/A | Limited documentation available. | NEEDS_REVIEW |

---

## 7. Composite Metrics

### 7.1 Reciprocity Index

Computed in: `src/lib/analysis/quant/reciprocity.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| overall | reciprocity.ts:92-97 | Weighted: msgBal×0.30 + initBal×0.25 + rtSym×0.15 + reactBal×0.30 | Weighted average [0-100] | N/A | 50 = perfect balance. RT symmetry uses min/max ratio (harsh). Assumes 2 participants. | NEEDS_REVIEW |
| messageBalance | reciprocity.ts:51 | `100 * (1 - 2*|ratio - 0.5|)` | Derived [0-100] | N/A | | VALIDATED |
| initiationBalance | reciprocity.ts:57-59 | Same formula applied to initiation ratio | Derived [0-100] | N/A | | VALIDATED |
| responseTimeSymmetry | reciprocity.ts:65-70 | `min(rtA,rtB) / max(rtA,rtB) * 100` | Min/max ratio [0-100] | N/A | Harsh: 2min vs 10min = 20%. Log-ratio would be more perceptual. | NEEDS_REVIEW |
| reactionBalance | reciprocity.ts:79-89 | Same formula applied to reactions given | Derived [0-100] | N/A | Discord: fallback to mentions+replies. WhatsApp: no reactions → default 50. | NEEDS_REVIEW |

### 7.2 Threat Meters

Computed in: `src/lib/analysis/threat-meters.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| Ghost Risk | threat-meters.ts:26-30 | Max ghost risk from `viralScores.ghostRisk` | Score [0-100] | N/A | Reuses viral scores computation. | NEEDS_REVIEW |
| Codependency (Intensywność Przywiązania) | threat-meters.ts:34-71 | initImbalance×0.35 + dtNorm×0.18 + rtAsymmetry×0.27 + pursuitIntensity×0.20 | Weighted composite [0-100] | N/A — heuristic | Weight normalization verified (sums to 1.0). All components arbitrary. | EXPERIMENTAL |
| Power Imbalance (Nierównowaga Wpływu) | threat-meters.ts:80-83 | recipImbalance×0.5 + reactionImbalance×0.3 + initImbalance×0.2 | Weighted composite [0-100] | N/A | Weights sum to 1.0. All threshold levels arbitrary. | EXPERIMENTAL |
| Trust Index (Indeks Zaufania) | threat-meters.ts:89-98 | reciprocity×0.40 + responseConsistency×0.40 + (1-ghostRisk)×0.20 | Weighted composite [0-100] | N/A | Named weights. Higher = more trust. Relies on reciprocity + ghost risk. | EXPERIMENTAL |

### 7.3 Damage Report

Computed in: `src/lib/analysis/damage-report.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| emotionalDamage | damage-report.ts:42-47 | negSentiment×0.35 + conflictDensity×0.25 + recipImbalance×0.20 + aiHealthInv×0.20 | Weighted composite [0-100] | N/A | Mixes quant (80%) and AI (20%). AI health creates weak circular dependency. | EXPERIMENTAL |
| communicationGrade | damage-report.ts:51-56 | Thresholds on reciprocity: ≥80→A, ≥65→B, ≥45→C, ≥25→D, else→F | Categorical (A-F) | N/A | Based solely on reciprocity. Ignores LSM, repairs, bid-response. | EXPERIMENTAL |
| repairPotential | damage-report.ts:59-63 | Green/red flag balance + volume trend + health threshold | Composite [0-100] | N/A | Depends on AI pass outputs (pass2 flags). | EXPERIMENTAL |
| therapyBenefit | damage-report.ts:66-76 | Threshold checks on conflicts, sentiment, reciprocity, health | Categorical (HIGH/MODERATE/LOW) | N/A | Replaces binary therapy verdict. Thresholds arbitrary. | EXPERIMENTAL |

### 7.4 Viral Scores

Computed in: `src/lib/analysis/viral-scores.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| compatibilityScore | viral-scores.ts:408-414 | Mean of 5 sub-scores: activity overlap, RT symmetry, msg balance, engagement balance, length match | Mean [0-100] | N/A — entertainment metric | Equal weighting of 5 components. All heuristic. | EXPERIMENTAL |
| interestScores | viral-scores.ts:173-251 | Per-person: initiation×0.25 + rtTrend×0.20 + mlTrend×0.15 + engagement×0.20 + dt×0.10 + lateNight×0.10 | Weighted composite [0-100] | N/A | Weights arbitrary. Component normalizations vary widely. | EXPERIMENTAL |
| ghostRisk | viral-scores.ts:257-388 | Per-person: 4 trend sub-scores comparing recent 3mo vs earlier | Weighted composite [0-100] | N/A | Requires ≥3 months data. Returns 50 (neutral) for short conversations. | NEEDS_REVIEW |
| delusionScore | viral-scores.ts:429-442 | `|maxInterest - minInterest|` | Absolute difference [0-100] | N/A | Simple heuristic. <5 threshold = no delusion. | EXPERIMENTAL |

### 7.5 Ranking Percentiles

Computed in: `src/lib/analysis/ranking-percentiles.ts`

| Name | Module | Method | Measures Used | Research Basis | Known Limitations | Status |
|------|--------|--------|---------------|----------------|-------------------|--------|
| message_volume percentile | ranking-percentiles.ts:58-62 | Log-normal CDF with median=3000, sigma=1.2 | Approximate percentile | N/A — **fabricated medians** | Population medians are explicitly heuristic, not empirical. | EXPERIMENTAL |
| response_time percentile | ranking-percentiles.ts:63-67 | Inverted log-normal CDF with median=480s, sigma=1.0 | Approximate percentile (inverted) | N/A — **fabricated medians** | Same: no real population data. | EXPERIMENTAL |
| ghost_frequency percentile | ranking-percentiles.ts:68-72 | Log-normal CDF with median=12h, sigma=0.8 | Approximate percentile | N/A — **fabricated medians** | | EXPERIMENTAL |
| asymmetry percentile | ranking-percentiles.ts:73-78 | Log-normal CDF with median=20, sigma=0.9 | Approximate percentile | N/A — **fabricated medians** | | EXPERIMENTAL |

---

## 8. Derived Metrics

### 8.1 Badges

Computed in: `src/lib/analysis/badges.ts`

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| 12+ achievement badges | badges.ts | Threshold-based (Night Owl, Chatterbox, Double-Texter, etc.) | Boolean triggers | N/A — entertainment | VALIDATED |

### 8.2 Catchphrases & Best Time

Computed in: `src/lib/analysis/catchphrases.ts`

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| catchphrases | catchphrases.ts | Top distinctive phrases per person | Frequency + TF-IDF-like scoring | N/A | VALIDATED |
| bestTimeToText | catchphrases.ts | Hour with fastest median response time | Minimum median per hour | N/A | VALIDATED |

### 8.3 Chronotype Compatibility

Computed in: `src/lib/analysis/quant/chronotype.ts`

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| Behavioral chronotype | chronotype.ts | Circular midpoint of activity hours | Circular mean | Aledavood 2018, Randler 2017 | VALIDATED |
| Match score | chronotype.ts | Delta hours → 0-100 compatibility (cosine decay) | Score [0-100] | Randler 2017 | VALIDATED |
| Social jet lag | chronotype.ts | Weekday vs weekend midpoint difference | Hours | Roenneberg et al. 2012 | NEEDS_REVIEW |

### 8.4 Cognitive Functions

Computed in: `src/lib/analysis/cognitive-functions.ts`

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| MBTI → cognitive functions | cognitive-functions.ts | Static MBTI-to-function mapping | Derived | Jung 1921, Myers-Briggs | NEEDS_REVIEW |
| Clash analysis | cognitive-functions.ts | Function pair comparison | Categorical | N/A | EXPERIMENTAL |

### 8.5 Gottman Four Horsemen

Computed in: `src/lib/analysis/gottman-horsemen.ts`

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| Criticism / Contempt / Defensiveness / Stonewalling | gottman-horsemen.ts | Mapped from CPS data patterns | Score mapping | Gottman & Levenson 2000 | NEEDS_REVIEW |

### 8.6 Intimacy Progression

Computed in: `src/lib/analysis/quant/intimacy.ts`

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| Intimacy score over time | intimacy.ts | Vocabulary diversity + late night ratio + message length + heatmap overlap | Composite time series | N/A — heuristic proxy | EXPERIMENTAL |

### 8.7 Response Time Distribution

Computed in: `src/lib/analysis/quant/response-time-distribution.ts`

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| Histogram bins | response-time-distribution.ts | Response times bucketed into ranges | Frequency distribution | N/A | VALIDATED |

### 8.8 Year Milestones

Computed in: `src/lib/analysis/quant/trends.ts` (via `computeYearMilestones`)

| Name | Module | Method | Measures | Research Basis | Status |
|------|--------|--------|----------|----------------|--------|
| Peak month / worst month | trends.ts | Max/min from monthly volume | Extremes | N/A | VALIDATED |
| YoY trend | trends.ts | Year-over-year volume comparison | Ratio | N/A | VALIDATED |

---

## 9. AI-Generated Metrics

### 9.1 Main 4-Pass Analysis

Endpoint: `/api/analyze` | Prompts: `src/lib/analysis/prompts.ts` | API: `src/lib/analysis/gemini.ts`

| Name | Pass | Temperature | Output Schema | Research Basis | Status |
|------|------|-------------|---------------|----------------|--------|
| Relationship type + tone | Pass 1 | 0.3 | `Pass1Result` JSON | Attachment theory, linguistic analysis | NEEDS_REVIEW |
| Power dynamics, conflict, emotional labor | Pass 2 | 0.3 | `Pass2Result` JSON | Gottman, systemic therapy | NEEDS_REVIEW |
| Big Five, MBTI, attachment style, love languages | Pass 3A+3B | 0.3 | `PersonProfile` JSON | Costa & McCrae (Big Five), Bowlby (attachment), Chapman (love languages) | NEEDS_REVIEW |
| Health Score, flags, predictions, turning points | Pass 4 | 0.3 | `Pass4Result` JSON | Gottman (health score components) | NEEDS_REVIEW |
| Roast / Enhanced Roast | Roast | 0.5 | `RoastResult` JSON | N/A — entertainment | VALIDATED |

**Common issues across all passes:**
- Non-deterministic sampling (qualitative.ts:74)
- Confidence caps not enforced post-parsing
- Evidence indices not validated
- No prompt injection protection

### 9.2 Entertainment AI Modes

| Name | Endpoint | Temperature | Research Basis | Status |
|------|----------|-------------|----------------|--------|
| Stand-Up Comedy Roast | `/api/analyze/standup` | 0.7 | N/A | VALIDATED |
| CPS Screening (63 questions) | `/api/analyze/cps` | 0.3 | Gottman methodology adapted | NEEDS_REVIEW |
| Subtext Decoder | `/api/analyze/subtext` | 0.3 | N/A — interpretation | EXPERIMENTAL |
| Court Trial | `/api/analyze/court` | 0.5 | N/A — entertainment | VALIDATED |
| Dating Profile | `/api/analyze/dating-profile` | 0.7 | N/A — entertainment | VALIDATED |
| Reply Simulator | `/api/analyze/simulate` | 0.5 | N/A — creative | EXPERIMENTAL |
| Cwel Tygodnia | `/api/analyze/cwel` | 0.5 | N/A — entertainment | VALIDATED |
| Capitalization (ACR) | `/api/analyze/capitalization` | 0.3 | Gable et al. 2004 | NEEDS_REVIEW |
| Moral Foundations | `/api/analyze/moral-foundations` | 0.3 | Haidt & Graham 2007 | NEEDS_REVIEW |
| Emotion Causes | `/api/analyze/emotion-causes` | 0.3 | Poria et al. 2021, SemEval-2024 | NEEDS_REVIEW |

### 9.3 Delusion Quiz

Computed in: `src/lib/analysis/delusion-quiz.ts`

| Name | Module | Method | Research Basis | Status |
|------|--------|--------|----------------|--------|
| Delusion Index | delusion-quiz.ts | User guesses vs actual data, deviation scoring | N/A — self-awareness test | EXPERIMENTAL |

---

## Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| VALIDATED | 42 | 34% |
| NEEDS_REVIEW | 49 | 40% |
| EXPERIMENTAL | 32 | 26% |
| **Total** | **123** | 100% |

### Research-Backed Metrics
- **Strong:** LSM (Ireland & Pennebaker 2010), Pursuit-Withdrawal (Christensen & Heavey 1990), Sentiment (AFINN/NAWL/plWordNet), Pronouns (Pennebaker 2011), Bid-Response (Gottman 1999), Chronotype (Aledavood 2018)
- **Moderate:** IC (Suedfeld & Tetlock 1977 — but stub implementation), Repair (Schegloff 1977 — small markers), CNI (Derber 1979 — chat validity questionable), Temporal Focus (LIWC 2007 — Polish coverage limited)
- **None:** Threat Meters, Damage Report, Viral Scores, Ranking Percentiles, Intimacy Progression — all heuristic
