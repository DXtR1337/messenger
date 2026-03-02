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

- **Auth (prepared):** Supabase Auth (`@supabase/supabase-js` + `@supabase/ssr`) — UI + middleware ready, requires Supabase project setup

**Not yet implemented (future phases):** Supabase PostgreSQL (profiles table), Stripe payments.

## Architecture

- **Parsing + Quantitative analysis:** Client-side (browser) — raw messages never leave device
- **Qualitative AI analysis:** Server-side API routes — only 200-500 sampled messages sent per pass
- **Data persistence:** IndexedDB locally, localStorage prefix: `podtekst-*`
- **AI streaming:** SSE (Server-Sent Events) with heartbeat every 15s
- **Auth:** Supabase Auth (conditional — skips when env vars not set). Cookie-based sessions via `@supabase/ssr`

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
| `/api/analyze` | POST | Three-phase AI analysis: recon → deep_recon → deep (Pass 0-4, SSE) | 5/10min |
| `/api/analyze/enhanced-roast` | POST | Enhanced roast with full psychological context (SSE) | 5/10min |
| `/api/analyze/standup` | POST | Stand-Up Comedy Roast — 7 acts (SSE) | 5/10min |
| `/api/analyze/cps` | POST | Communication Pattern Screening — 63 questions (SSE) | 5/10min |
| `/api/analyze/subtext` | POST | Subtext Decoder — hidden meanings in messages (SSE) | 5/10min |
| `/api/analyze/court` | POST | Chat Court Trial — AI courtroom verdict (SSE) | 5/10min |
| `/api/analyze/dating-profile` | POST | Honest Dating Profile generator (SSE) | 5/10min |
| `/api/analyze/simulate` | POST | Reply Simulator — predicts responses (SSE) | 5/10min |
| `/api/analyze/przegryw` | POST | Przegryw Tygodnia — AI ceremony roast (SSE) | 5/10min |
| `/api/analyze/capitalization` | POST | Capitalization/ACR analysis (Gable 2004) — SSE | 5/10min |
| `/api/analyze/eks` | POST | Tryb Eks — 3-pass relationship autopsy: recon/autopsy modes (SSE) | 5/10min |
| `/api/analyze/moral-foundations` | POST | Moral Foundations Theory analysis (SSE) | 5/10min |
| `/api/analyze/emotion-causes` | POST | Emotion Cause Extraction (SSE) | 5/10min |
| `/api/analyze/image` | POST | Gemini image generation | 10/10min |
| `/api/discord/fetch-messages` | POST | Discord Bot message fetcher (SSE) | 3/10min |
| `/api/discord/send-roast` | POST | Send mega roast/przegryw to Discord channel | 10/10min |
| `/api/health` | GET | Health check | none |
| `/auth/login` | page | Login (email/password, Google OAuth) | — |
| `/auth/signup` | page | Sign up | — |
| `/auth/reset` | page | Password reset | — |
| `/auth/callback` | GET | OAuth callback handler | — |
| `/settings` | page | User settings (preferences, data, about) | — |
| `/profile` | page | User profile + stats | — |
| `/metodologia` | page | Methodology — 57 algorithms documented | — |

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
│   │   ├── profile/page.tsx          # User profile + local stats
│   │   ├── settings/page.tsx         # Settings (preferences, data, about)
│   │   └── analysis/
│   │       ├── new/page.tsx          # Upload + parse + quantitative
│   │       ├── [id]/page.tsx         # Full analysis results view
│   │       ├── compare/page.tsx      # Multi-relationship Comparison Hub (9-tab, N conversations)
│   │       └── [id]/eks/page.tsx    # Tryb Eks — 11-scene cinematic relationship autopsy
│   ├── auth/
│   │   ├── login/page.tsx            # Login (email/password + Google OAuth)
│   │   ├── signup/page.tsx           # Sign up
│   │   ├── reset/page.tsx            # Password reset
│   │   └── callback/route.ts        # OAuth callback handler
│   ├── metodologia/page.tsx          # Methodology page (57 algorithms)
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
│   │   ├── AIAnalysisButton.tsx      # Main AI trigger — three-phase: recon → deep_recon → Pass 1-4
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
│   │   ├── EksButton.tsx            # Tryb Eks analysis trigger
│   │   ├── EksPdfButton.tsx        # Eks PDF export trigger (Akt Zgonu)
│   │   ├── EksEntryGate.tsx         # Eks emotional readiness gate
│   │   ├── EksEmergencyExit.tsx     # Eks "Chcę przerwać" floating button + warm exit
│   │   ├── eks/                     # EKS V4 scrollytelling infrastructure
│   │   │   ├── shared.tsx           # Scene, SceneManagerProvider, EKGDivider, Embers, NoiseOverlay
│   │   │   ├── scene-themes.ts      # 16 SCENE_THEMES with per-scene CSS custom properties
│   │   │   ├── SceneIndicator.tsx   # Desktop dots + mobile bottom bar navigation
│   │   │   ├── ParticleCanvas.tsx   # Canvas2D particle system (embers/ash/dust)
│   │   │   ├── ScrollReveal.tsx     # IntersectionObserver progressive deblur component
│   │   │   ├── ScrollVideo.tsx      # Scroll-linked video background
│   │   │   ├── AudioToggle.tsx      # Floating audio control with volume slider
│   │   │   ├── EksCardGallery.tsx   # 11 share cards with download + Web Share API
│   │   │   ├── EksShareButton.tsx   # Anonymized share link generator
│   │   │   └── scenes/             # 16 scene components (dynamically imported)
│   │   │       ├── IntroScene.tsx, DeathLineScene.tsx, PhasesScene.tsx
│   │   │       ├── TurningPointScene.tsx, WhoLeftScene.tsx, LastWordsScene.tsx
│   │   │       ├── UnsaidScene.tsx, AutopsyScene.tsx, DeathCertificateScene.tsx
│   │   │       ├── LossProfileScene.tsx, PainSymmetryScene.tsx, PatternsScene.tsx
│   │   │       ├── TherapistLetterScene.tsx, GoldenAgeScene.tsx
│   │   │       └── ForecastScene.tsx, EpitaphScene.tsx
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
│   │   ├── LSMCard.tsx             # Language Style Matching visualization
│   │   ├── PronounCard.tsx         # Pronoun I/We/You analysis card
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
│   │   ├── SimulatorCard.tsx         # Reply Simulator share card
│   │   ├── NekrologCard.tsx         # Eks: Relationship obituary
│   │   ├── AktZgonuCard.tsx         # Eks: Death certificate
│   │   ├── ParagonCzasuCard.tsx     # Eks: Wasted time receipt
│   │   ├── AutopsyCard.tsx          # Eks: Autopsy report
│   │   ├── ForecastCard.tsx         # Eks: Return forecast
│   │   ├── DecayPhasesCard.tsx      # Eks: Decay phases timeline
│   │   ├── TombstoneCard.tsx        # Eks: Tombstone
│   │   ├── GoldenAgeCard.tsx        # Eks: Golden age memories
│   │   ├── UnsaidCard.tsx           # Eks: "Niewypowiedziane" unsaid things
│   │   └── DeathCertificateCard.tsx # Eks: Formal death certificate V2
│   ├── compare/                      # Multi-relationship Comparison Hub
│   │   ├── CompareHeader.tsx         # Multi-select analysis picker + user detection display
│   │   ├── CompareTabs.tsx           # 9-tab sticky controller with framer-motion underline
│   │   ├── QuantCompareTab.tsx       # ALL 80+ quant metrics in 8 collapsible sections
│   │   ├── MetricCompareRow.tsx      # Shared: horizontal bars per relationship for one metric
│   │   ├── RankingTab.tsx            # Sortable ranking table (compatibility, health, LSM, etc.)
│   │   ├── RadarProfilesTab.tsx      # Per-relationship radar charts + overlay mode
│   │   ├── TimelineCompareTab.tsx    # Multi-series temporal trend overlays (6 trend types)
│   │   ├── InsightsTab.tsx           # 20+ auto-generated insight cards (quant + AI)
│   │   ├── HealthTab.tsx             # Per-relationship health dashboard with score rings
│   │   ├── DynamicsTab.tsx           # AI trait sliders (12 dimensions) per relationship
│   │   ├── VariationsTab.tsx         # Self-trait variance cards (σ, CV%, stability)
│   │   └── UserProfileTab.tsx        # Aggregate user profile (quant + AI Big Five/MBTI/attach.)
│   ├── metodologia/                  # Methodology page components
│   │   ├── MethodologyHero.tsx       # Hero section (57 total, 23 AI, 34 quant)
│   │   ├── MethodologyAlgorithmCard.tsx # Individual algorithm detail card
│   │   ├── MethodologySidebar.tsx    # Sticky sidebar navigation
│   │   └── methodology-data.ts       # All 57 algorithm definitions
│   ├── wrapped/                      # Spotify Wrapped-style story scenes
│   ├── story/
│   │   ├── StoryIntro.tsx
│   │   └── StoryShareCard.tsx
│   ├── auth/
│   │   ├── AuthForm.tsx              # Shared login/signup/reset form
│   │   └── UserMenu.tsx              # Avatar + dropdown (Profile, Settings, Logout)
│   ├── upload/
│   │   ├── DropZone.tsx              # Drag-and-drop upload for all 4 platforms
│   │   └── DiscordImport.tsx         # Discord Bot import (token + channel ID)
│   └── shared/
│       ├── BrandLogo.tsx             # PodTeksT logo component
│       ├── PTLogo.tsx               # SVG "PT" logo with gradient
│       ├── BrandP.tsx               # Brand P component
│       ├── PsychDisclaimer.tsx      # Reusable psych disclaimer with citations
│       ├── Navigation.tsx
│       ├── SidebarContext.tsx
│       ├── ConditionalAnalytics.tsx
│       └── CookieConsent.tsx
├── lib/
│   ├── compare/
│   │   ├── index.ts                  # Barrel export
│   │   ├── types.ts                  # ComparisonRecord, PersonQuantData, PersonAIData, trait dimensions
│   │   ├── extract.ts                # extractComparisonRecord() — StoredAnalysis → ComparisonRecord
│   │   ├── user-detection.ts         # detectCommonUser(), getPartnerName(), filterOneOnOne()
│   │   └── statistics.ts             # mean, stddev, cv, pearsonCorrelation, normalize, argMax/Min
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
│   │   │   ├── response-time-distribution.ts # computeResponseTimeDistribution()
│   │   │   ├── lsm.ts              # computeLSM() — Language Style Matching
│   │   │   ├── pronouns.ts         # computePronounAnalysis() — I/We/You rates
│   │   │   ├── chronotype.ts       # computeChronotypeCompatibility() — behavioral chronotype
│   │   │   ├── shift-support.ts    # computeShiftSupportRatio() — Conversational Narcissism Index
│   │   │   ├── emotional-granularity.ts # computeEmotionalGranularity() — emotion diversity
│   │   │   ├── bid-response.ts     # computeBidResponseRatio() — Gottman "turning toward"
│   │   │   ├── integrative-complexity.ts # AutoIC phrase scoring
│   │   │   ├── temporal-focus.ts   # Past/Present/Future orientation
│   │   │   ├── repair-patterns.ts  # Schegloff self/other repair
│   │   │   └── gaps.ts             # Conversation gap detection
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
│   │   ├── citations.ts              # Academic citation constants (Gottman, Bowlby, etc.)
│   │   ├── communication-patterns.ts
│   │   ├── wrapped-data.ts           # Data aggregation for Wrapped mode
│   │   ├── subtext.ts               # Subtext types + exchange window extraction
│   │   ├── court-prompts.ts          # Court Trial AI prompts
│   │   ├── eks-prompts.ts            # Tryb Eks (relationship autopsy) AI prompts + types
│   │   ├── dating-profile-prompts.ts # Dating Profile AI prompts
│   │   ├── simulator-prompts.ts      # Reply Simulator AI prompts
│   │   └── delusion-quiz.ts          # Delusion Quiz questions + scoring
│   ├── export/
│   │   ├── pdf-export.ts             # Standard analysis PDF
│   │   ├── standup-pdf.ts            # Stand-Up Comedy PDF
│   │   ├── pdf-fonts.ts              # Embedded font data for jsPDF
│   │   ├── eks-pdf.ts                # Eks 6-page crimson A4 PDF (Akt Zgonu)
│   │   └── pdf-images.ts             # Embedded image data for PDFs
│   ├── share/
│   │   ├── encode.ts                 # Anonymized EKS share URL builder (LZ compression)
│   │   ├── decode.ts                 # Share URL decoder
│   │   ├── types.ts                  # Share payload types
│   │   └── index.ts                  # Barrel export
│   ├── analytics/
│   │   └── events.ts                 # Typed GA4 event tracking
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   ├── server.ts                 # Server Supabase client (cookies)
│   │   └── middleware.ts             # Session refresh + route protection
│   ├── settings/
│   │   └── storage-utils.ts          # IndexedDB export/import/clear helpers
│   └── utils.ts
├── hooks/
│   ├── useShareCard.ts               # Web Share API + PNG download
│   ├── useCPSAnalysis.ts
│   ├── useSubtextAnalysis.ts         # Subtext Decoder SSE hook
│   ├── useEksAnalysis.ts            # Tryb Eks SSE hook
│   ├── useSceneManager.ts           # IntersectionObserver scene tracker (rAF throttled)
│   ├── useSceneAudio.ts             # Web Audio API ambient playback per scene mood
│   └── useReducedMotion.ts          # prefers-reduced-motion hook
└── types/
middleware.ts                          # Root middleware — Supabase session refresh (conditional)
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
80+ metrics: volume, timing, engagement, patterns, sentiment, conflicts, intimacy, pursuit-withdrawal, threat meters, damage report, ranking percentiles, LSM, pronoun analysis. Pure math, free, fast.

### Stage 3: Qualitative Analysis (server-side, Gemini API via SSE)

**Three-Phase Intelligent Sampling Pipeline:**
```
Phase 1: Recon (Pass 0)     — 500 stratified msgs → AI identifies critical date ranges, topics + keywords, emotional peaks
Phase 2: Deep Recon (Pass 0.5) — targeted msgs from Phase 1 → AI refines ranges + topics, builds narrative summary
Phase 3: Deep Analysis (Pass 1-4) — original + all targeted samples (~1500 msgs) with Intelligence Briefing from recon
```

Client-side extraction between phases: `extractTargetedSamples()` (600 cap) → `extractDeepTargetedSamples()` (400 cap). Searches by date ranges, topic keywords (PL+EN, case-insensitive), emotional keywords, late-night messages. ±2 context messages around matches. Backward-compatible: omitting `phase` field triggers old single-phase behavior.

**Types:** `ReconResult` (flaggedDateRanges, topicsToInvestigate, emotionalPeaks, observedThemes, openQuestions), `DeepReconResult` (refinedDateRanges, refinedTopics, confirmedPeaks, confirmedThemes, narrativeSummary, newQuestions)

**Main passes (with Intelligence Briefing from recon):**
- **Pass 1 — Overview:** Tone, style, relationship type
- **Pass 2 — Dynamics:** Power balance, conflict, intimacy, emotional labor (receives targeted samples, token limit 12288)
- **Pass 3 — Individual profiles:** Big Five, MBTI, attachment style, love languages per person
- **Pass 4 — Synthesis:** Health Score (0-100), red/green flags, turning points, recommendations, AI predictions

**Additional AI modes:** Roast, Enhanced Roast, Stand-Up (7-act PDF), CPS (63 questions), Subtext Decoder, Court Trial, Dating Profile, Reply Simulator, Delusion Quiz, Tryb Eks (16-scene cinematic relationship autopsy), Moral Foundations, Emotion Causes, Capitalization (ACR), Przegryw Tygodnia

### Sampling Strategy
Recon: 500 stratified messages. Main passes: 200-500 per pass + up to ~1000 targeted samples. Weight recent 3 months at 60%. Select: representative exchanges, inflection points, longest messages, messages with reactions.

### Prompt Design
- Output: always JSON with defined schema
- No hedging — direct assessments with confidence levels (0-100)
- Temperature selection rationale:
  - 0.3 (Main Analysis, CPS): Structured JSON output requires high consistency; lower temperatures reduce output variance
  - 0.5 (Court Trial, Enhanced Roast): Semi-creative entertainment — balances factual anchoring with stylistic variety
  - 0.5 (Reply Simulator): Reduced from 0.7 to improve response consistency across repeated interactions
  - 0.7 (Dating Profile, Stand-Up): Maximum creativity for comedy and voice-matching generation
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
- Tryb Eks — cinematic relationship autopsy (11 scenes, 8 share cards, emotional safety system, revisit comparison)
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

### Completed Phases (summary)

| Phase | Focus | Key Deliverables |
|---|---|---|
| 1-10 | Core MVP | Messenger parser, quant analysis, 4-pass AI, charts, dashboard |
| 11-15 | Hardening | Audit, a11y, performance, security, GDPR |
| 16-17 | Viral Features | 15+ share cards, badges, Story/Wrapped mode, Comparison Hub (9-tab), PDF export |
| 18 | Multi-Platform | ChatScope→PodTeksT rebrand, WhatsApp/Instagram/Telegram parsers, GA4, Stand-Up, CPS |
| 19 | Polish | CurtainReveal animation, Enhanced Roast, StandUp PDF fixes |
| 20 | Entertainment | Subtext Decoder, Court Trial, Dating Profile, Reply Simulator, Delusion Quiz |
| 21 | Deploy | Mobile landing, ScrollProgress, Cloud Run deployment |
| 22 | Discord | Discord Bot integration, `/api/discord/fetch-messages`, DiscordImport UI |
| 25 | Auth/Settings | Supabase Auth (UI ready), settings page, profile page, image optimization |
| 26 | Psych Hardening | Manipulation→Power Imbalance rename, therapy→benefit scale, PsychDisclaimer, citations, sentiment negation |
| 27 | Validation | LSM (Ireland & Pennebaker), Pronoun analysis, Big Five anchors, frequency labels, codependency/CPS/delusion fixes |
| 30 | Constructs I | Chronotype, CNI (Derber), Emotional Granularity, Bid-Response (Gottman), Capitalization (ACR) |
| 31 | Constructs II | Integrative Complexity, Temporal Focus, Repair Patterns, Social Jet Lag, Moral Foundations, Emotion Causes |
| 32 | Tryb Eks | 16-scene cinematic relationship autopsy, 3-pass AI (recon→autopsy→verdict), 10 share cards, emotional safety, scrollytelling, Canvas2D particles, Web Audio, PDF export, anonymized sharing |
| 33 | Intelligent Sampling | Three-phase recon pipeline (Pass 0 → Pass 0.5 → Pass 1-4), client-side targeted extraction by date/topic/keyword, Intelligence Briefing, /metodologia page (57 algorithms) |

### Deployment
- **Platform:** Google Cloud Run (Docker, standalone output)
- **Project:** chatscope-app-2026
- **Region:** europe-west1
- **Service:** chatscope
- **URL:** https://chatscope-9278095424.europe-west1.run.app
- **Deploy command:** `gcloud run deploy chatscope --source . --region europe-west1 --allow-unauthenticated --port 8080 --memory 1Gi`

### Key Technical Decisions (reference)
- **Manipulation → "Nierównowaga Wpływu"**: Internal keys preserved for IndexedDB compat
- **Clinical → Frequency labels**: `severity` → `frequency` (not_observed/occasional/recurring/pervasive)
- **Codependency → "Intensywność Przywiązania"**: Weights normalized to 1.0
- **Supabase Auth**: UI ready, requires env vars to activate
- **Sentiment**: 6-layer Polish dictionary (~3200 pos, ~4000 neg), inflection fallback, PL+EN negation

### Future (not started)
- Supabase PostgreSQL (`profiles` table + RLS policies + trigger)
- Stripe payments (Free / Pro $9.99 / Unlimited $24.99)
- Cloud sync (analyses to Supabase Storage)
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
