# PodTeksT — User Flow Map

**Date:** 2026-03-01
**Scope:** Every user path from landing page through analysis completion and sharing

---

## Legend

- 🟢 Happy path (works well)
- 🟡 Friction point (suboptimal UX)
- 🔴 Drop-off risk (users may leave)
- 🔵 AI transparency touchpoint
- ⚠️ Dead end or error path

---

## 1. Happy Path: File Upload → Analysis → Results → Share

```
Landing Page (page.tsx)
│
├── 🔴 CurtainReveal (5s block, dark screen, tiny CTA text)
│   └── Auto-opens after 5s OR click/Enter
│
├── 🟢 LandingHero
│   ├── CTA: "Inicjuj analizę" → /analysis/new
│   └── "Zobacz demo" → #demo section
│
├── 🟡 LandingHowItWorks (export instructions here, but user may skip)
├── 🟢 LandingFeatureShowcase
├── 🟡 LandingSocialProof (no actual social proof — manifesto + cards)
├── 🟡 LandingFAQ (references non-existent pricing plans)
└── 🔴 LandingFooter (no privacy policy, deceptive links)

         ↓ Click "Inicjuj analizę"

Upload Page (/analysis/new)
│
├── Step 1: Choose import mode
│   ├── Tab: "Plik eksportu" (default)
│   │   ├── 🟡 Export instructions collapsed by default (text-xs trigger)
│   │   │   ├── Messenger instructions (with multi-file guidance)
│   │   │   ├── Instagram instructions
│   │   │   ├── Telegram instructions
│   │   │   └── WhatsApp instructions
│   │   │
│   │   ├── 🟢 DropZone (drag-and-drop + click)
│   │   │   ├── 🟢 File validation (format, size, multi-file)
│   │   │   ├── 🟡 Partial skip uses ERROR styling for a WARNING
│   │   │   ├── 🟢 Privacy notice: "przetwarzane lokalnie"
│   │   │   └── ⚠️ English aria-labels (a11y issue, not user-facing)
│   │   │
│   │   └── 🟢 File list with remove buttons
│   │
│   └── Tab: "Discord Bot"
│       ├── 🟢 PIN verification → Server/Channel selection
│       ├── 🟡 No progress bar during fetch (only counter)
│       └── 🟡 Privacy model different from file upload (server-side)
│
├── Step 2: Configuration
│   ├── 🟢 Relationship type selector (6 options, optional)
│   └── 🟡 Step indicator only in file mode, not Discord
│
├── Step 3: Analysis
│   ├── 🟢 ProcessingState (parsing → analyzing → saving)
│   ├── 🟡 No progress during quantitative computation
│   ├── 🔴 English error message if < 100 messages
│   └── 🔴 English fallback error message
│
└── ✅ Success → router.push(/analysis/{id})
    └── sessionStorage flag triggers confetti

         ↓ Redirect

Results Hub (/analysis/{id})
│
├── 🟡 Delusion Quiz gate (2-person only)
│   ├── Skip button delayed 1.5 seconds
│   └── Or: Complete quiz → results
│
├── 🟢 Confetti celebration (first visit)
│
├── 🟢 KPI Strip (5 metrics)
│   ├── Messages count (always available)
│   ├── Response time (always available)
│   ├── 🟡 Compatibility score ("--" if no AI yet)
│   ├── 🟡 Health Score ("--" if no AI yet, English label)
│   └── Badges count (always available)
│
├── 🟢 Progress bar (modes completion)
│
├── 🔵 "Uruchom Analizę AI" CTA (if AI not run)
│   └── Clear indicator that AI is separate step
│
├── Portal Cards (16 modes in 3 categories)
│   ├── Analiza: AI Deep Dive*, Metrics, CPS*, Moral*, Emotions*, ACR*
│   ├── Rozrywka: Roast*, Court*, Stand-Up*, Subtext*, Dating*, Simulator*, Delusion
│   └── Narzędzia: Argument, Export
│   (* = requires AI analysis)
│
└── Quick Actions
    ├── 🟡 "Story Mode" (English label)
    └── 🟡 "Wrapped" (English label)

         ↓ Click portal card

Mode Page (e.g., /analysis/{id}/ai)
│
├── 🟢 ModePageShell (consistent wrapper)
│   ├── 🟡 "Command Center" back button (English)
│   ├── 🟢 Mode-themed accent colors
│   └── 🟢 Video background (desktop) / CSS fallback (mobile)
│
├── 🟢 ModeSwitcherPill (floating bottom nav)
│   ├── 🟢 Horizontal scroll with 16 mode icons
│   ├── 🟡 Icons only on mobile (some labels unclear: ACR)
│   ├── 🟢 Completion dots for finished modes
│   └── 🟢 Fullscreen toggle
│
├── Mode Content
│   ├── AI modes: Show loading → SSE streaming → results
│   │   ├── 🔵 No AI vs algorithmic label
│   │   ├── 🔵 No confidence indicators
│   │   ├── 🔵 No "why this?" explanation
│   │   └── 🟢 PsychDisclaimer (but too small)
│   │
│   └── Quantitative modes: Show data immediately
│       ├── 🟢 Charts, metrics, cards
│       └── 🔵 No "calculated from your data" label
│
└── Navigation options
    ├── Back: "Command Center" (English) → /analysis/{id}
    ├── Lateral: ModeSwitcherPill between modes
    └── Fullscreen: Toggle via pill button

         ↓ Navigate to Export mode

Export/Share (/analysis/{id}/share)
│
├── 🟢 ShareCardGallery (20+ card types)
│   ├── 🟡 No preview before download
│   ├── 🟡 Card size info hidden on mobile
│   ├── 🟡 No format choice (always PNG)
│   └── 🔴 Cards contain real names (privacy risk)
│
├── 🟢 ExportPDFButton (full analysis PDF)
│   ├── 🟢 Progress feedback during generation
│   └── 🟡 Silent failure on error
│
├── 🟢 ShareCaptionModal (social media captions)
│   └── 🟡 Templates mostly in English
│
└── 🟢 Web Share API + fallback download
```

---

## 2. Error Paths & Recovery

### Invalid File Format
```
DropZone → Invalid file detected
├── 🟢 Polish error message with format instructions
├── 🟢 File list shows valid files (if any)
└── 🟡 Partial skip uses red ERROR styling for a WARNING
    └── User may think upload failed when it partially succeeded
```

### Conversation Too Small (<100 messages)
```
Upload page → File parsed → Message count check
├── 🔴 Error message in ENGLISH
├── 🟢 User can upload a different file
└── No guidance on how to get a longer conversation
```

### File Too Large (>500MB)
```
DropZone → Size check before upload
├── 🟢 Specific filename shown in error
├── 🟢 Size limit stated (500MB)
└── 🟡 200MB warning for moderate files (non-blocking)
```

### Gemini API Failure
```
AIAnalysisButton → SSE stream → Error
├── 🟢 Error displayed with retry button
├── 🟡 Raw technical error shown (not user-friendly Polish)
├── 🟢 Already-computed quantitative data preserved
└── 🟡 No graceful degradation (show quant results while AI fails)
```

### Network Loss During Analysis
```
AIAnalysisButton → SSE connection drops
├── 🟢 AbortController support
├── ⚠️ No resume capability
├── ⚠️ Partial AI results lost
└── User must restart entire analysis
```

### Close Tab During Analysis
```
Analysis in progress → User closes tab
├── ⚠️ No beforeunload warning
├── ⚠️ No resume from partial state
├── 🟢 Quantitative data in IndexedDB (if saved before close)
└── AI analysis must restart from scratch
```

### Corrupted IndexedDB
```
Dashboard page → listAnalyses() call
├── ⚠️ No error handling
├── ⚠️ Page stays in loading state indefinitely
└── No guidance to clear data or try different browser
```

### Browser Out of Memory
```
Large file parsing → Memory pressure
├── ⚠️ No pre-upload memory check
├── ⚠️ No progressive parsing for large files
└── Browser crashes with no recovery
```

---

## 3. Edge Cases

### Chat with 10 Messages
```
Upload → Parse → Message count check
├── 🔴 English error: "minimum of 100 messages required"
└── No suggestion to use a longer conversation or what 100 messages means in practice
```

### Chat with 500,000+ Messages
```
Upload → Parse → Quantitative analysis
├── 🟡 No progress during computation (could take 10+ seconds)
├── 🟡 No memory warning
├── 🟢 O(n) single-pass computation is efficient
└── AI sampling selects 200-500 messages (constant cost)
```

### Group Chat (>2 participants)
```
Upload → Parse → Results hub
├── 🟢 Server View layout for 5+ participants
├── 🟢 Hides irrelevant features (Viral Scores, Ghost Forecast, Delusion Quiz)
├── 🟢 Participant navigator, profiles, leaderboard
└── 🟡 Delusion Quiz gate still shown for 2-person groups (unnecessary)
```

### Second Upload While First Analyzes
```
Not tested — but likely:
├── New tab → /analysis/new works independently
├── Same tab → Navigate away → lose AI progress
└── ⚠️ No warning about losing in-progress analysis
```

### Navigate Away and Return
```
Results page → Navigate to dashboard → Return to results
├── 🟢 Data persists in IndexedDB
├── 🟢 All quantitative data preserved
├── 🟢 AI results preserved if completed
└── 🟢 Session confetti flag prevents duplicate celebration
```

---

## 4. AI Transparency Touchpoints

| Flow Point | What Happens | What Should Happen |
|------------|-------------|-------------------|
| Upload page | Privacy notice mentions local processing | Should also mention "~2% sent to AI in next step" |
| "Uruchom Analizę AI" button | Consent panel mentions Gemini + ~2% | Good — but no data flow diagram |
| AI analysis progress | Generic step labels | Should show what data is being sent per pass |
| AI results cards | Same styling as quantitative | Need distinct "AI-generated" badge |
| Quantitative cards | Same styling as AI | Need "Calculated from your data" label |
| ThreatMeters, DamageReport | Scores shown without methodology | Need "How is this calculated?" expandable |
| AIPredictions | Confidence arcs + basis tags | Good start — expand with source messages |
| PsychDisclaimer | 11px at 60% opacity | Must be readable — increase to 12px at 80% |
| Share cards | No AI/quant distinction | Add "AI-generated" watermark on AI-based cards |
| PDF export | No AI/quant distinction | Separate sections clearly in PDF |

---

## 5. Drop-off Analysis

| Point | Severity | Reason | Estimated Impact |
|-------|----------|--------|-----------------|
| CurtainReveal (5s block) | 🔴 CRITICAL | User thinks page is broken | 15-25% bounce |
| Export instructions hidden | 🔴 HIGH | User doesn't know how to export | 30-50% drop for new users |
| English error (<100 msg) | 🔴 HIGH | Confusion in Polish app | 10% of affected users |
| No progress during analysis | 🟡 MEDIUM | User thinks app is frozen | 5-10% abandonment |
| Quiz gate blocking results | 🟡 MEDIUM | Frustration after waiting | 5-8% early exit |
| 16 modes at once (no guide) | 🟡 MEDIUM | Overwhelm, no clear path | 10-15% reduced engagement |
| English labels everywhere | 🟡 MEDIUM | Breaks immersion for PL users | Reduced trust |
| No actual social proof | 🟡 MEDIUM | No trust signals | 5-10% lower conversion |
| No privacy policy | 🔴 HIGH | GDPR-aware users won't use | 5-10% bounce |
| Share cards with real names | 🟡 MEDIUM | Privacy concerns when noticed | Reduced sharing |
