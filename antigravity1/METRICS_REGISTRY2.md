# PodTeksT Metrics Registry

> Complete catalog of every computed metric. Status: **VALIDATED** ✅ | **NEEDS_REVIEW** ⚠️ | **EXPERIMENTAL** 🧪

---

## 1. Core Quantitative Metrics (quantitative.ts)

| # | Metric | Category | Method | Measures | Research Basis | Confidence | Status |
|---|--------|----------|--------|----------|---------------|------------|--------|
| 1.1 | `totalMessages` per person | Volume | Algorithmic | Count | — | ∞ (exact count) | ✅ |
| 1.2 | `totalWords` per person | Volume | Algorithmic | Count (whitespace-split) | — | High | ✅ |
| 1.3 | `totalCharacters` per person | Volume | Algorithmic | Count | — | ∞ | ✅ |
| 1.4 | `averageMessageLength` | Volume | Algorithmic | Mean (words/msg) | — | High | ⚠️ media-only msgs skew down |
| 1.5 | `averageMessageChars` | Volume | Algorithmic | Mean (chars/msg) | — | High | ⚠️ same as 1.4 |
| 1.6 | `longestMessage` | Content | Algorithmic | Max by word count | — | ∞ | ✅ |
| 1.7 | `shortestMessage` | Content | Algorithmic | Min by word count (>0) | — | ∞ | ✅ |
| 1.8 | `messagesWithEmoji` | Content | Algorithmic | Count (ZWJ-aware regex) | — | High | ✅ |
| 1.9 | `emojiCount` | Content | Algorithmic | Total emoji instances | — | High | ✅ |
| 1.10 | `topEmojis` | Content | Algorithmic | Top-10 by frequency | — | High | ✅ |
| 1.11 | `questionsAsked` | Engagement | Algorithmic | Count (contains `?`, URLs stripped) | — | Medium (rhetorical?) | ⚠️ raw count, not rate |
| 1.12 | `mediaShared` | Content | Algorithmic | Count (hasMedia flag) | — | High (parser-dependent) | ✅ |
| 1.13 | `linksShared` | Content | Algorithmic | Count (hasLink flag) | — | High | ✅ |
| 1.14 | `reactionsGiven/Received` | Engagement | Algorithmic | Count | — | High | ✅ |
| 1.15 | `topReactionsGiven` | Engagement | Algorithmic | Top-5 reactions | — | High | ✅ |
| 1.16 | `unsentMessages` | Content | Algorithmic | Count (isUnsent flag) | — | Platform-dependent | ✅ |
| 1.17 | `topWords` | Content | Algorithmic | Top-20, stopword-filtered | — | High | ✅ |
| 1.18 | `topPhrases` | Content | Algorithmic | Top-10 bigrams | — | High | ✅ |
| 1.19 | `uniqueWords` | Vocabulary | Algorithmic | Count (wordFreq map size) | — | High | ✅ |
| 1.20 | `vocabularyRichness` | Vocabulary | Algorithmic | TTR (unique/total) | — | ❌ Low — not size-normalized | ⚠️ |

---

## 2. Timing Metrics (quantitative.ts, helpers.ts)

| # | Metric | Category | Method | Measures | Known Limitations | Status |
|---|--------|----------|--------|----------|-------------------|--------|
| 2.1 | `averageResponseTimeMs` | Timing | Algorithmic | Mean (IQR-filtered) | Missing trimmed mean, percentiles | ⚠️ |
| 2.2 | `medianResponseTimeMs` | Timing | Algorithmic | Median | Correct | ✅ |
| 2.3 | `fastestResponseMs` | Timing | Algorithmic | Min | No lower fence (bot risk) | ⚠️ |
| 2.4 | `slowestResponseMs` | Timing | Algorithmic | Max (post-IQR) | After 3×IQR filter | ✅ |
| 2.5 | `responseTimeTrend` | Timing | Algorithmic | Linear regression slope on monthly medians | Crude but functional | ✅ |
| 2.6 | `conversationInitiations` | Session | Algorithmic | Count per person | 6h hardcoded threshold | ⚠️ |
| 2.7 | `conversationEndings` | Session | Algorithmic | Count per person | Same threshold | ⚠️ |
| 2.8 | `longestSilence` | Timing | Algorithmic | Max gap (ms, timestamps, senders) | No context (holiday?) | ✅ |
| 2.9 | `lateNightMessages` | Timing | Algorithmic | Count (22:00-04:00 local) | Browser timezone bias | ⚠️ |
| 2.10 | `responseTimeDistribution` | Timing | Algorithmic | Histogram (11 bins) | Uses unfiltered data | ⚠️ |

---

## 3. Engagement Metrics (quantitative.ts)

| # | Metric | Method | Notes | Status |
|---|--------|--------|-------|--------|
| 3.1 | `messageRatio` | Algorithmic | Per-person / total — correct | ✅ |
| 3.2 | `reactionRate` | Algorithmic | Given / received msgs — correct | ✅ |
| 3.3 | `reactionGiveRate` | Algorithmic | Given / own msgs | ✅ |
| 3.4 | `reactionReceiveRate` | Algorithmic | Received / own msgs | ✅ |
| 3.5 | `doubleTexts` | Algorithmic | ≥2 consecutive messages | ✅ |
| 3.6 | `maxConsecutive` | Algorithmic | Longest streak per person | ✅ |
| 3.7 | `avgConversationLength` | Algorithmic | Total msgs / sessions | ✅ |
| 3.8 | `totalSessions` | Algorithmic | 6h gap = new session | ⚠️ threshold |

---

## 4. Pattern Metrics (quantitative.ts, trends.ts, bursts.ts)

| # | Metric | Method | Notes | Status |
|---|--------|--------|-------|--------|
| 4.1 | `monthlyVolume` | Algorithmic | Per-month, per-person | ✅ |
| 4.2 | `weekdayWeekend` | Algorithmic | Split by day type | ✅ |
| 4.3 | `volumeTrend` | Algorithmic | Linear regression on monthly totals | ✅ |
| 4.4 | `bursts` | Algorithmic | z-score spike detection on daily counts | ✅ |
| 4.5 | `heatmap` (7×24) | Algorithmic | Per-person + combined | ⚠️ timezone |

---

## 5. Psychological / Communication Metrics (quant/ subdirectory)

| # | Metric | File | Method | Research Basis | Status |
|---|--------|------|--------|---------------|--------|
| 5.1 | Sentiment (per-person) | `sentiment.ts` | Algorithmic (dictionary) | NAWL, plWordNet-emo, polemo2.0 | ⚠️ no negation |
| 5.2 | Sentiment trend | `sentiment.ts` | Algorithmic | Same | ⚠️ |
| 5.3 | Emotional volatility | `sentiment.ts` | Algorithmic (SD) | — | ⚠️ not normalized |
| 5.4 | Conflict events | `conflicts.ts` | Algorithmic (multi-signal) | Conservative heuristics | ✅ |
| 5.5 | Conflict fingerprint | `conflict-fingerprint.ts` | Algorithmic | — | ✅ |
| 5.6 | Intimacy progression | `intimacy.ts` | Algorithmic (4-component) | Weighted composite | ⚠️ self-normalizing |
| 5.7 | Pursuit-withdrawal | `pursuit-withdrawal.ts` | Algorithmic | Christensen & Heavey (1990) concept | ✅ |
| 5.8 | LSM | `lsm.ts` | Algorithmic | Ireland & Pennebaker (2010) | ✅ |
| 5.9 | Pronoun analysis | `pronouns.ts` | Algorithmic | Pennebaker (2011) | ✅ |
| 5.10 | Chronotype compatibility | `chronotype.ts` | Algorithmic | Aledavood 2018, Randler 2017 | ✅ |
| 5.11 | Shift-support ratio | `shift-support.ts` | Algorithmic | Derber (1979), Vangelisti (1990) | ✅ |
| 5.12 | Emotional granularity | `emotional-granularity.ts` | Algorithmic | Vishnubhotla 2024, Kashdan 2015 | 🧪 |
| 5.13 | Bid-response ratio | `bid-response.ts` | Algorithmic | Gottman (1999), Driver & Gottman (2004) | ⚠️ over-inclusive |
| 5.14 | Integrative complexity | `integrative-complexity.ts` | Algorithmic | Suedfeld & Tetlock (1977), Conway AutoIC (2014) | ✅ |
| 5.15 | Temporal focus | `temporal-focus.ts` | Algorithmic | Pennebaker LIWC (2007) | ✅ |
| 5.16 | Repair patterns | `repair-patterns.ts` | Algorithmic | Schegloff, Jefferson & Sacks (1977) | ✅ |
| 5.17 | Reciprocity index | `reciprocity.ts` | Algorithmic | Composite (4 dimensions) | ✅ 2-person only |

---

## 6. AI-Generated Metrics (Gemini API)

| # | Metric | Source | Method | Reproducibility | Status |
|---|--------|--------|--------|----------------|--------|
| 6.1 | Relationship type | Pass 1 | AI (Gemini, t=0.3) | Low — varies between runs | ⚠️ |
| 6.2 | Tone per person | Pass 1 | AI | Low | ⚠️ |
| 6.3 | Power dynamics | Pass 2 | AI | Low | ⚠️ |
| 6.4 | Red/green flags | Pass 2 | AI | Low | ⚠️ |
| 6.5 | Intimacy markers | Pass 2 | AI | Low | ⚠️ |
| 6.6 | Big Five (range) | Pass 3A | AI | Moderate — retry logic | ⚠️ |
| 6.7 | Attachment style | Pass 3A | AI | Low | ⚠️ |
| 6.8 | MBTI | Pass 3A | AI | Low | 🧪 |
| 6.9 | Love Language | Pass 3A | AI | Low | 🧪 |
| 6.10 | Clinical observations | Pass 3B | AI | Low — disclaimer present | ⚠️ |
| 6.11 | Emotional intelligence | Pass 3B | AI (capped at 70%) | Low | 🧪 |
| 6.12 | Health score components | Pass 4 | AI | Low — weighted by heuristics | ⚠️ |
| 6.13 | Executive summary | Pass 4 | AI | Low | ⚠️ |
| 6.14 | Predictions | Pass 4 | AI | Low | 🧪 |

---

## 7. Derived/Composite Metrics

| # | Metric | File | Method | Inputs | Status |
|---|--------|------|--------|--------|--------|
| 7.1 | Health score (overall) | `health-score.ts` | Algorithmic | AI-generated components × heuristic weights | ⚠️ |
| 7.2 | Gottman horsemen | `gottman-horsemen.ts` | Algorithmic | CPS (AI) × heuristic mapping | 🧪 |
| 7.3 | Viral scores | `viral-scores.ts` | Algorithmic | Quant metrics × fun formulas | ✅ entertainment |
| 7.4 | Badges | `badges.ts` | Algorithmic | Quant thresholds | ✅ |
| 7.5 | Catchphrases | `catchphrases.ts` | Algorithmic | Word frequency analysis | ✅ |
| 7.6 | CPS patterns | `communication-patterns.ts` | AI | Gemini classification | ⚠️ |
| 7.7 | Ranking percentiles | `ranking-percentiles.ts` | Algorithmic | Static benchmarks | ✅ |
| 7.8 | Subtext analysis | `subtext.ts` | AI | Exchange window extraction + Gemini | 🧪 |

---

**Legend:**
- ✅ **VALIDATED** — methodology is sound, implementation is correct, limitations are documented or negligible
- ⚠️ **NEEDS_REVIEW** — works but has identified issues that should be addressed
- 🧪 **EXPERIMENTAL** — novel metric without established validation, or heavily AI-dependent with low reproducibility
