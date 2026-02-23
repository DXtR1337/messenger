# Audit 2: Analysis Engine + Parsers

**Date:** 2026-02-19
**Auditor:** Claude Opus 4.6 (Automated)
**Scope:** All parsers (Messenger, WhatsApp, Instagram, Telegram, auto-detect), quantitative engine, qualitative pipeline
**Overall Score:** Parsers: **7.0–8.5/10** | Engine: **7.5/10**

---

## Executive Summary

The parsing and analysis engine is the technical core of PodTeksT. The Messenger parser is mature and well-tested. WhatsApp, Instagram, and Telegram parsers are newer with varying quality. The quantitative engine is well-architected (single O(n) pass) but has edge case bugs. The auto-detection system has a significant limitation in distinguishing Instagram from Messenger exports.

---

## Parser Scores

| Parser | Score | Maturity | Notes |
|--------|-------|----------|-------|
| Messenger | 8.5/10 | Production | Most tested, handles FB unicode encoding well |
| WhatsApp | 7.5/10 | Beta | Date format heuristics can fail on non-standard exports |
| Instagram | 7.0/10 | Beta | Reuses Messenger parser — good, but unicode timing issues |
| Telegram | 7.5/10 | Beta | Solid implementation, handles text entities |
| Auto-detect | 6.0/10 | Alpha | Cannot distinguish Instagram from Messenger |

---

## Critical Bugs (3)

### BUG-01: Auto-Detect Cannot Distinguish Instagram from Messenger
- **File:** `src/lib/parsers/detect.ts:33-38`
- **Code:**
  ```typescript
  // Messenger / Instagram: both have participants[] and messages[] with sender_name
  if (Array.isArray(data.participants) && Array.isArray(data.messages)) {
    // Both are Meta exports — nearly identical format
    // Default to messenger (Instagram can use the same parser with platform override)
    return 'messenger';
  }
  ```
- **Impact:** Instagram exports are always detected as Messenger. While both use the same parser (`decodeFBString` from messenger.ts), the platform metadata is incorrect. This affects analytics labels and could confuse users.
- **Recommendation:** Add heuristic detection: Instagram exports typically have `thread_path` starting with `"inbox/"` without the Facebook-specific thread ID pattern. Or check for Instagram-specific fields like `is_geoblocked_for_viewer`. Alternatively, let users manually select platform when auto-detect returns 'messenger'.

### BUG-02: Response Time Calculation Vulnerability
- **File:** `src/lib/analysis/quantitative.ts` (response time logic)
- **Impact:** Response times can be calculated incorrectly or produce extreme outliers
- **Details:** The response time calculation considers any message from a different sender as a "response," even if:
  - Multiple people are in a group chat (response is attributed to wrong sender)
  - Messages are sent days apart (should be classified as new conversation, not a response)
  - The "response" is a media-only message (no actual text response)
- **Mitigation Present:** The `filterResponseTimeOutliers()` function caps at 95th percentile (line 70-75), which helps but doesn't solve the root cause.
- **Recommendation:** Only count responses within the same session (use `SESSION_GAP_MS = 6h`). For group chats, track per-pair response times. Exclude media-only messages from response time calculation.

### BUG-03: Single-Participant Edge Case
- **File:** `src/lib/analysis/quantitative.ts`
- **Impact:** If a conversation export contains only messages from one person (e.g., announcements channel, or all messages from the other person were deleted), various calculations may produce NaN or divide-by-zero.
- **Details:** Many metrics assume at least 2 active participants: response time ratios, initiation ratios, message balance, reciprocity indices. With 1 participant, these produce `NaN` or `Infinity`.
- **Recommendation:** Add guard at the start of `computeQuantitativeAnalysis()`: if fewer than 2 participants have messages, return a degraded analysis with only single-person metrics and a warning flag.

---

## Major Issues (5)

### ENG-01: Quantitative Engine is 938 Lines
- **File:** `src/lib/analysis/quantitative.ts` (938 LOC)
- **Details:** Single file handles ALL quantitative computation. While the O(n) single-pass architecture is excellent, the file is too large to navigate and maintain.
- **Recommendation:** Extract into modules: `volume-metrics.ts`, `timing-metrics.ts`, `engagement-metrics.ts`, `pattern-metrics.ts`, `heatmap.ts`. Keep the main orchestrator thin.

### ENG-02: Sampling Strategy May Miss Critical Moments
- **File:** `src/lib/analysis/qualitative.ts`
- **Details:** The message sampling for AI analysis uses fixed strategies (time-based segments, longest messages, messages with reactions). However:
  - Sudden topic changes (potential breakup discussions) may not be in the sample
  - Very short but emotionally significant messages ("it's over", "I'm sorry") may be excluded by the "longest messages" criterion
  - The 60/40 recent/older weighting may undervalue historical context in long relationships
- **Recommendation:** Add inflection-point detection in the quantitative pass: identify moments where message frequency, response time, or sentiment shift dramatically. Feed these to the sampling strategy.

### ENG-03: WhatsApp Date Parsing Heuristics Fragile
- **File:** `src/lib/parsers/whatsapp.ts`
- **Details:** WhatsApp exports have locale-dependent date formats. The parser uses regex heuristics to detect formats like:
  - `DD/MM/YYYY, HH:MM` (European)
  - `MM/DD/YYYY, HH:MM` (American)
  - `DD.MM.YYYY, HH:MM` (German/Polish)
  - 12-hour vs 24-hour clock
- **Risk:** Ambiguous dates (e.g., `01/02/2024` — is it Jan 2 or Feb 1?) are resolved by heuristic, which can silently produce wrong chronological ordering.
- **Recommendation:** After parsing, validate chronological order. If messages appear out of order, try the alternative date format. Add a user-facing warning if date format is ambiguous.

### ENG-04: Instagram Unicode Timing Issues
- **File:** `src/lib/parsers/instagram.ts` (reuses `decodeFBString` from messenger.ts)
- **Details:** While Instagram reuses the same `decodeFBString` for Facebook's latin-1 encoding, Instagram exports from newer versions may use proper UTF-8 encoding. Applying `decodeFBString` to already-correct UTF-8 strings can mangle characters.
- **Recommendation:** Add a pre-check: if the first decoded string matches the original string, skip decoding for the entire export (it's already UTF-8).

### ENG-05: CPS Analysis Has Overlapping Question Batches
- **File:** `src/lib/analysis/gemini.ts:511-518`
- **Code:**
  ```typescript
  const CPS_BATCHES: number[][] = [
    [1, 2, 3, ..., 19],    // Batch 1: Q1-Q19
    [20, 21, 22, ..., 39],  // Batch 2: Q20-Q39
    [40, 41, 42, ..., 63],  // Batch 3: Q40-Q63
  ];
  ```
- **Details:** The comments say "Q1-Q21" but the array is `[1...19]`, and "Q20-Q42" but the array is `[20...39]`. The comments are misleading (the actual arrays are correct and non-overlapping, but the documentation is wrong).
- **Recommendation:** Fix the comments to match the actual arrays.

---

## Minor Issues

1. **Emoji regex may miss some compound emoji** (skin tone modifiers, ZWJ sequences) in `extractEmojis()` (quantitative.ts:41)
2. **`STOPWORDS` constant** imported from constants.ts — may not cover Polish stopwords adequately
3. **Telegram parser** doesn't handle forwarded messages or replies-to-messages metadata
4. **Network metrics** computation (`computeNetworkMetrics`) is imported but may not be used in the main flow
5. **Month key generation** uses `toISOString()` which is UTC — may place messages in wrong day for users in UTC+/- timezones

---

## Architecture Strengths

- **O(n) single-pass design:** The quantitative engine processes all messages in a single loop, accumulating metrics per-person. Excellent for large conversations (50K+ messages).
- **Unified message format:** `UnifiedMessage` type normalizes across all 4 platforms, allowing a single analysis engine.
- **decodeFBString:** Correct implementation of Facebook's latin-1 unicode encoding bug.
- **Modular imports:** `viral-scores.ts`, `badges.ts`, `catchphrases.ts`, `network.ts` are well-separated concerns.
- **Response time outlier filtering:** P95 cap prevents extreme outliers from skewing averages.
- **Multi-pass AI analysis:** 4-pass strategy (overview → dynamics → profiles → synthesis) provides structured, deep analysis.

---

## Recommendations Priority

| Priority | Action | Impact |
|----------|--------|--------|
| P0 | Fix single-participant edge case (guard clause) | Prevents crashes |
| P0 | Improve response time calc for group chats | Data accuracy |
| P1 | Add Instagram vs Messenger detection heuristic | Platform accuracy |
| P1 | UTF-8 pre-check for Instagram parser | Data integrity |
| P1 | WhatsApp date format validation + fallback | Parsing reliability |
| P2 | Split quantitative.ts into modules | Maintainability |
| P2 | Fix CPS batch comments | Documentation |
| P3 | Add Polish stopwords to STOPWORDS list | Analysis quality |
| P3 | Handle Telegram forwarded/reply metadata | Feature completeness |
