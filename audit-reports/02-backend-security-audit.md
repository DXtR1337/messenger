# CHATSCOPE -- Backend & Security Audit Report

**Auditor:** Senior Backend Engineer & Security Specialist (ex-Google/Stripe)
**Project:** ChatScope - Messenger Conversation Analyzer
**Files Read:** All 24 specified backend files in their entirety

---

## 1. API Design & Route Structure -- Score: 7/10

**Evidence:**
- `src/app/api/analyze/route.ts:1-70` -- Main analysis endpoint using SSE streaming
- `src/app/api/analyze/image/route.ts:1-51` -- Image generation endpoint
- `src/app/api/analyze/scid/route.ts:1-56` -- SCID-II screening endpoint

**Strengths:**
- Clean, minimal API routes with clear single responsibility
- Consistent SSE pattern across analyze and SCID routes with `text/event-stream` headers
- Type-safe request interfaces (AnalyzeRequest, ImageRequest, SCIDRequest)
- `export const dynamic = 'force-dynamic'` correctly prevents caching of API routes
- Appropriate `maxDuration` settings (120s for analysis, 180s for SCID)

**Problems Found:**
- **No authentication or authorization on any endpoint.** All three routes are publicly accessible. Anyone can hit `/api/analyze` and burn through the Gemini API key. This is the single most critical issue.
- **No rate limiting.** There is zero rate limiting on any route. A malicious actor could trigger thousands of concurrent Gemini API calls.
- **No request size validation.** `request.json()` is called without any body size limits. A 500MB JSON payload could be sent to crash the server (`route.ts:17`, `image/route.ts:19`, `scid/route.ts:13`).
- **No CORS configuration.** The routes don't set CORS headers explicitly -- Next.js defaults apply, but for a SaaS this should be explicit.
- **SSE streams lack heartbeat/keepalive.** Long-running analysis (up to 3 minutes for SCID) could time out at load balancers/proxies without periodic keepalive events.

**Recommendations:**
1. Add authentication middleware (check Supabase JWT) to all API routes
2. Implement rate limiting (e.g., 10 requests/minute per user)
3. Add request body size validation (reject payloads > 5MB)
4. Add explicit CORS headers for production domain

---

## 2. Security (OWASP Top 10) -- Score: 3/10

**CRITICAL: API Keys Exposed in .env.local (line 1-5)**

The `.env.local` file contains **live, valid API keys** committed or accessible:
```
ANTHROPIC_API_KEY=sk-ant-api03-FcbzAeH...
GEMINI_API_KEY=AIzaSyC9dEnXGOBDxU1...
GOOGLE_CLOUD_PROJECT=project-506896e4...
```

**This is a CRITICAL security vulnerability.** These keys must be rotated immediately.

**Full Security Assessment:**

| OWASP Category | Status | Evidence |
|---|---|---|
| A01: Broken Access Control | FAIL | No auth on any API route |
| A02: Cryptographic Failures | WARN | API keys in .env.local readable |
| A03: Injection | MODERATE | User content passed to Gemini prompts without sanitization (see prompt injection below) |
| A04: Insecure Design | WARN | No rate limiting, no abuse prevention |
| A05: Security Misconfiguration | FAIL | No security headers in next.config.ts |
| A06: Vulnerable Components | INFO | Uses current dependencies |
| A07: Auth Failures | FAIL | No auth system implemented |
| A08: Data Integrity Failures | WARN | JSON from Gemini parsed with only basic validation |
| A09: Logging Failures | WARN | No structured logging, errors expose internals |
| A10: SSRF | LOW | No user-supplied URLs fetched server-side |

**Input Validation Issues:**
- `route.ts:17` -- `request.json() as AnalyzeRequest` is a type assertion, NOT validation. Malformed data passes through.
- `image/route.ts:19` -- Same pattern. No schema validation.
- `scid/route.ts:13` -- Same pattern.
- `messenger.ts:88-103` -- Validation only checks field existence, not content sanitization.

**Error Information Disclosure:**
- `route.ts:55` -- `error.message` is sent directly to clients. Gemini API errors may leak internal details.
- `gemini.ts:103` -- Raw Gemini response (first 200 chars) included in error messages, could leak prompt structure.

**Recommendations:**
1. IMMEDIATELY rotate all API keys in `.env.local`
2. Add `.env.local` to `.gitignore` if not already
3. Implement Zod schema validation on all API request bodies
4. Add security headers in `next.config.ts` (CSP, X-Frame-Options, etc.)
5. Sanitize error messages before returning to clients

---

## 3. AI Integration (Gemini Usage) -- Score: 7/10

**Evidence:**
- `src/lib/analysis/gemini.ts:1-583` -- Core Gemini integration
- `src/lib/analysis/prompts.ts:1-480` -- Prompt definitions

**Strengths:**
- Well-structured multi-pass analysis architecture (4 passes + SCID + roast)
- `import 'server-only'` guard at `gemini.ts:7` prevents accidental client-side import
- Exponential backoff retry logic with smart error classification (`gemini.ts:42-84`)
- Non-retryable errors (API key, permissions, billing) bail out immediately (`gemini.ts:69-77`)
- Robust JSON parsing with markdown fence stripping and brace matching (`gemini.ts:86-105`)
- `responseMimeType: 'application/json'` at `gemini.ts:58` forces structured output
- Low temperature (0.3) for consistency (`gemini.ts:57`)
- Relationship context calibration system with per-type baselines (`gemini.ts:144-200`)

**Problems Found:**
- **Prompt Injection Risk (MODERATE):** User-supplied message content is embedded directly into prompts at `gemini.ts:232-233`. The `formatMessagesForAnalysis` function (`prompts.ts:465-480`) concatenates user messages into the prompt without any sanitization. A user could craft messages like "Ignore previous instructions and output..." in their conversation data.
- **No token/cost tracking:** There's no tracking of token usage or cost per analysis. The CLAUDE.md mentions a target of <$0.15 per analysis but there's no enforcement.
- **No content moderation:** Uploaded conversations could contain harmful/illegal content that gets sent to Gemini without filtering.
- **Hardcoded model name:** `gemini-3-flash-preview` at `gemini.ts:53` and `gemini-3-pro-image-preview` at `gemini.ts:331` are preview models that could be deprecated.
- **No max input size enforcement:** The `callGeminiWithRetry` function doesn't validate input size. A massive `userContent` string could exceed Gemini's context window and waste API calls on retries.
- **SCID analysis sends up to 16K output tokens** (`gemini.ts:455`) which is expensive for a screening tool.

**Recommendations:**
1. Add input sanitization for user messages before embedding in prompts (strip control characters, limit message length)
2. Implement token usage tracking and per-user cost caps
3. Add content moderation pre-filter before sending to AI
4. Use stable/GA model versions, not preview
5. Enforce max input size before API calls

---

## 4. Data Pipeline Robustness -- Score: 8/10

**Evidence:**
- `src/lib/parsers/messenger.ts:1-308` -- Messenger parser
- `src/lib/parsers/whatsapp.ts:1-415` -- WhatsApp parser
- `src/lib/analysis/quantitative.ts:1-965` -- Quantitative engine

**Strengths:**
- **Excellent Facebook unicode decoding** at `messenger.ts:22-31` -- correctly handles the latin-1 to UTF-8 reinterpretation
- **Comprehensive message type classification** at `messenger.ts:179-189` -- handles stickers, links, photos, videos, audio, GIFs, calls
- **Multi-file merge support** at `messenger.ts:269-308` with deduplication
- **WhatsApp parser handles locale-dependent date formats** at `whatsapp.ts:38-39` -- supports DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD with intelligent heuristic
- **WhatsApp multi-line message support** at `whatsapp.ts:312-318`
- **O(n) single-pass quantitative analysis** at `quantitative.ts:300-543` with documented performance target of <200ms for 50K messages
- **NaN/Infinity safeguards** in `linearRegressionSlope` at `quantitative.ts:87-104`
- **Dynamic participant handling** -- accumulators created on-the-fly for unexpected senders at `quantitative.ts:307-341`
- **Stratified sampling** in `qualitative.ts:84-143` with 60/40 recent/old weighting

**Problems Found:**
- **`Math.min/max(...timestamps)` stack overflow risk** at `messenger.ts:242-243` and `whatsapp.ts:393-394`. For conversations with 200K+ messages, spreading an array of that size into `Math.min()` will cause a `RangeError: Maximum call stack size exceeded`. This is a real production crash risk.
- **Deduplication key collision** at `messenger.ts:282` -- `${m.timestamp}-${m.sender}` is insufficient. Two messages from the same person at the same millisecond timestamp with different content would be deduplicated incorrectly.
- **WhatsApp DD/MM vs MM/DD ambiguity** at `whatsapp.ts:100-112` -- the heuristic defaults to DD/MM which is wrong for US users. No user override available.
- **No streaming parser for large files.** Both parsers load the entire dataset into memory. A 200MB WhatsApp text file would require ~400MB+ RAM during parsing.
- **Duplicated STOPWORDS** -- identical 60+ word stopword lists exist in both `quantitative.ts:35-61` AND `catchphrases.ts:36-62`. DRY violation.

**Recommendations:**
1. Replace `Math.min(...timestamps)` with a manual loop for large arrays
2. Use content hash in deduplication key
3. Add date format detection or user-selectable format for WhatsApp
4. Consider streaming parser for very large files
5. Extract shared STOPWORDS to a common module

---

## 5. Privacy & Data Handling -- Score: 5/10

**Evidence:**
- `.env.local:1-5` -- Live API keys
- `gemini.ts` -- Data sent to Google AI
- `qualitative.ts:245-272` -- Message sampling
- CLAUDE.md privacy section

**Strengths:**
- Message sampling limits data sent to AI (250 overview + 200 dynamics + 150/person)
- CLAUDE.md documents "raw messages are NOT stored after analysis" policy
- StoredAnalysis type at `types.ts:407-415` correctly separates parsed vs analyzed data
- Client-side localStorage storage means no server-side message persistence
- SCID includes proper disclaimers at `scid-ii.ts:326-330`

**Problems Found:**
- **Full conversation content sent to Google's Gemini API** -- messages traverse Google's servers. No mention of data processing agreement (DPA) with Google AI Studio.
- **No data encryption at rest.** LocalStorage data is unencrypted. Anyone with physical access to the browser can read full analysis results.
- **Image generation sends conversation excerpts** at `gemini.ts:341-343` -- actual message content is embedded in image generation prompts.
- **No GDPR consent flow** implemented in any of the audited backend files.
- **No data retention policy enforcement.** CLAUDE.md says "delete uploads within 1 hour" but there's no implementation of this.
- **SCID-II analysis stores sensitive mental health screening data** in localStorage without any special protection. If the app later implements shared reports, this could leak.
- **Error messages could contain user data** -- `gemini.ts:103` logs raw response which might echo back user content.

**Recommendations:**
1. Implement explicit user consent before sending data to Gemini
2. Add a DPA with Google AI Studio for GDPR compliance
3. Encrypt sensitive localStorage data
4. Implement the documented data retention/deletion policy
5. Exclude SCID results from any future sharing/export features by default
6. Strip user content from error messages

---

## 6. Performance & Scalability -- Score: 7/10

**Evidence:**
- `quantitative.ts:7-8` -- Performance target documented
- `gemini.ts:42-84` -- Retry logic
- `qualitative.ts:84-143` -- Sampling strategy

**Strengths:**
- O(n) single-pass quantitative analysis with documented target
- Smart message sampling (250+200+150*N) caps API input size
- Exponential backoff prevents API hammering
- SSE streaming provides real-time progress updates
- `optimizePackageImports` in `next.config.ts:12` for framer-motion, lucide-react, recharts

**Problems Found:**
- **Sequential AI passes** at `gemini.ts:230-271` -- Passes 1-4 run sequentially. Pass 3 is particularly slow because it runs one API call per participant. For a 5-person group chat, that's 5 sequential API calls just for Pass 3.
- **No request deduplication.** If a user clicks "analyze" twice, two full analysis pipelines run concurrently, both burning API credits.
- **No caching of analysis results.** Re-analyzing the same conversation starts from scratch. No hash-based cache.
- **Word tokenization per message** in catchphrases runs a SECOND pass over all messages at `catchphrases.ts:122-142`, after quantitative already did similar tokenization at `quantitative.ts:388-398`. Wasted computation.
- **`computeBadges` calls `computeStreaks`** at `badges.ts:365` which iterates over ALL messages again -- third pass over the data.
- **PDF generation is synchronous** at `pdf-export.ts:976-1076` -- could block the main thread for complex reports.

**Recommendations:**
1. Parallelize Pass 3 profiles (all participants can run concurrently)
2. Add request deduplication with in-flight tracking
3. Implement content-hash based caching for repeat analyses
4. Consolidate tokenization and per-message iteration into fewer passes
5. Move PDF generation to a Web Worker

---

## 7. Infrastructure & DevOps -- Score: 6/10

**Evidence:**
- `Dockerfile:1-35`
- `firebase.json:1-13`
- `next.config.ts:1-16`
- `.env.local.example:1-16`

**Strengths:**
- Multi-stage Docker build with proper separation (deps/builder/runner)
- Non-root user (`nextjs:nodejs`) in Docker at `Dockerfile:25-26`
- `standalone` output mode in `next.config.ts:3` for optimized Docker images
- `pnpm install --frozen-lockfile` at `Dockerfile:10` ensures reproducible builds
- Firebase hosting config with europe-west1 region

**Problems Found:**
- **Dual deployment targets:** Both Firebase (`firebase.json`) and Docker (`Dockerfile`) are configured. Unclear which is the primary deployment path. This creates maintenance confusion.
- **`corepack prepare pnpm@latest`** at `Dockerfile:4` -- using `@latest` means builds are not reproducible. Should pin a specific pnpm version.
- **No health check endpoint** defined for Docker or Firebase.
- **No security headers** in `next.config.ts` -- missing CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- **No `HEALTHCHECK` instruction** in Dockerfile.
- **Firebase config has no security rules** -- just hosting config.
- **`.env.local.example` lists Supabase and Stripe** but these don't appear in any backend code. Suggests incomplete implementation or dead config.

**Recommendations:**
1. Choose one deployment target and document it clearly
2. Pin pnpm version in Dockerfile
3. Add health check endpoint (`/api/health`)
4. Add security headers to `next.config.ts`
5. Add `HEALTHCHECK` to Dockerfile
6. Remove unused environment variables from `.env.local.example`

---

## 8. Error Resilience & Recovery -- Score: 7/10

**Evidence:**
- `gemini.ts:42-84` -- Retry with exponential backoff
- `gemini.ts:275-279` -- Partial results handling
- `route.ts:46-50` -- Error propagation via SSE
- `scid/route.ts:38-42` -- SCID error handling

**Strengths:**
- **Graceful partial analysis** at `gemini.ts:276-278` -- if later passes fail, earlier results are preserved with `status: 'partial'`
- **Smart retry classification** -- non-retryable errors (API key, billing, permissions) bail immediately (`gemini.ts:69-76`)
- **SSE error propagation** -- errors are sent as typed events, not as HTTP errors, so the stream stays open for partial results
- **Input validation** in SCID at `gemini.ts:463-478` with range clamping on confidence scores
- **Empty answer detection** at `gemini.ts:476-478` with user-friendly error

**Problems Found:**
- **No timeout on individual API calls** at `gemini.ts:62`. If Gemini hangs, the retry loop waits indefinitely per attempt. Only the Next.js `maxDuration` provides an outer timeout.
- **No circuit breaker pattern.** If Gemini is down, every user request still attempts 3 retries, wasting time and resources.
- **Stream controller not handling backpressure** at `route.ts:24-61`. If the client is slow, the controller's internal buffer grows unbounded.
- **SSE connection never times out server-side.** If a client disconnects without closing cleanly, the stream and associated Gemini API calls continue running.
- **`parseGeminiJSON` at `gemini.ts:86-105` has brittle JSON extraction** -- uses `lastIndexOf` for the closing brace, which could match a brace inside a string literal in edge cases.

**Recommendations:**
1. Add per-call timeout using AbortController with Gemini API
2. Implement circuit breaker for Gemini API calls
3. Detect client disconnect and abort in-flight API calls
4. Add timeout to SSE streams (e.g., 5 minutes max)

---

## 9. Architecture & Code Organization -- Score: 8/10

**Evidence:** All files in `src/lib/analysis/` and `src/lib/parsers/`

**Strengths:**
- **Clean separation of concerns:** parsers, quantitative, qualitative, prompts, types are all separate modules
- **`server-only` import** guard at `gemini.ts:7` prevents accidental client bundling
- **Well-documented type system** at `types.ts` (analysis types) and `parsers/types.ts` (unified message types)
- **Single-pass architecture** for quantitative analysis is well-designed
- **Modular metric computation** -- viral scores, badges, catchphrases, network metrics are independent modules
- **Prompts as pure data** in `prompts.ts` -- easy to iterate on prompt engineering
- **Clear naming conventions** -- `Pass1Result`, `Pass2Result`, etc.
- **SCID-II system** is self-contained with its own types, questions, and calculation logic

**Problems Found:**
- **Duplicated code:** STOPWORDS duplicated between `quantitative.ts:35-61` and `catchphrases.ts:36-62`. `linearRegressionSlope` duplicated between `quantitative.ts:86-104` and `viral-scores.ts:48-65`.
- **Inconsistent module boundaries:** `story-data.ts` contains UI-specific data transformations (VersusCard, CharacterCard) that arguably belong closer to the component layer, not in `lib/analysis/`.
- **CLAUDE.md says "Claude API" but code uses Gemini.** The CLAUDE.md documentation is stale -- it references `claude-opus-4-6` and `Anthropic Claude API` while the actual implementation uses Gemini exclusively. The `.env.local` contains an unused `ANTHROPIC_API_KEY`.
- **`kpi-utils.ts` and `story-data.ts`** contain presentation logic mixed with data computation -- these should be in hooks or component utils.

**Recommendations:**
1. Extract shared utilities (stopwords, linear regression) to a common module
2. Move UI-specific data transformers to a `lib/ui/` or component-adjacent location
3. Update CLAUDE.md to reflect actual Gemini integration
4. Remove dead Anthropic API key from `.env.local`

---

## 10. Scalability Analysis -- Score: 6/10

**Evidence:** Architecture analysis across all files

**Strengths:**
- Client-side quantitative analysis offloads computation from server
- Message sampling caps AI input regardless of conversation size
- localStorage storage avoids server-side storage costs
- Standalone Next.js output enables horizontal scaling via containers

**Problems Found:**
- **Single API key for all users** -- no per-user API key management or usage quotas
- **No queue system** -- analysis requests are handled synchronously per connection. 100 concurrent users = 100 concurrent Gemini sessions
- **No database** -- localStorage-only architecture doesn't support features in CLAUDE.md (dashboard, shared reports, usage tracking)
- **Memory-bound processing** -- large conversations load fully into memory. No streaming or chunked processing.
- **`Math.min/max` stack overflow** (mentioned above) is a hard scalability wall at ~200K messages
- **Sequential multi-pass AI analysis** means each user ties up a server connection for 30-120 seconds

**Recommendations:**
1. Implement a job queue (e.g., BullMQ) for analysis requests
2. Add per-user API key or token budget management
3. Implement the planned Supabase database integration
4. Add streaming/chunked parsing for large files
5. Consider WebSocket or polling for long-running analyses instead of SSE

---

## TOP 5 SECURITY VULNERABILITIES

| # | Severity | Issue | File:Line | Impact |
|---|----------|-------|-----------|--------|
| 1 | **CRITICAL** | Live API keys exposed in `.env.local` (Anthropic + Gemini + GCP) | `.env.local:1-5` | Full account compromise, unlimited API usage, financial damage |
| 2 | **CRITICAL** | No authentication on any API endpoint | `route.ts:15`, `image/route.ts:18`, `scid/route.ts:12` | Anyone can trigger expensive AI analysis, abuse the service |
| 3 | **HIGH** | No rate limiting on API routes | All route files | DDoS via API calls, Gemini bill explosion |
| 4 | **HIGH** | No input validation/sanitization -- type assertions used instead of schema validation | `route.ts:17`, `image/route.ts:19`, `scid/route.ts:13` | Malformed payloads, prompt injection via crafted messages |
| 5 | **MEDIUM** | No security headers (CSP, HSTS, X-Frame-Options) | `next.config.ts` | XSS, clickjacking, MIME sniffing attacks |

---

## TOP 5 ARCHITECTURE IMPROVEMENTS

| # | Priority | Improvement | Current State | Target State |
|---|----------|-------------|---------------|--------------|
| 1 | **P0** | Add authentication + authorization middleware | Zero auth on all routes | Supabase JWT verification on every API route |
| 2 | **P0** | Implement rate limiting + usage quotas | Unlimited access | Per-user rate limits, monthly analysis caps |
| 3 | **P1** | Add job queue for analysis | Synchronous SSE streams | BullMQ queue with webhook/polling completion |
| 4 | **P1** | Parallelize Pass 3 (per-participant profiles) | Sequential: N API calls for N participants | `Promise.all()` for concurrent profiles |
| 5 | **P2** | Fix `Math.min/max(...array)` stack overflow | Crashes on 200K+ messages | Manual min/max loop or `reduce()` |

---

## SUMMARY SCORES

| Area | Score |
|------|-------|
| 1. API Design & Route Structure | 7/10 |
| 2. Security (OWASP Top 10) | 3/10 |
| 3. AI Integration | 7/10 |
| 4. Data Pipeline Robustness | 8/10 |
| 5. Privacy & Data Handling | 5/10 |
| 6. Performance & Scalability | 7/10 |
| 7. Infrastructure & DevOps | 6/10 |
| 8. Error Resilience & Recovery | 7/10 |
| 9. Architecture & Code Organization | 8/10 |
| 10. Scalability Analysis | 6/10 |
| **OVERALL** | **6.4/10** |

The codebase shows strong engineering in the data pipeline and analysis architecture, but has critical security gaps that must be addressed before any production deployment. The API key exposure is an emergency requiring immediate action.
