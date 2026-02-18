# ChatScope — Messenger Conversation Analyzer

## Project Overview

ChatScope is a SaaS web app that analyzes Messenger (and potentially other platform) conversation exports. Users upload a JSON file from their chat history and receive deep psychological and communication analysis powered by Google Gemini API.

**Core value proposition:** "See your relationships through data." — quantitative metrics + qualitative AI-powered psychological analysis of any conversation.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + custom CSS variables for theming
- **UI Components:** shadcn/ui as base, heavily customized
- **Charts/Visualization:** Recharts + custom SVG visualizations
- **AI Analysis:** Google Gemini API (gemini-2.0-flash)
- **Development AI:** Claude Opus 4.6 (claude-opus-4-6) — used for coding and development
- **Auth:** Supabase Auth (Google + email/password) *(not yet implemented — local-only MVP)*
- **Database:** Supabase PostgreSQL *(not yet implemented — using localStorage)*
- **File Storage:** Supabase Storage (for uploaded JSONs, temporary) *(not yet implemented — local-only MVP)*
- **Payments:** Stripe (subscription model) *(not yet implemented — local-only MVP)*
- **Deployment:** Google Cloud Run (Docker) — uses `output: 'standalone'` in next.config.ts
- **Package Manager:** pnpm

## Project Structure

```
chatscope/
├── CLAUDE.md
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── .env.local.example
├── public/
│   ├── fonts/
│   └── og/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, fonts, metadata
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Dashboard layout with sidebar
│   │   │   ├── dashboard/page.tsx  # List of analyzed conversations
│   │   │   └── analysis/
│   │   │       ├── new/page.tsx    # Upload new conversation
│   │   │       └── [id]/page.tsx   # View analysis results
│   │   ├── api/
│   │   │   ├── analyze/route.ts    # Main analysis endpoint
│   │   │   ├── parse/route.ts      # JSON parsing + validation
│   │   │   └── webhooks/
│   │   │       └── stripe/route.ts
│   │   └── pricing/page.tsx
│   ├── components/
│   │   ├── ui/                     # shadcn/ui base components
│   │   ├── landing/                # Landing page sections
│   │   │   ├── Hero.tsx
│   │   │   ├── Features.tsx
│   │   │   ├── Demo.tsx
│   │   │   ├── Pricing.tsx
│   │   │   └── Footer.tsx
│   │   ├── analysis/               # Analysis result components
│   │   │   ├── OverviewCard.tsx
│   │   │   ├── ToneAnalysis.tsx
│   │   │   ├── PersonalityProfile.tsx
│   │   │   ├── DynamicsChart.tsx
│   │   │   ├── TimelineView.tsx
│   │   │   ├── AttachmentPattern.tsx
│   │   │   ├── TopicCloud.tsx
│   │   │   └── ConversationHealth.tsx
│   │   ├── upload/
│   │   │   ├── DropZone.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   └── ProcessingState.tsx
│   │   └── shared/
│   │       ├── Navigation.tsx
│   │       ├── Logo.tsx
│   │       └── ThemeToggle.tsx
│   ├── lib/
│   │   ├── parsers/
│   │   │   ├── messenger.ts        # Facebook Messenger JSON parser
│   │   │   ├── instagram.ts        # Instagram DM parser (future)
│   │   │   ├── whatsapp.ts         # WhatsApp export parser (future)
│   │   │   └── types.ts            # Unified message format
│   │   ├── analysis/
│   │   │   ├── quantitative.ts     # All number-crunching (no AI needed)
│   │   │   ├── gemini.ts           # Gemini API analysis integration
│   │   │   ├── prompts.ts          # System prompts for analysis
│   │   │   └── types.ts            # Analysis result types
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── stripe/
│   │   │   └── config.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAnalysis.ts
│   │   ├── useFileUpload.ts
│   │   └── useSubscription.ts
│   └── types/
│       ├── analysis.ts
│       ├── conversation.ts
│       └── user.ts
```

## Messenger JSON Format

Facebook exports conversations as JSON with this structure:
```json
{
  "participants": [
    {"name": "Person A"},
    {"name": "Person B"}
  ],
  "messages": [
    {
      "sender_name": "Person A",
      "timestamp_ms": 1708000000000,
      "content": "message text here",
      "type": "Generic",
      "is_unsent": false,
      "reactions": [
        {"reaction": "\u00f0\u009f\u0098\u008d", "actor": "Person B"}
      ],
      "photos": [...],
      "share": {...},
      "sticker": {...}
    }
  ],
  "title": "Person A and Person B",
  "is_still_participant": true,
  "thread_path": "inbox/PersonB_abc123"
}
```

**Critical: Facebook Unicode Encoding.**
Facebook exports encode text as latin-1 escaped unicode. All strings (names, content, reactions) need decoding or Polish characters (ą, ę, ś, ć, ź, ż, ó, ł, ń) and emoji will be garbled. This is THE most common bug:

```typescript
function decodeFBString(str: string): string {
  try {
    return new TextDecoder('utf-8').decode(
      new Uint8Array(str.split('').map(c => c.charCodeAt(0)))
    );
  } catch {
    return str;
  }
}
```

Apply `decodeFBString()` to EVERY string field during parsing: `sender_name`, `content`, `participants[].name`, `reactions[].reaction`, `reactions[].actor`, `title`. No exceptions.

## Analysis Pipeline

### Stage 1: Parsing & Validation (client-side + API)
- Parse JSON, validate structure
- Decode Facebook unicode encoding on all string fields
- Normalize to unified message format
- Extract metadata (participants, date range, message count)
- Handle edge cases: group chats (support 2+ participants), unsent messages, media-only messages, call events

### Stage 2: Quantitative Analysis (server-side, no AI)
Compute these metrics without AI API — pure math, fast, free:

**Volume metrics:**
- Total messages per person
- Messages per day/week/month (trend over time)
- Average message length (characters and words) per person
- Longest and shortest messages
- Total words per person
- Message count ratio between participants

**Timing metrics:**
- Average response time per person (median is more useful than mean)
- Who initiates conversations (first message after 6h+ gap)
- Active hours heatmap (hour of day × day of week matrix)
- Conversation frequency over time (increasing or decreasing trend)
- Longest silence between messages
- Late-night messaging patterns (22:00-04:00)
- Response time trend over months (getting slower = losing interest?)

**Engagement metrics:**
- Reaction frequency per person (and which reactions — ❤️ vs 😂 vs 👍)
- Photo/media sharing ratio per person
- Link sharing frequency
- Question mark frequency (who asks more questions?)
- Emoji usage frequency and top emoji per person
- Message-to-response ratio (does one person send 3 messages before getting 1 reply?)
- "Double texting" frequency per person (2+ messages in a row with no reply)
- Voice message frequency (if available in export)

**Pattern metrics:**
- Conversation initiation ratio (who starts talking more often)
- Who ends conversations (last message before 6h+ gap)
- Average conversation length (messages per session)
- Weekend vs weekday activity patterns
- Monthly/seasonal trends
- "Burst" detection (clusters of rapid messages vs sparse periods)

### Stage 3: Qualitative Analysis (Gemini API)
Send batched message samples to Gemini for deep analysis:

**Tone analysis:**
- Overall emotional tone per person (warm, neutral, distant, anxious, playful, sarcastic, etc.)
- Tone shifts over time (map emotional trajectory)
- Emotional range (does one person show more variety?)
- Formality level and shifts
- Humor style (self-deprecating, teasing, absurdist, sarcastic, absent)

**Communication style:**
- Direct vs indirect communication
- Assertive vs passive vs passive-aggressive
- Validation-seeking patterns ("right?", "you know?", seeking approval)
- Avoidance patterns (topic changes, deflection, going quiet)
- Confrontation style (direct, avoidant, explosive, passive)

**Personality indicators:**
- Big Five approximation from language patterns (with confidence levels)
- Attachment style indicators (anxious, avoidant, secure, disorganized)
- Communication needs (affirmation, space, consistency, spontaneity)
- Conflict resolution tendencies
- Emotional intelligence markers

**Relationship dynamics:**
- Power balance (who adapts language/tone to whom)
- Emotional labor distribution (who comforts, who asks, who deflects)
- Vulnerability level per person (self-disclosure depth)
- Topic avoidance patterns (what do they NOT talk about)
- Inside jokes / shared language development over time
- Relationship phase estimation (early excitement, settling, comfortable, declining)
- Reciprocity score (balance of effort, interest, emotional investment)

**Clinical-adjacent observations (with disclaimers):**
- Anxiety markers in communication (overthinking, reassurance-seeking)
- Avoidance markers (consistent topic dodging, emotional withdrawal)
- Manipulation patterns if present (guilt-tripping, gaslighting, love-bombing cycles)
- Boundary respect indicators
- Codependency signals
- Healthy communication examples worth highlighting

### Stage 4: Report Generation
Compile everything into a structured report:
- Executive summary (3-5 sentences, no fluff)
- Conversation Health Score (0-100, weighted composite)
- Key metrics dashboard (visual, data-dense)
- Detailed analysis sections with evidence
- Timeline visualization (emotional arc over time)
- Notable moments (AI-identified turning points)
- Actionable insights (specific, not generic advice)
- Comparison to baseline patterns (optional, future feature)

## Gemini API Analysis Strategy

**Do NOT send entire conversation to the AI.** Conversations can be 50,000+ messages. Instead:

### Sampling Strategy
1. Divide conversation into time-based segments (monthly or bi-weekly)
2. From each segment, select:
   - 10-20 representative exchanges (back-and-forth sequences)
   - Messages around detected inflection points (sudden silence, topic shift, emotional spike from quantitative analysis)
   - Longest messages (higher signal density)
   - Messages with reactions (emotional significance markers)
3. Total sample: 200-500 messages per analysis pass
4. Weight recent messages more heavily (60% recent 3 months, 40% older)

### Multi-Pass Analysis
- **Pass 1 — Overview:** Broad sample → tone, style, relationship type
- **Pass 2 — Dynamics:** Targeted samples around key moments → power balance, conflict, intimacy
- **Pass 3 — Individual profiles:** Solo message batches per person → personality, attachment, communication needs
- **Pass 4 — Synthesis:** Pass 1-3 results + quantitative data → final scores, insights, health assessment

### Prompt Design Principles
- Output format: always JSON with defined schema
- No hedging: "Based on available data, Person A shows anxious attachment patterns" not "It's hard to say but maybe..."
- Confidence levels: every assessment includes 0-100 confidence
- Evidence-based: cite specific message indices/quotes as evidence
- Culturally aware: handle Polish, English, and mixed-language conversations
- No moralizing: describe patterns, don't judge them

### Cost Target
- gemini-2.0-flash for all passes
- Gemini Flash pricing is significantly cheaper than frontier models — cost per analysis is minimal
- Batch efficiently — max context usage per call

## Design System

### Aesthetic Direction
Dark, editorial, data-dense. Bloomberg Terminal meets Spotify Wrapped meets clinical psychology report.

**Not:** cutesy, pastel, generic SaaS, rounded-everything, default Tailwind blue.
**Yes:** dark, precise, information-rich, confident, slightly provocative.

### Colors
```css
:root {
  --bg-primary: #050505;
  --bg-secondary: #0a0a0a;
  --bg-card: #111111;
  --bg-card-hover: #161616;
  --border: #1a1a1a;
  --border-hover: #2a2a2a;
  --text-primary: #fafafa;
  --text-secondary: #888888;
  --text-muted: #555555;
  --accent: #3b82f6;        /* Electric blue — primary actions, highlights */
  --accent-hover: #2563eb;
  --success: #10b981;       /* Green — positive indicators */
  --warning: #f59e0b;       /* Amber — neutral/caution */
  --danger: #ef4444;        /* Red — negative indicators, red flags */
  --chart-1: #3b82f6;       /* Person A color in all charts */
  --chart-2: #a855f7;       /* Person B color in all charts */
}
```

### Typography
- **Display/Headings:** Space Mono or JetBrains Mono — monospaced, technical feel
- **Body:** Geist Sans — clean, modern, readable
- **Data/Numbers:** Geist Mono — tabular figures, aligned numbers
- Font sizes: use Tailwind scale. Headings large and bold. Body 14-16px. Data labels 12px.

### Visual Components
- Cards: dark bg, subtle 1px border, slight hover lift
- Charts: custom colors per person, animated on scroll-in, tooltips on hover
- Heatmaps: for time-of-day activity, use color intensity
- Progress bars / gauges: for scores (health score, balance indicators)
- Sparklines: inline mini-charts for trends
- Tags/badges: for personality traits, communication patterns
- Grain texture overlay on backgrounds (subtle, 2-3% opacity)

### Animations
- Page transitions: fade + slight upward slide
- Card reveals: staggered entrance on scroll (IntersectionObserver or framer-motion)
- Number counters: animate from 0 to value on first view
- Chart drawing: animate line/bar charts on scroll-in
- Loading states: skeleton screens with subtle pulse, not spinners
- Hover states: scale(1.02) on cards, color shifts on interactive elements

### Landing Page Sections
1. **Hero:** Dark, full-viewport. Animated conversation bubbles floating/connecting. Headline: "Your conversations say more than you think." CTA: "Analyze Free"
2. **How it works:** 3-step visual. Upload → Process → Understand. Animated icons.
3. **Feature showcase:** Scrollable cards showing analysis types (tone, personality, dynamics) with preview visualizations using sample data
4. **Live demo:** Interactive demo with preloaded sample analysis. Let users click through a real report.
5. **Pricing:** 3-tier cards. Dark. Clean. Highlight Pro tier.
6. **Footer:** Minimal. Links. Privacy. "Built by [name]"

## Privacy & Security Requirements

1. **Raw messages are NOT stored** after analysis is complete. Only computed metrics and AI analysis results are persisted in database.
2. **File uploads are temporary.** In current local-only MVP, files are processed in-browser and never uploaded to a server. Future: delete from storage within 1 hour of processing completion.
3. **Shared reports are anonymized.** Names replaced with "Person A" / "Person B". No quoted messages in shared view — only paraphrased insights.
4. **No conversation content in logs.** API routes must not log message content. Log only metadata (message count, processing time, error types).
5. **GDPR-friendly.** User can delete all their data (analyses, account) with one action.
6. **Clear privacy messaging in UI.** Before upload: "Your messages are processed for analysis only and are not stored. Only aggregated insights are saved."

## Error Handling

- **Invalid JSON:** Show clear error with expected format. Link to Facebook export instructions.
- **Too small conversation:** Minimum 100 messages for meaningful analysis. Show warning for <500.
- **Too large file:** Stream parse. If >200MB, show warning about processing time. Set hard limit at 500MB.
- **API failures:** Retry Gemini API calls up to 3 times with exponential backoff. If all fail, save partial analysis (quantitative only) and offer to retry qualitative later.
- **Encoding issues:** If decoded strings still look garbled, flag to user and offer manual encoding selection.

## Pricing Model

| Feature | Free | Pro ($9.99/mo) | Unlimited ($24.99/mo) |
|---|---|---|---|
| Analyses per month | 1 | 10 | Unlimited |
| Quantitative metrics | ✅ | ✅ | ✅ |
| AI personality analysis | ❌ | ✅ | ✅ |
| AI relationship dynamics | ❌ | ✅ | ✅ |
| PDF export | ❌ | ✅ | ✅ |
| Shareable report link | ❌ | ✅ | ✅ |
| Conversation comparison | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| Priority processing | ❌ | ❌ | ✅ |

## Development Phases

### Phase 1 — Core
- [x] Project setup (Next.js, Tailwind, TypeScript)
- [x] Messenger JSON parser with unicode decoding
- [x] Unified message type system
- [x] Quantitative analysis engine (all metrics listed above)
- [x] Basic results page showing all quantitative metrics
- [x] File upload with drag-and-drop
- [x] Processing state UI (progress indicators)

### Phase 2 — AI Analysis
- [x] Gemini API integration (gemini-2.0-flash)
- [x] Message sampling strategy implementation
- [x] Analysis prompts (all 4 passes)
- [x] Qualitative analysis result types and display
- [x] Full report page with all sections
- [x] Conversation Health Score algorithm

### Phase 3 — Polish
- [x] Landing page (all sections)
- [x] Chart animations and custom visualizations
- [ ] PDF export (react-pdf or server-side generation)
- [ ] Shareable anonymized report links
- [ ] Mobile responsive pass
- [ ] Loading/skeleton states
- [x] Error boundaries and fallback UI

### Phase 4 — SaaS Infrastructure *(not yet started — local-only MVP uses localStorage)*
- [ ] Supabase Auth setup
- [ ] Database schema and migrations
- [ ] Stripe integration
- [ ] Usage tracking and limits
- [ ] Dashboard (list of past analyses)
- [ ] Account settings / data deletion

### Phase 5 — Scale (future)
- [ ] WhatsApp .txt parser
- [ ] Instagram DM JSON parser
- [ ] Telegram JSON parser
- [ ] Conversation comparison (analyze same person across platforms)
- [ ] Team/couple features (both partners analyze same conversation)
- [ ] API for developers
- [ ] i18n (Polish UI)

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm type-check   # TypeScript strict check
```

## Code Style

- TypeScript strict mode, no `any` types ever
- Functional components only, hooks for state
- Server Components by default, `'use client'` only when needed for interactivity
- Tailwind for all styling — no inline styles, no CSS modules, no styled-components
- Descriptive variable names, no single-letter abbreviations except in lambdas
- Comments explain "why", never "what" — the code explains what
- Error boundaries around every major UI section
- Loading/skeleton states for everything async
- No `console.log` in committed code — use proper error reporting
- Prefer early returns over nested conditionals
- Extract components when they exceed ~100 lines
- Colocate types with their consumers unless shared across 3+ files
