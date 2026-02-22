# PodTeksT — Conversation Analyzer

## Project Overview

PodTeksT (formerly ChatScope) is a local-first web app that analyzes conversation exports from Messenger, WhatsApp, Instagram, and Telegram. Users upload a chat export and receive 60+ quantitative metrics + multi-pass AI psychological analysis powered by Google Gemini API.

**Brand:** PodTeksT — "eks" in purple (#a855f7), rest in blue (#3b82f6). Wordplay: pod-tekst = subtext, eks = ex (Polish for "former partner"), między wierszami = between the lines.

**Tagline:** "odkryj to, co kryje się między wierszami"

**Core value proposition:** Quantitative metrics (client-side, no AI) + qualitative AI-powered psychological analysis of any conversation.

## Tech Stack

- **Framework:** Next.js 16+ (App Router), React 19
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS v4 + custom CSS variables for theming
- **UI Components:** shadcn/ui as base, heavily customized
- **Charts/Visualization:** Recharts + custom SVG visualizations
- **Animations:** Framer Motion + CSS keyframes
- **3D:** Spline (landing page scenes)
- **AI Analysis:** Google Gemini API (gemini-3-flash-preview)
- **Development AI:** Claude Opus 4.6 (claude-opus-4-6)
- **Storage:** localStorage + IndexedDB (DB name: 'podtekst', legacy fallback: 'chatscope')
- **PDF Export:** jsPDF (client-side generation)
- **Analytics:** Google Analytics 4 (typed events via `src/lib/analytics/events.ts`)
- **Deployment:** Google Cloud Run (Docker) — `output: 'standalone'` in next.config.ts
- **Package Manager:** pnpm

**Not yet implemented (future phases):** Supabase Auth, PostgreSQL, Stripe payments.

## Architecture

- **Parsing + Quantitative analysis:** Client-side (browser) — raw messages never leave device
- **Qualitative AI analysis:** Server-side API routes — only 200-500 sampled messages sent per pass
- **Data persistence:** IndexedDB locally, localStorage prefix: `podtekst-*`
- **AI streaming:** SSE (Server-Sent Events) with heartbeat every 15s

## Supported Platforms (Parsers)

| Platform | Parser | Format | Status |
|---|---|---|---|
| Facebook Messenger | `src/lib/parsers/messenger.ts` | JSON | Full support |
| WhatsApp | `src/lib/parsers/whatsapp.ts` | TXT | Full support |
| Instagram DM | `src/lib/parsers/instagram.ts` | JSON | Supported |
| Telegram | `src/lib/parsers/telegram.ts` | JSON | Supported |
| Discord | `src/lib/parsers/discord.ts` | API (Bot) | Supported |

Auto-detect: `src/lib/parsers/detect.ts` — identifies platform from file structure.
Discord uses direct API import via bot token (no file upload).

## API Endpoints

| Endpoint | Method | Description | Rate Limit |
|---|---|---|---|
| `/api/analyze` | POST | Main 4-pass AI analysis (SSE) | 5/10min |
| `/api/analyze/enhanced-roast` | POST | Enhanced roast with full psychological context (SSE) | 5/10min |
| `/api/analyze/standup` | POST | Stand-Up Comedy Roast — 7 acts (SSE) | 5/10min |
| `/api/analyze/cps` | POST | Communication Pattern Screening — 63 questions (SSE) | 5/10min |
| `/api/analyze/subtext` | POST | Subtext Decoder — hidden meanings in messages (SSE) | 5/10min |
| `/api/analyze/court` | POST | Chat Court Trial — AI courtroom verdict (SSE) | 5/10min |
| `/api/analyze/dating-profile` | POST | Honest Dating Profile generator (SSE) | 5/10min |
| `/api/analyze/simulate` | POST | Reply Simulator — predicts responses (SSE) | 5/10min |
| `/api/analyze/image` | POST | Gemini image generation | 10/10min |
| `/api/discord/fetch-messages` | POST | Discord Bot message fetcher (SSE) | 3/10min |
| `/api/health` | GET | Health check | none |

All SSE endpoints: heartbeat 15s, abort signal support, proper HTTP error codes (400, 413, 429).

## Project Structure (Key Files)

```
src/
├── app/
│   ├── layout.tsx                    # Root layout, fonts (Geist, Syne), metadata
│   ├── page.tsx                      # Landing page with CurtainReveal
│   ├── globals.css                   # Theme + animation keyframes
│   ├── sitemap.ts
│   ├── roast/page.tsx                # Standalone roast page
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── dashboard/page.tsx        # List of analyzed conversations
│   │   └── analysis/
│   │       ├── new/page.tsx          # Upload + parse + quantitative
│   │       ├── [id]/page.tsx         # Full analysis results view
│   │       └── compare/page.tsx      # Multi-conversation comparison
│   ├── (story)/
│   │   └── analysis/[id]/
│   │       └── wrapped/page.tsx      # Spotify Wrapped-style story mode
│   └── api/
│       ├── analyze/
│       │   ├── route.ts              # Main 4-pass analysis
│       │   ├── enhanced-roast/route.ts
│       │   ├── standup/route.ts
│       │   ├── cps/route.ts
│       │   ├── subtext/route.ts        # Subtext Decoder (30+ msg context windows)
│       │   ├── court/route.ts          # Chat Court Trial
│       │   ├── dating-profile/route.ts # Honest Dating Profile
│       │   ├── simulate/route.ts       # Reply Simulator
│       │   └── image/route.ts
│       ├── discord/
│       │   └── fetch-messages/route.ts # Discord Bot message fetcher (SSE)
│       └── health/route.ts
├── components/
│   ├── ui/                           # shadcn/ui base
│   ├── landing/
│   │   ├── LandingHero.tsx
│   │   ├── LandingHowItWorks.tsx
│   │   ├── LandingFeatureShowcase.tsx
│   │   ├── LandingDemo.tsx
│   │   ├── LandingSocialProof.tsx
│   │   ├── LandingFAQ.tsx
│   │   ├── LandingFooter.tsx
│   │   ├── CurtainReveal.tsx         # Theatrical curtain animation overlay
│   │   ├── ParticleBackground.tsx
│   │   ├── ScrollProgress.tsx        # Gradient scroll progress bar (top)
│   │   ├── HangingLetters.tsx        # Physics-based animated hanging letters
│   │   └── SplineInterlude.tsx
│   ├── analysis/
│   │   ├── AIAnalysisButton.tsx      # Main AI analysis trigger (4 passes + roast)
│   │   ├── EnhancedRoastButton.tsx   # Post-analysis psychological roast
│   │   ├── ExportPDFButton.tsx       # Standard PDF export
│   │   ├── StandUpPDFButton.tsx      # Stand-Up Comedy PDF
│   │   ├── CPSScreener.tsx           # Communication Pattern Screening
│   │   ├── SubtextDecoder.tsx        # Subtext Decoder — hidden meanings UI
│   │   ├── ChatCourtButton.tsx       # Court Trial trigger
│   │   ├── CourtVerdict.tsx          # Court Trial verdict display
│   │   ├── DatingProfileButton.tsx   # Dating Profile trigger
│   │   ├── DatingProfileResult.tsx   # Dating Profile result display
│   │   ├── ReplySimulator.tsx        # Reply Simulator interactive UI
│   │   ├── DelusionQuiz.tsx          # Delusion Quiz (self-awareness test)
│   │   ├── SectionNavigator.tsx      # Sticky section nav
│   │   ├── HeatmapChart.tsx
│   │   ├── TimelineChart.tsx
│   │   ├── ResponseTimeChart.tsx
│   │   ├── ComparisonRadar.tsx
│   │   ├── ComparisonTimeline.tsx
│   │   ├── BurstActivity.tsx
│   │   ├── EmojiReactions.tsx
│   │   ├── TopWordsCard.tsx
│   │   ├── MessageLengthSection.tsx
│   │   ├── WeekdayWeekendCard.tsx
│   │   ├── ResponseTimeHistogram.tsx # Response time distribution histogram
│   │   ├── HourlyActivityChart.tsx  # 24-hour stacked bar chart
│   │   ├── YearMilestones.tsx       # Peak/worst month + YoY trend
│   │   ├── ThreatMeters.tsx         # Ghost/Codependency/Manipulation/Trust gauges
│   │   ├── DamageReport.tsx         # Emotional Damage/Comm Grade/Repair/Therapy
│   │   ├── CognitiveFunctionsClash.tsx # MBTI cognitive function comparison
│   │   ├── PursuitWithdrawalCard.tsx # Pursuit-withdrawal cycle detection
│   │   ├── RankingBadges.tsx        # Heuristic percentile rankings
│   │   ├── AIPredictions.tsx        # AI-generated predictions with confidence
│   │   ├── GottmanHorsemen.tsx      # Gottman Four Horsemen visualization
│   │   ├── ShareCaptionModal.tsx
│   │   ├── AnalysisImageCard.tsx
│   │   ├── RoastImageCard.tsx
│   │   └── chart-config.ts
│   ├── share-cards/                  # 20+ shareable card types for social
│   │   ├── ShareCardGallery.tsx
│   │   ├── ShareCardShell.tsx
│   │   ├── PersonalityCard.tsx
│   │   ├── PersonalityPassportCard.tsx
│   │   ├── ReceiptCard.tsx
│   │   ├── VersusCard.tsx / VersusCardV2.tsx
│   │   ├── CompatibilityCardV2.tsx
│   │   ├── RedFlagCard.tsx
│   │   ├── GhostForecastCard.tsx
│   │   ├── HealthScoreCard.tsx
│   │   ├── MBTICard.tsx
│   │   ├── BadgesCard.tsx
│   │   ├── FlagsCard.tsx
│   │   ├── LabelCard.tsx
│   │   ├── ScoresCard.tsx
│   │   ├── StatsCard.tsx
│   │   ├── SubtextCard.tsx           # Subtext Decoder share card
│   │   ├── DatingProfileCard.tsx     # Dating Profile share card
│   │   ├── DelusionCard.tsx          # Delusion Quiz share card
│   │   ├── MugshotCard.tsx           # Court Trial mugshot card
│   │   └── SimulatorCard.tsx         # Reply Simulator share card
│   ├── wrapped/                      # Spotify Wrapped-style story scenes
│   ├── story/
│   │   ├── StoryIntro.tsx
│   │   └── StoryShareCard.tsx
│   ├── upload/
│   │   ├── DropZone.tsx              # Drag-and-drop upload for all 4 platforms
│   │   └── DiscordImport.tsx         # Discord Bot import (token + channel ID)
│   └── shared/
│       ├── BrandLogo.tsx             # PodTeksT logo component
│       ├── PTLogo.tsx               # SVG "PT" logo with gradient
│       ├── BrandP.tsx               # Brand P component
│       ├── Navigation.tsx
│       ├── SidebarContext.tsx
│       ├── ConditionalAnalytics.tsx
│       └── CookieConsent.tsx
├── lib/
│   ├── parsers/
│   │   ├── messenger.ts
│   │   ├── whatsapp.ts
│   │   ├── instagram.ts
│   │   ├── telegram.ts
│   │   ├── discord.ts                # Discord API message parser
│   │   ├── detect.ts                 # Auto-detect platform from file
│   │   └── types.ts                  # Unified ParsedConversation type
│   ├── analysis/
│   │   ├── quantitative.ts           # 60+ metrics orchestrator, delegates to quant/
│   │   ├── quant/
│   │   │   ├── index.ts              # Barrel export
│   │   │   ├── helpers.ts            # extractEmojis, countWords, median, percentile, topN
│   │   │   ├── types.ts              # PersonAccumulator interface + factory
│   │   │   ├── bursts.ts             # detectBursts() — activity burst detection
│   │   │   ├── trends.ts             # computeTrends() — monthly trend computation
│   │   │   ├── reciprocity.ts        # computeReciprocityIndex()
│   │   │   ├── sentiment.ts          # computeSentimentScore()
│   │   │   ├── conflicts.ts          # detectConflicts()
│   │   │   ├── intimacy.ts           # computeIntimacyProgression()
│   │   │   ├── pursuit-withdrawal.ts # detectPursuitWithdrawal()
│   │   │   └── response-time-distribution.ts # computeResponseTimeDistribution()
│   │   ├── threat-meters.ts          # Codependency/Manipulation/Trust indexes
│   │   ├── damage-report.ts          # Emotional damage + communication grade
│   │   ├── cognitive-functions.ts     # MBTI → cognitive functions derivation
│   │   ├── gottman-horsemen.ts        # Gottman Four Horsemen from CPS data
│   │   ├── ranking-percentiles.ts     # Heuristic percentile rankings
│   │   ├── qualitative.ts            # Message sampling, context building
│   │   ├── gemini.ts                 # Gemini API calls (all passes + roasts)
│   │   ├── prompts.ts                # System prompts for all AI passes
│   │   ├── types.ts                  # All analysis result types
│   │   ├── badges.ts                 # 12+ achievement badges
│   │   ├── catchphrases.ts           # Per-person catchphrase detection
│   │   ├── constants.ts
│   │   ├── viral-scores.ts           # Compatibility, Interest, Delusion scores
│   │   ├── communication-patterns.ts
│   │   ├── wrapped-data.ts           # Data aggregation for Wrapped mode
│   │   ├── subtext.ts               # Subtext types + exchange window extraction
│   │   ├── court-prompts.ts          # Court Trial AI prompts
│   │   ├── dating-profile-prompts.ts # Dating Profile AI prompts
│   │   ├── simulator-prompts.ts      # Reply Simulator AI prompts
│   │   └── delusion-quiz.ts          # Delusion Quiz questions + scoring
│   ├── export/
│   │   ├── pdf-export.ts             # Standard analysis PDF
│   │   ├── standup-pdf.ts            # Stand-Up Comedy PDF
│   │   ├── pdf-fonts.ts              # Embedded font data for jsPDF
│   │   └── pdf-images.ts             # Embedded image data for PDFs
│   ├── analytics/
│   │   └── events.ts                 # Typed GA4 event tracking
│   └── utils.ts
├── hooks/
│   ├── useShareCard.ts               # Web Share API + PNG download
│   ├── useCPSAnalysis.ts
│   └── useSubtextAnalysis.ts         # Subtext Decoder SSE hook
└── types/
```

## Messenger JSON Format

Facebook exports encode text as latin-1 escaped unicode. All strings need decoding:

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

Apply to EVERY string field: `sender_name`, `content`, `participants[].name`, `reactions[].reaction`, `reactions[].actor`, `title`.

## Analysis Pipeline

### Stage 1: Parsing (client-side)
- Auto-detect platform from file structure
- Parse and normalize to unified `ParsedConversation` format
- Decode Facebook unicode encoding

### Stage 2: Quantitative Analysis (client-side, no AI)
80+ metrics: volume, timing, engagement, patterns, sentiment, conflicts, intimacy, pursuit-withdrawal, threat meters, damage report, ranking percentiles. Pure math, free, fast.

### Stage 3: Qualitative Analysis (server-side, Gemini API via SSE)
- **Pass 1 — Overview:** Tone, style, relationship type
- **Pass 2 — Dynamics:** Power balance, conflict, intimacy, emotional labor
- **Pass 3 — Individual profiles:** Big Five, MBTI, attachment style, love languages per person
- **Pass 4 — Synthesis:** Health Score (0-100), red/green flags, turning points, recommendations, AI predictions
- **Roast:** Humorous, provocative analysis
- **Enhanced Roast:** Post-analysis roast with full psychological context from Pass 1-4
- **Stand-Up:** 7-act comedy roast with PDF generation
- **CPS:** Communication Pattern Screening (63 questions)
- **Subtext Decoder:** Decodes hidden meanings in messages using 30+ message context windows per exchange
- **Court Trial:** AI courtroom trial — charges, prosecution, defense, verdict + mugshot cards
- **Dating Profile:** Brutally honest dating profile based on actual texting behavior
- **Reply Simulator:** Simulates how the other person would reply based on their communication patterns
- **Delusion Quiz:** Self-awareness test — guesses vs actual data, produces Delusion Index

### Sampling Strategy
200-500 messages per pass. Weight recent 3 months at 60%. Select: representative exchanges, inflection points, longest messages, messages with reactions.

### Prompt Design
- Output: always JSON with defined schema
- No hedging — direct assessments with confidence levels (0-100)
- Evidence-based — cite specific quotes
- Culturally aware — Polish, English, mixed-language support

## Key Features

### Viral / Entertainment
- 12+ achievement badges (Night Owl, Chatterbox, Double-Texter, etc.)
- 20+ shareable card types (Receipt, Versus, Red Flag, Ghost Forecast, MBTI, Subtext, Mugshot, etc.)
- Story Mode — Spotify Wrapped-style 12-scene animated story
- Stand-Up Comedy Roast — 7-act comedy PDF
- Subtext Decoder (Translator Podtekstów) — AI decodes what people REALLY meant
- Court Trial (Twój Chat w Sądzie) — AI courtroom with charges, verdict, mugshots
- Dating Profile Generator — honest dating profile from texting patterns
- Reply Simulator — predict responses in the other person's voice
- Delusion Quiz — self-awareness test with Delusion Index score
- Compatibility Score, Interest Score, Delusion Score
- Best Time to Text calculator
- Threat Meters (Codependency, Manipulation, Trust, Ghost Risk gauges)
- Damage Report (Emotional Damage%, Communication Grade, Repair Potential, Therapy Needed)
- Cognitive Functions Clash (MBTI cognitive function comparison between participants)
- Pursuit-Withdrawal Detection (cyclical pursuit/silence pattern analysis)
- Ranking Percentiles (heuristic TOP X% rankings for key metrics)
- AI Predictions (future relationship trajectory forecasts with confidence%)
- Gottman Four Horsemen (Criticism, Contempt, Defensiveness, Stonewalling mapping)
- Response Time Distribution Histogram
- 24-Hour Activity Stacked Bar Chart
- Year Milestones (peak/worst month, YoY trend)

### Landing Page
- Theatrical curtain animation (`CurtainReveal`) with neon logo effect
- Particle network background (desktop) / gradient (mobile)
- Spline 3D interlude scenes
- Scroll progress bar — gradient blue→purple→green (`ScrollProgress.tsx`)
- Mobile: diagonal hero text layout with skew animation
- Interactive demo with sample analysis

### Export
- PDF export (standard analysis + stand-up comedy)
- Share Cards (PNG for social media)
- Web Share API integration

## Design System

Dark, editorial, data-dense. Bloomberg Terminal meets Spotify Wrapped.

### Colors
```
Background:  #050505 / #0a0a0a
Cards:       #111111 (hover: #161616)
Border:      #1a1a1a (hover: #2a2a2a)
Text:        #fafafa / #888888 / #555555
Blue accent: #3b82f6 (Person A, primary actions)
Purple:      #a855f7 (Person B, "eks" brand element)
Success:     #10b981
Warning:     #f59e0b
Danger:      #ef4444
```

### Typography
- **Headings:** Syne (brand) — bold, distinctive
- **Body:** Geist Sans
- **Data/Code:** Geist Mono

## Privacy

1. Raw messages processed client-side — never uploaded to server
2. Only sampled messages (200-500) sent to Gemini API per pass
3. No conversation content in server logs
4. All data in browser storage (IndexedDB/localStorage)
5. GDPR-friendly — user can clear all data locally

## Error Handling

- **Invalid file:** Clear error with format instructions per platform
- **Too small conversation:** Minimum 100 messages for meaningful analysis
- **API failures:** Retry Gemini calls up to 3x with exponential backoff
- **Streaming errors:** SSE error events with Polish error messages, graceful degradation

## Development Phases

### Faza 1-10 — Core MVP ✅
- Messenger parser, quantitative analysis, AI 4-pass analysis
- All chart visualizations, dashboard, upload flow
- Conversation Health Score, personality profiles

### Faza 11-15 — Hardening ✅
- Audit, a11y, performance, security, GDPR

### Faza 16-17 — Viral Features ✅
- Share cards (15+ types), badges, viral scores
- Story/Wrapped mode, comparison view
- PDF export, image generation

### Faza 18 — Multi-Platform + Rebranding ✅
- Rebranding: ChatScope → PodTeksT (50+ files)
- WhatsApp, Instagram, Telegram parsers + auto-detect
- GA4 analytics integration
- Stand-Up Comedy Roast + PDF
- Web Share API, CPS screener

### Faza 19 ✅
- Theatrical curtain animation on landing page (`CurtainReveal`)
- Enhanced Roast — AI roast using full psychological analysis context
- StandUp PDF fix — emoji fallback for jsPDF, result validation

### Faza 20 — Entertainment Features ✅
- Subtext Decoder (Translator Podtekstów) — full pipeline: types, API, hook, UI, share card
- Court Trial (Twój Chat w Sądzie) — charges, prosecution, defense, verdict, mugshot cards
- Dating Profile Generator — honest dating profiles from texting behavior
- Reply Simulator — AI predicts responses in partner's voice
- Delusion Quiz — self-awareness test with Delusion Index
- 5 new share cards (Subtext, Mugshot, DatingProfile, Delusion, Simulator)

### Faza 21 — Polish & Deploy (Current) ✅
- Mobile landing page: diagonal hero text with skew, removed badge, CTA pinned to bottom
- ScrollProgress bar (gradient, fixed top)
- Timeline overflow fix (LandingHowItWorks mobile)
- Deployed to Google Cloud Run (europe-west1)

### Deployment
- **Platform:** Google Cloud Run (Docker, standalone output)
- **Project:** chatscope-app-2026
- **Region:** europe-west1
- **Service:** chatscope
- **URL:** https://chatscope-9278095424.europe-west1.run.app
- **Deploy command:** `gcloud run deploy chatscope --source . --region europe-west1 --allow-unauthenticated --port 8080 --memory 1Gi`

### Faza 22 — Discord Integration (Current)
- Discord Bot API integration — fetch channel messages via bot token
- New parser: `src/lib/parsers/discord.ts` (API → ParsedConversation)
- New API route: `/api/discord/fetch-messages` (SSE with pagination + rate limit handling)
- New UI: `DiscordImport.tsx` (token + channel ID form, progress, setup guide)
- Tab switcher on `/analysis/new` — "Plik eksportu" vs "Discord Bot"

### Future (not started)
- Supabase Auth + PostgreSQL
- Stripe payments (Free / Pro $9.99 / Unlimited $24.99)
- i18n (EN, DE, ES)
- Teams parser
- Public API, SDK

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint
```

## Maintenance Rules

**IMPORTANT: After completing any feature, bugfix, or architectural change, ALWAYS update this CLAUDE.md file to reflect the changes.** This includes:
- New API endpoints → add to API Endpoints table
- New files → add to Project Structure tree
- New features → add to Key Features + Analysis Pipeline sections
- Phase completion → update Development Phases section
- Model changes → update Tech Stack
- Deployment changes → update Deployment section

This file is the single source of truth for the project. Keep it current.

## Code Style

- TypeScript strict mode, no `any` types
- Functional components only, hooks for state
- Server Components by default, `'use client'` only when needed
- Tailwind for styling (inline styles only for complex dynamic animations like CurtainReveal)
- Descriptive variable names
- Comments explain "why", never "what"
- Error boundaries around major UI sections
- Prefer early returns over nested conditionals
- Polish language for user-facing strings
