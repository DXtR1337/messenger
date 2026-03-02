# PodTeksT — Comprehensive Quantitative Metrics Audit

## Context

You are auditing PodTeksT, a Polish chat analysis application that generates psychological profiles and insights from exported conversations (Messenger, WhatsApp, Instagram, Telegram, Discord). The app calculates 80+ metrics in the browser and sends ~2% of conversation samples to Gemini API for AI-driven analysis.

This is NOT a toy. This is meant to be a rigorous analytical engine. Every metric we show to users must be defensible, transparent about its limitations, and calculated with maximum possible accuracy given our constraints (browser-based computation, no backend processing, consumer chat data with inherent noise).

## Your Task

Perform a full audit of our quantitative metrics pipeline. Go through EVERY file involved in metric calculation, parsing, and analysis. This includes:

1. **All metric calculation functions** — find every place we compute a numerical value from chat data
2. **All Gemini API prompts** — review every prompt for analytical rigor, bias, and instruction quality
3. **All parsing logic** — how we extract data from raw chat exports across 5 platforms

## Audit Criteria

### A. Statistical Rigor of Quantitative Metrics

For EVERY quantitative metric (response time, message frequency, activity patterns, reaction counts, etc.), evaluate:

1. **Central tendency** — Are we using only mean? This is unacceptable for skewed distributions like response times. Every temporal/count metric MUST have:
   - Mean (arithmetic)
   - Median
   - Trimmed mean (10% trim) to handle outliers
   - Standard deviation
   - IQR (interquartile range)
   - If applicable: mode, skewness indicator

2. **Outlier handling** — How do we handle extreme values? Someone leaving a message unread for 3 days shouldn't destroy a "response time" metric. Check for:
   - Are we filtering outliers? What method? (IQR-based, z-score, percentile caps?)
   - Are we distinguishing between "didn't respond for 8 hours because sleeping" vs "ignored for 3 days"?
   - Do we account for conversation gaps vs active conversation flow?

3. **Session detection** — Do we properly segment conversations into sessions? A reply after 12 hours is not the same interaction as a reply after 30 seconds. Check if we have:
   - Session boundary detection (configurable threshold)
   - Within-session vs between-session metrics separated
   - Conversation initiation patterns properly tracked

4. **Normalization** — Are metrics normalized for:
   - Conversation length (someone with 50k messages vs 500 messages)
   - Time span (2 months of chat vs 5 years)
   - Platform differences (WhatsApp voice messages vs Messenger reactions)
   - Number of participants (group chats vs 1-on-1)

5. **Edge cases** — What happens with:
   - Empty messages, deleted messages, system messages
   - Media-only messages (photos, stickers, voice notes)
   - Very short conversations (<50 messages)
   - Very long conversations (>100k messages)
   - Single-participant dominance (95/5 split)

### B. Temporal Metrics Deep Dive

Response time, activity patterns, and any time-based metric need special attention because they are inherently noisy and easy to miscalculate:

1. **Response time calculation:**
   - How do we define "response"? Is it the next message from the other person, or the next message in a new turn?
   - Do we handle burst messages? (Someone sending 5 messages in a row — is the "response" to the first or last?)
   - Do we exclude overnight gaps? Weekend gaps? How?
   - Are we calculating per-session response time separately from global?
   - Distribution analysis: response times are heavily right-skewed — are we showing percentiles (p50, p75, p90, p95)?

2. **Activity patterns:**
   - Timezone handling — do we detect or assume timezone?
   - Day-of-week and hour-of-day matrices — are they normalized per total messages or raw counts?
   - Trend detection — do we identify changes over time or just aggregate everything flat?

3. **Frequency metrics:**
   - Messages per day/week — are we using calendar days or rolling windows?
   - Are inactive periods excluded from frequency calculations?
   - Do we show frequency trends over time?

### C. Psychological/Communication Metrics

For metrics based on linguistic analysis (sentiment, communication patterns, Gottman indicators, LSM, etc.):

1. **Validity** — Is the metric based on published research? If yes, cite the paper. If it's our adaptation, mark it explicitly as experimental.
2. **Operationalization** — How exactly do we translate a psychological construct into a computable metric from chat messages? Is this defensible?
3. **Confidence levels** — Do we indicate reliability per metric? A sentiment score from 10,000 messages is more reliable than from 50. Are we communicating this?
4. **Language specificity** — These metrics were likely developed for English. How do they perform on Polish text? Are we transparent about this limitation?
5. **AI vs algorithmic** — Which metrics are calculated algorithmically in the browser vs by Gemini? Is this clear to the user?

### D. Gemini Prompts Audit

For every prompt sent to Gemini API:

1. **Instruction clarity** — Is the prompt unambiguous? Could two runs produce wildly different results?
2. **Output format** — Are we enforcing structured output (JSON schema)? Or parsing free text?
3. **Sampling bias** — We send ~2% of messages. How are those selected? Random? Recent? "Most interesting"? This selection method directly biases every AI-generated insight.
4. **Reproducibility** — Same chat, same analysis twice — how different are the results? Do we use temperature=0?
5. **Prompt injection risk** — Can chat content manipulate the analysis? (e.g., someone writes "ignore previous instructions" in a message)
6. **Grounding** — Do prompts instruct the model to base conclusions only on provided data, or can it hallucinate patterns?

### E. Data Integrity

1. **Parser accuracy** — For each platform (Messenger, WhatsApp, Instagram, Telegram, Discord), verify:
   - Timestamp parsing correctness across formats and locales
   - Author attribution accuracy
   - Message type detection (text, media, reaction, system)
   - Unicode/emoji handling
   - Edge cases in export formats (Facebook's encoding issues, WhatsApp's date format variations)

2. **Calculation pipeline** — Trace the flow from raw parsed messages to final metric values. Identify any place where data could be lost, miscounted, or misattributed.

## Deliverables

After the audit, produce:

### 1. `AUDIT_REPORT.md`
For each metric found:
- **Name** and location in codebase
- **Current implementation** — what it does now
- **Issues found** — specific problems with accuracy, methodology, or edge cases
- **Severity** — CRITICAL (actively misleading) / HIGH (significantly inaccurate) / MEDIUM (could be better) / LOW (minor improvement)
- **Recommendation** — exact change needed with code references

### 2. `METRICS_REGISTRY.md`
A complete catalog of every metric with:
- Name, description, category
- Calculation method (algorithmic/AI/hybrid)
- Statistical measures used
- Known limitations
- Research basis (if any)
- Confidence indicator logic
- Status: VALIDATED / NEEDS_REVIEW / EXPERIMENTAL

### 3. `IMPLEMENTATION_PLAN.md`
Prioritized list of fixes:
- Phase 1: Critical accuracy fixes (misleading metrics)
- Phase 2: Statistical improvements (adding median, IQR, trimmed mean, percentiles)
- Phase 3: Normalization and edge case handling
- Phase 4: Confidence indicators and transparency features

## Rules

- Do NOT skip any metric. Go through every single calculation in the codebase.
- Do NOT assume anything works correctly. Verify.
- Be brutal. If a metric is bullshit, say it's bullshit and explain why.
- If you find metrics that LOOK professional but are statistically meaningless — flag them hard. This is exactly what we don't want.
- Every recommendation must be specific and actionable, not vague "could be improved."
- Remember: users see these numbers and make judgments about their relationships. Accuracy matters.
