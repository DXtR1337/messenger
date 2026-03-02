<p align="center">
  <img src="podtekst_logo.svg" alt="PodTeksT" width="380" />
</p>

<p align="center">
  <b>odkryj to, co kryje się między wierszami</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16+-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/Gemini_AI-3_Flash-8E75B2?style=for-the-badge&logo=google" />
  <img src="https://img.shields.io/badge/Discord_Bot-15_commands-5865F2?style=for-the-badge&logo=discord" />
</p>

<p align="center">
  AI-powered conversation analyzer that reveals the psychology behind your chats.<br/>
  Upload your Messenger, WhatsApp, Instagram, Telegram, or Discord export and discover what your texts <i>really</i> say.
</p>

---

## What is PodTeksT?

PodTeksT is a web app that analyzes chat exports from popular messaging platforms. It computes **150+ quantitative metrics** entirely client-side (your raw messages never leave your device) and runs a **multi-pass AI psychological analysis** server-side using the Gemini API.

Every metric is backed by academic research — fake citations have been replaced, formulas validated against published methodology, and clinical-sounding labels renamed to neutral language following a comprehensive scientific audit.

### Privacy First
- **Raw messages processed client-side** — never sent to any server
- Only 200-500 sampled messages sent to Gemini per AI pass
- All data stored locally (IndexedDB / localStorage)
- GDPR-friendly — delete your data anytime
- Rate limiting + CSP headers on all endpoints

---

## Supported Platforms

| Platform | Format | Import Method |
|---|---|---|
| Facebook Messenger | JSON export | File upload |
| WhatsApp | TXT export | File upload |
| Instagram DM | JSON export | File upload |
| Telegram | JSON export | File upload |
| Discord | API | Bot integration |

Auto-detection identifies the platform from file structure.

---

## Quantitative Analysis (150+ Metrics)

All computed **client-side** — no AI involved.

<details>
<summary><b>Per-Person Stats</b></summary>

- Total messages, words, avg words/message
- Longest & shortest messages
- Questions asked & question ratio
- Media count (photos, video, GIF, stickers, audio, files)
- Reactions sent & received (split give/receive rates)
- Deleted & edited messages
- Active days, first/last message date
- Top 10 emoji, top 20 words, top 10 phrases (2-4 word n-grams)
- Catchphrase detection (person-unique bigrams/trigrams)
</details>

<details>
<summary><b>Timing & Response Times</b></summary>

- Median, average, fastest, slowest response time
- Conversation initiations & initiation ratio
- Longest silence (duration, who broke it)
- Double-text rate & count
- Response time distribution (8 bins: <10s to >1h)
- Burst-aware first-unanswered-message detection
- IQR outlier filtering, enter-as-comma consolidation
</details>

<details>
<summary><b>Engagement & Activity</b></summary>

- Engagement score (weighted composite, 0-100)
- Consistency score, message ratio
- Double texts, max consecutive messages
- Session count (6h gap threshold)
- Late night ratio (0:00-5:00), weekend ratio
- **Heatmap:** 7x24 activity matrix (day x hour)
- **24h Activity Chart:** stacked per person
- **Monthly Trends:** volume, response time, message length, initiations, sentiment
- **Year Milestones:** peak/worst month, YoY trend
</details>

<details>
<summary><b>Relationship Dynamics</b></summary>

- **Sentiment Analysis** — AFINN-165 integer weights (not binary), Polish 6-layer dictionary (plWordNet-emo, NAWL, sentiment-polish), negation handling (2-token PL+EN)
- **Conflict Detection** — escalation spikes, cold silences, resolution patterns, accusatory bigram detection (PL+EN)
- **Intimacy Progression** — monthly score (casual to intimate)
- **Pursuit-Withdrawal** — cycle detection with demand marker content analysis ("dlaczego nie odpisujesz", "halo?", "??")
- **Reciprocity Index** — composite 0-1 (messages, words, initiations, response times)
- **Burst Detection** — activity spikes (3x rolling 7-day average threshold)
</details>

<details>
<summary><b>Linguistic Analysis</b></summary>

- **MTLD** (Measure of Textual Lexical Diversity) — replaces Guiraud's R, text-length independent (McCarthy & Jarvis 2010)
- **Language Style Matching (LSM)** — 9 function word categories PL+EN (Ireland & Pennebaker 2010), adaptation asymmetry detection
- **Pronoun Analysis** — I/We/You rates with full Polish declension (Pennebaker 2011, Karan et al. 2019 meta-analysis)
- **Conversational Narcissism Index (CNI)** — shift-response vs support-response ratio (Derber 1979)
- **Emotion Vocabulary Diversity** — 12-category Plutchik-extended lexicon PL+EN, co-occurrence adjusted (V2)
- **Cognitive Complexity Indicator** — differentiation + integration phrase detection PL+EN (inspired by Suedfeld & Tetlock 1977)
- **Temporal Focus** — past/present/future marker rates per 1000 words PL+EN
- **Conversational Repair Patterns** — self-repair vs other-repair markers PL+EN + asterisk repair detection (Schegloff et al. 1977)
</details>

<details>
<summary><b>Chronobiology</b></summary>

- **Behavioral Chronotype** — circular weighted midpoint from message timestamps (Roy et al. 2021, Aledavood et al. 2018)
- **Chronotype Compatibility Score** — match score 0-100 by delta hours
- **Weekday-Weekend Messaging Shift** — separate weekday/weekend activity distributions (inspired by Roenneberg et al. 2012)
</details>

<details>
<summary><b>Viral Scores</b></summary>

| Score | What it measures | Range |
|---|---|---|
| Compatibility | Reciprocity, balance, response consistency, shared activity, **LSM** | 0-100 |
| Interest | Initiation rate, response speed, message length ratio, questions | 0-100 |
| Ghost Risk | Response time trend, silence frequency, message gap growth | 0-100 |
| Investment Asymmetry | Difference in interest scores between participants (Stanley et al. 2017) | 0-100 |
</details>

<details>
<summary><b>Dynamic Indicators & Communication Assessment</b></summary>

**4 Dynamic Indicators (0-100):** Ghost Risk, Attachment Intensity, Power Imbalance, Communication Reciprocity

**Communication Assessment:**
- Communication Strain Index (qualitative bands, not %)
- Communication Grade (A-F)
- Repair Potential (0-100%)
- Consultation Benefit (HIGH / MODERATE / LOW)

**Gottman-Inspired Communication Risk Indicators:** Criticism, Contempt, Defensiveness, Stonewalling — mapped from communication patterns. Includes disclaimer about text-based limitations (Kim, Capaldi & Crosby 2007 replication findings).

**Bid-Response Ratio:** Gottman's "turning toward" — bids (questions, disclosures, URLs) with response tracking (Driver & Gottman 2004).
</details>

<details>
<summary><b>Ranking Percentiles & Badges</b></summary>

**Heuristic Percentile Rankings** for key metrics (estimated distributions, clearly labeled).

**15 Badges:**
Night Owl, Chatterbox, Double Texter, Emoji King/Queen, Ghost Buster, Essay Writer, Question Master, Speed Demon, Conversation Starter, Media Lover, Weekend Warrior, Early Bird, Storyteller, Reactor, Marathon Chatter
</details>

---

## AI Analysis (Gemini API)

Multi-pass psychological analysis using `gemini-3-flash-preview`:

| Pass | Name | What it generates |
|---|---|---|
| **1** | Relationship Overview | Tone, communication style, relationship type, dominant themes |
| **2** | Relationship Dynamics | Power balance, conflict patterns, intimacy, red/green flags, turning points |
| **3** | Individual Profiles | Big Five (calibrated 1-10 scale), MBTI, attachment style, love languages, communication meters |
| **4** | Final Synthesis | Health Score (0-100, 5-component operational definition), sub-scores, AI predictions with confidence% |

---

## Interactive AI Modules

| Module | Description |
|---|---|
| **Enhanced Roast** | Psychological roast with full Pass 1-4 context |
| **Stand-Up Comedy** | 7-act comedy show about your chat (PDF export) |
| **CPS Screener** | 63-question Communication Pattern Screening (10 patterns) |
| **Subtext Decoder** | Decodes hidden meanings in 30+ message context windows |
| **Court Trial** | AI courtroom with charges, prosecution, defense, verdict + mugshot cards |
| **Dating Profile** | Honest dating profile based on texting behavior |
| **Reply Simulator** | Type a message, get a response in your partner's voice |
| **Delusion Quiz** | Self-awareness test — perception vs reality (Delusion Index 0-100) |
| **Capitalization (ACR)** | Active-Constructive Responding analysis (Gable et al. 2004) |
| **Moral Foundations** | Haidt's 6 foundations — radar chart, conflict analysis, moral compatibility |
| **Emotion Causes** | SemEval-2024 format — who triggered what emotion, responsibility mapping |
| **Argument Simulator** | AI generates a realistic argument scenario between participants |

---

## Tryb Eks — Relationship Autopsy

A cinematic scrollytelling experience for analyzing ended relationships.

**16 Scenes:** Intro, Death Line chart, Decay Phases, Turning Point, Who Left First, Last Words, Unsaid Things, Autopsy Report, Death Certificate, Loss Profiles, Pain Symmetry, Repeating Patterns, Therapist Letter, Golden Age, Post-Breakup Forecast, Epitaph

**3-Phase AI Pipeline:**
1. Recon (temp 0.3) — scanning for critical moments
2. Deep Autopsy (temp 0.4) — targeted analysis with evidence
3. Verdict (temp 0.6) — synthesis and forecast

**Features:**
- Scene-by-scene IntersectionObserver navigation with per-scene CSS themes
- Canvas2D particle system (embers, ash, dust) with noise-based drift
- Web Audio API ambient soundscape (9 mood groups, crossfade between scenes)
- 6-page crimson A4 PDF export (Akt Zgonu)
- 11 share cards (Nekrolog, Akt Zgonu, Paragon Czasu, Autopsy, Forecast, Decay Phases, Tombstone, Golden Age, Unsaid, Death Certificate, Death Line)
- Emotional safety: entry gate, emergency exit button, crisis hotline (116 123)
- Revisit comparison — archives previous result, shows delta on re-run
- Anonymized share links with LZ compression

---

## Multi-Relationship Comparison Hub

Compare yourself across N relationships in a 9-tab system:

| Tab | What it shows |
|---|---|
| Dynamika | AI trait sliders (12 dimensions) per relationship |
| Statystyki | All 80+ quant metrics in 8 collapsible sections |
| Wariancje | Self-trait variance cards (sigma, CV%, stability) |
| Odkrycia | 20+ auto-generated insight cards (quant + AI) |
| Ranking | Sortable ranking table (compatibility, health, LSM, etc.) |
| Radar | Per-relationship radar charts + overlay mode |
| Profil | Aggregate user profile (quant + AI Big Five/MBTI/attachment) |
| Zdrowie | Per-relationship health dashboard with score rings |
| Trendy | Multi-series temporal trend overlays (6 trend types) |

Auto-detects common user, batch-loads analyses, graceful AI fallbacks.

---

## Share Cards (30+ Types)

Exportable PNG cards for social media:

`StatsCard` `PersonalityCard` `PersonalityPassportCard` `ReceiptCard` `VersusCard` `CompatibilityCard` `RedFlagCard` `GhostForecastCard` `HealthScoreCard` `MBTICard` `BadgesCard` `FlagsCard` `LabelCard` `ScoresCard` `SubtextCard` `MugshotCard` `DatingProfileCard` `DelusionCard` `SimulatorCard` `NekrologCard` `AktZgonuCard` `ParagonCzasuCard` `AutopsyCard` `ForecastCard` `DecayPhasesCard` `TombstoneCard` `GoldenAgeCard` `UnsaidCard` `DeathCertificateCard` `DeathLineCard`

---

## Story Mode (Wrapped)

12-scene animated presentation in Spotify Wrapped style. Auto-play and manual navigation powered by Framer Motion.

---

## Discord Bot (15 Commands)

HTTP-based interactions bot (Ed25519 verification, in-memory LRU cache).

| Command | Description | Type |
|---|---|---|
| `/stats` | Channel statistics | Instant |
| `/versus` | Compare 2 users | Instant |
| `/whosimps` | Simp ranking | Instant |
| `/ghostcheck` | Ghost risk check | Instant |
| `/besttime` | Best time to text | Instant |
| `/catchphrase` | User catchphrases | Instant |
| `/emoji` | Top emoji analysis | Instant |
| `/nightowl` | Night owl ranking | Instant |
| `/ranking` | Server ranking by metric | Instant |
| `/roast` | AI roast of entire channel | AI |
| `/megaroast` | AI mega roast of one person | AI |
| `/personality` | AI personality profile (MBTI + Big Five) | AI |
| `/przegryw` | Przegryw Tygodnia — AI picks the biggest loser | AI |
| `/search` | Search channel messages by keyword | Search |
| `/analyze` | Open full web analysis | Link |

AI commands use **Drama Keyword Search** — searching full channel history for the most dramatic moments.

---

## Server View (5+ Participants)

Group mode activates automatically for chats with 5+ participants:
- **Person Navigator** — browse individual profiles (20-color palette)
- **Server Leaderboard** — participant rankings
- **Pairwise Comparison** — 1v1 comparison of any pair
- **Server Overview** — group statistics dashboard

---

## Scientific Foundation

All quantitative metrics have been audited against published research:

| Metric | Key Reference |
|---|---|
| MTLD | McCarthy & Jarvis (2010) *Behavior Research Methods* |
| LSM | Ireland & Pennebaker (2010) *JPSP* |
| Pronoun Analysis | Karan, Rosenthal & Robbins (2019) — meta-analysis, 30 studies |
| Sentiment (AFINN-165) | Nielsen (2011) *arXiv:1103.2903* |
| Behavioral Chronotype | Roy et al. (2021) *Scientific Reports* |
| Bid-Response | Driver & Gottman (2004) *Family Process* |
| Conversational Repair | Schegloff, Jefferson & Sacks (1977) *Language* |
| Pursuit-Withdrawal | Christensen & Heavey (1990) *JPSP* |
| Investment Asymmetry | Stanley et al. (2017) *PMC* |
| Capitalization (ACR) | Gable et al. (2004) |
| Moral Foundations | Haidt & Graham (2007), Rathje et al. (2024) *PNAS* |

Two fabricated citations (Jarmolowicz 2022, Alikhan 2023) were identified and replaced with real sources (Randler 2017, Vetter 2015) during the methodological audit. Vanderbilt et al. (2025) was verified as a real publication (DOI: 10.1177/0261927X251344949).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router), React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| AI | Gemini 3 Flash Preview |
| Development AI | Claude Opus 4.6 |
| Streaming | Server-Sent Events (SSE) |
| 3D | Spline |
| Animations | Framer Motion, CSS keyframes, Canvas2D particles |
| Charts | Recharts, custom SVG/Canvas |
| Export | jsPDF, html-to-image |
| Storage | IndexedDB, localStorage |
| Bot | Discord HTTP Interactions (Ed25519) |
| Auth (prepared) | Supabase Auth |
| Deployment | Google Cloud Run (Docker) |
| Package Manager | pnpm |

---

## Try It Now

**[podtekst.app](https://podtekst.app)** — upload your chat export and see the magic.

No registration needed. Your messages stay on your device.

---

<p align="center">
  <b>PodTeksT</b> — odkryj to, co kryje sie miedzy wierszami
  <br/>
  <sub>Built with Claude Opus 4.6 + Human collaboration</sub>
</p>
