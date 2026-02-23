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

## ✨ What is PodTeksT?

PodTeksT is a web app that analyzes chat exports from popular messaging platforms. It computes **80+ quantitative metrics** entirely client-side (your raw messages never leave your device) and runs a **multi-pass AI psychological analysis** server-side using the Gemini API.

### 🔒 Privacy First
- **Raw messages processed client-side** — never sent to any server
- Only 200–500 sampled messages sent to Gemini per AI pass
- All data stored locally (IndexedDB / localStorage)
- GDPR-friendly — delete your data anytime
- Rate limiting + CSP headers on all endpoints

---

## 📱 Supported Platforms

| Platform | Format | Import Method |
|---|---|---|
| Facebook Messenger | JSON export | File upload |
| WhatsApp | TXT export | File upload |
| Instagram DM | JSON export | File upload |
| Telegram | JSON export | File upload |
| Discord | API | Bot integration |

---

## 📊 Quantitative Analysis (80+ Metrics)

All computed **client-side** in a single O(n) pass — no AI involved.

<details>
<summary><b>📈 Per-Person Stats</b></summary>

- Total messages, words, avg words/message
- Longest & shortest messages
- Questions asked & question ratio
- Media count (photos, video, GIF, stickers, audio, files)
- Reactions sent & received
- Deleted & edited messages
- Active days, first/last message date
- Top 10 emoji, top 20 words, top 10 phrases (2–4 word n-grams)
</details>

<details>
<summary><b>⏱️ Timing & Response Times</b></summary>

- Median, average, fastest, slowest response time
- Conversation initiations & initiation ratio
- Longest silence (duration, who broke it)
- Double-text rate & count
- Response time distribution (8 bins: <10s → >1h)
</details>

<details>
<summary><b>🔥 Engagement & Activity</b></summary>

- Engagement score (weighted composite, 0–100)
- Consistency score, message ratio
- Double texts, max consecutive messages
- Session count (6h gap threshold)
- Late night ratio (0:00–5:00), weekend ratio
- **Heatmap:** 7×24 activity matrix (day × hour)
- **24h Activity Chart:** stacked per person
- **Monthly Trends:** volume, response time, message length, initiations, sentiment
</details>

<details>
<summary><b>💔 Relationship Dynamics</b></summary>

- **Sentiment Analysis** — positive/negative/neutral ratios, volatility, dominant tone
- **Conflict Detection** — severity, participants, trigger words
- **Intimacy Progression** — monthly score (casual → deepening → intimate)
- **Pursuit-Withdrawal** — cycle detection (pursuer, withdrawer, escalation trend)
- **Reciprocity Index** — composite 0–1 (messages, words, initiations, response times)
- **Burst Detection** — 10+ messages in 5 minutes
</details>

<details>
<summary><b>🏆 Viral Scores</b></summary>

| Score | What it measures | Range |
|---|---|---|
| Compatibility | Reciprocity, balance, response consistency, shared activity | 0–100 |
| Interest | Initiation rate, response speed, message length ratio, questions | 0–100 |
| Ghost Risk | Response time trend, silence frequency, message gap growth | 0–100 |
| Delusion | |self-perception − actual behavior| across 5+ metrics | 0–100 |
</details>

<details>
<summary><b>⚠️ Threat Meters & Damage Report</b></summary>

**4 Threat Meters (0–100):** Ghost Risk, Codependency, Manipulation, Trust

**Damage Report:**
- Emotional Damage (0–100%)
- Communication Grade (A–F)
- Repair Potential (0–100%)
- Therapy Needed (YES / RECOMMENDED / NO)

**Gottman's Four Horsemen:** Criticism, Contempt, Defensiveness, Stonewalling — mapped from communication patterns with severity levels.
</details>

<details>
<summary><b>🎖️ 15 Badges</b></summary>

🦉 Night Owl · 💬 Chatterbox · 📱📱 Double Texter · 👑 Emoji King/Queen · 👻 Ghost Buster · 📝 Essay Writer · ❓ Question Master · ⚡ Speed Demon · 🎯 Conversation Starter · 📸 Media Lover · 🎉 Weekend Warrior · 🐦 Early Bird · 📖 Storyteller · ❤️ Reactor · 🏃 Marathon Chatter
</details>

---

## 🤖 AI Analysis (Gemini API)

Multi-pass psychological analysis using `gemini-3-flash-preview`:

| Pass | Name | What it generates |
|---|---|---|
| **1** | Relationship Overview | Tone, communication style, relationship type, dominant themes |
| **2** | Relationship Dynamics | Power balance, conflict patterns, intimacy, red/green flags, turning points |
| **3** | Individual Profiles | Big Five, MBTI, attachment style, love languages, communication meters, tone radar |
| **4** | Final Synthesis | Health Score (0–100), sub-scores, recommendations, AI predictions |

---

## 🎭 Interactive AI Modules

| Module | Description |
|---|---|
| 🔥 **Enhanced Roast** | Psychological roast with full Pass 1–4 context |
| 🎤 **Stand-Up Comedy** | 7-act comedy show about your chat (PDF export) |
| 🔬 **CPS Screener** | 63-question Communication Pattern Screening (10 patterns) |
| 🔍 **Subtext Decoder** | Decodes hidden meanings — deflection, manipulation, love signals |
| ⚖️ **Court Trial** | AI courtroom trial with charges, prosecution, defense, and verdict |
| 💘 **Dating Profile** | Honest dating profile based on texting behavior |
| 💬 **Reply Simulator** | Type a message, get a response in your partner's voice |
| 🤡 **Delusion Quiz** | Self-awareness test — perception vs reality (Delusion Index 0–100) |
| 💑 **Couple's Quiz** | Test how well you know your partner |

---

## 🃏 Share Cards (24+ Types)

Exportable PNG cards for social media sharing:

`StatsCard` · `PersonalityCard` · `PersonalityPassportCard` · `ReceiptCard` · `VersusCard` · `CompatibilityCard` · `RedFlagCard` · `GhostForecastCard` · `HealthScoreCard` · `MBTICard` · `BadgesCard` · `FlagsCard` · `LabelCard` · `ScoresCard` · `SubtextCard` · `MugshotCard` · `DatingProfileCard` · `DelusionCard` · `SimulatorCard` · `CoupleQuizCard` · `CPSCard`

---

## 🎬 Story Mode (Wrapped)

12-scene animated presentation in Spotify Wrapped style:

Intro → Key Numbers → Personalities → MBTI Compare → Versus Stats → Red Flags Parade → Roast Highlight → Court Verdict → Interactive Recap → Stand-Up Fragment → Heatmap Visual → Wrapped Summary

Powered by **Framer Motion** with auto-play and manual navigation.

---

## 🤖 Discord Bot (15 Commands)

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
| `/cwel` | Cwel Tygodnia — AI picks the biggest loser | AI |
| `/search` | Search channel messages by keyword | Search |
| `/analyze` | Open full web analysis | Link |

AI commands use **Drama Keyword Search** — searching full channel history for the most dramatic moments to feed the AI alongside recent messages.

---

## 👥 Server View (5+ Participants)

Group mode activates automatically for chats with 5+ participants:
- **Person Navigator** — browse individual profiles (20-color palette)
- **Server Leaderboard** — participant rankings
- **Pairwise Comparison** — 1v1 comparison of any pair
- **Server Overview** — group statistics dashboard

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16+ (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| AI | Gemini 3 Flash Preview |
| Streaming | Server-Sent Events (SSE) |
| 3D | Spline |
| Animations | Framer Motion |
| Charts | Custom SVG / Canvas |
| Export | jsPDF, html-to-image |
| Storage | IndexedDB, localStorage |
| Bot | Discord HTTP Interactions |
| Deployment | Google Cloud Run |

---

## 🚀 Try It Now

👉 **[podtekst.app](https://podtekst.app)** — upload your chat export and see the magic.

No registration needed. Your messages stay on your device.

---

<p align="center">
  <b>PodTeksT</b> — odkryj to, co kryje się między wierszami
  <br/>
  <sub>Built with 🧠 by AI (Claude Opus) + Human collaboration</sub>
</p>
