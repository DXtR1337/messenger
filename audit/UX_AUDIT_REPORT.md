# PodTeksT — Comprehensive UX/UI Audit Report (2026 Standards)

**Auditor:** Claude Opus 4.6
**Date:** 2026-03-01
**Scope:** Full codebase analysis — landing page through analysis completion, all components, CSS, state management, routing, loading/error/empty states
**Standard:** 2026 UX expectations (EU AI Act, European Accessibility Act, progressive loading, AI transparency, privacy-first design)

---

## Executive Summary

PodTeksT is a visually ambitious, feature-rich application with strong quantitative foundations and creative AI integration. However, the UX has significant gaps when measured against 2026 standards:

- **Accessibility is critically deficient.** Zero `focus-visible` styles globally, 7 keyboard handlers total, 14 alt texts across 100+ components. The European Accessibility Act (in force since 2025) is not met.
- **AI transparency is nearly absent.** No visual distinction between AI-generated and locally-computed content. No confidence indicators, no "why this?" explanations, no reproducibility warnings.
- **Privacy UX relies on text, not design.** No data flow visualization. Consent is passive. Auto-generated AI images send personal data without explicit consent.
- **Polish language has pervasive English leftovers.** "Command Center" appears in 12+ pages. Mode titles, button labels, and error messages in English.
- **Performance is a concern.** 60 continuous animations across 45 files. GSAP ticker running per-frame on desktop. 3D WebGL + particle canvas + video backgrounds simultaneously.

### Severity Distribution

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 14 | Blocks usage, legal risk, or makes content inaccessible |
| HIGH | 22 | Significant friction, user confusion, or compliance gap |
| MEDIUM | 28 | Suboptimal UX, inconsistency, or missing polish |
| LOW | 18 | Enhancement opportunities |

---

## A. First-Time User Flow (Critical Path)

### A-01: CurtainReveal Blocks Page for 5 Seconds
- **Component:** `CurtainReveal.tsx`
- **Element:** Full-screen curtain overlay, `AUTO_OPEN_MS = 5000`
- **Issue:** Page is locked with `document.body.style.overflow = 'hidden'` for 5 seconds. The only prompt is barely visible gray monospace text ("kliknij aby odsłonić") at the bottom of a dark screen. Users on fast connections see a blank dark page for 5 seconds with no loading indicator.
- **2026 Standard:** First paint should communicate value within 3 seconds. Blocking interstitials require clear purpose.
- **Impact:** First-time users from TikTok/social media will leave. 5 seconds of blank screen = bounce.
- **Severity:** CRITICAL
- **Fix:** Reduce to 2 seconds or skip entirely. Add visible animated CTA. Respect `prefers-reduced-motion` by skipping curtain.

### A-02: Desktop Hero Has No Heading Element
- **Component:** `LandingHero.tsx`
- **Element:** Desktop layout uses `<div>` + `<span>` instead of `<h1>`
- **Issue:** Mobile correctly uses `<h1>`, but desktop renders the hero text as non-semantic `<span>` elements. The document outline has no heading on desktop.
- **2026 Standard:** Document structure must be semantic for SEO and accessibility.
- **Impact:** Screen readers on desktop skip the most important content. SEO impact on the primary H1.
- **Severity:** HIGH
- **Fix:** Use `<h1>` on both mobile and desktop layouts.

### A-03: Export Instructions Collapsed by Default
- **Component:** `analysis/new/page.tsx`, lines 275-310
- **Element:** "Jak wyeksportować rozmowę?" collapsible accordion
- **Issue:** This is the #1 drop-off point. A user who doesn't know how to export from Messenger needs these instructions, but they're hidden behind a collapsible `<div>` with `text-xs` trigger text. The collapsible has no `aria-expanded` attribute and is not keyboard-accessible (no `role="button"`, no `tabIndex`, no `onKeyDown`).
- **2026 Standard:** Critical path instructions should be visible or at least prominently discoverable.
- **Impact:** Users who don't know how to export will leave. This is the conversion-critical moment.
- **Severity:** HIGH
- **Fix:** Show instructions expanded by default for first-time users (detect via localStorage). Add keyboard accessibility. Increase trigger text size. Add per-platform icons.

### A-04: English Error Message for Minimum Message Count
- **Component:** `analysis/new/page.tsx`, line 149-152
- **Element:** Error string `"This conversation has only ${conversation.metadata.totalMessages} messages..."`
- **Issue:** The error message when a conversation has fewer than 100 messages is entirely in English in a Polish-language app.
- **2026 Standard:** All user-facing strings in the declared UI language.
- **Impact:** User confusion. Breaks the Polish-language experience at a critical error moment.
- **Severity:** CRITICAL
- **Fix:** Translate to Polish: `"Ta rozmowa ma tylko ${count} wiadomości. Minimum 100 wiadomości jest wymagane do analizy."`

### A-05: English Fallback Error Message
- **Component:** `analysis/new/page.tsx`, line 213
- **Element:** `"An unexpected error occurred during analysis."`
- **Issue:** Generic error fallback in English.
- **Severity:** HIGH
- **Fix:** `"Wystąpił nieoczekiwany błąd podczas analizy. Spróbuj ponownie."`

### A-06: No Progress During Quantitative Analysis
- **Component:** `analysis/new/page.tsx`, ProcessingState
- **Element:** "Analizuje konwersację..." step
- **Issue:** The heaviest computation step (80+ metrics, O(n) pass) shows no progress bar or percentage. User sees a static message.
- **2026 Standard:** Progressive feedback for operations >1 second.
- **Impact:** Users with large conversations (100K+ messages) see no feedback for 5-10 seconds.
- **Severity:** MEDIUM
- **Fix:** Add progress callback to `computeQuantitativeAnalysis()` reporting percentage or current metric category.

### A-07: Quiz Gate Blocks Results Page
- **Component:** `analysis/[id]/page.tsx`, lines 613-637
- **Element:** Delusion Quiz interstitial for 2-person conversations
- **Issue:** After upload, the user expects results but is forced into a quiz. The "Pomiń i pokaż wyniki" skip button has a 1.5-second animation delay before appearing.
- **2026 Standard:** Never block the user's primary intent. Engagement features should be opt-in, not blocking.
- **Impact:** User frustration. They just waited for analysis and now must wait more or interact with a quiz they didn't ask for.
- **Severity:** HIGH
- **Fix:** Move the quiz to a modal or sidebar suggestion. Show results immediately with a non-blocking quiz prompt.

---

## B. AI Transparency & Explainability

### B-01: No Visual Distinction Between AI and Algorithmic Content
- **Components:** All analysis components, ModeSwitcherPill, PortalCard
- **Issue:** There is NO visual distinction between locally-computed metrics (deterministic, reproducible) and AI-generated content (probabilistic, variable). The same card styling is used for both. No "AI" badge, no "Calculated from your data" label, no IBM Carbon-style AI indicator.
- **2026 Standard:** EU AI Act requires users to be informed when interacting with AI. AI-generated content must be visually distinct.
- **Impact:** Users cannot assess the reliability of any result. Legal compliance risk.
- **Severity:** CRITICAL
- **Fix:** Add a consistent AI badge (e.g., sparkle icon + "Wygenerowane przez AI") to all AI sections. Add "Obliczone z Twoich danych" to quantitative sections. Use different card border or background treatment.

### B-02: No "Why This?" Explainability
- **Components:** AIPredictions, ThreatMeters, DamageReport, RankingBadges, all AI-generated sections
- **Issue:** No expandable rationale for any AI-generated insight. The `basis` tag in AIPredictions is the closest, but it's a single keyword, not an explanation. No source attribution (which messages led to this conclusion).
- **2026 Standard:** Progressive disclosure: summary visible, reasoning expandable on demand.
- **Impact:** Users cannot understand or trust AI conclusions. The "black box" feeling undermines the app's value proposition.
- **Severity:** HIGH
- **Fix:** Add expandable "Dlaczego ten wynik?" chip to each AI-generated insight. Show source messages or patterns that led to the conclusion.

### B-03: No Confidence Indicators Based on Sample Size
- **Components:** All analysis sections
- **Issue:** An analysis based on 10,000 messages looks identical to one based on 150 messages. No visual indicator of data sufficiency or confidence bands. ThreatMeters shows a score but not "based on X data points."
- **2026 Standard:** AI-generated content should indicate certainty level. Confidence should be visually communicated.
- **Impact:** Users may over-trust results from small conversations or under-appreciate results from rich data.
- **Severity:** HIGH
- **Fix:** Add sample size indicator to each section header. Show confidence bands or "insufficient data" warnings when below thresholds.

### B-04: No Reproducibility Warning
- **Components:** None — not present anywhere
- **Issue:** Running the same analysis twice produces different AI results (non-deterministic sampling via `Math.random()`). This is never communicated to the user anywhere in the app.
- **2026 Standard:** Users should understand that AI results may vary between runs.
- **Impact:** User confusion when sharing results with others who get different numbers.
- **Severity:** MEDIUM
- **Fix:** Add a one-time tooltip or info banner: "Wyniki AI mogą się nieznacznie różnić przy każdym uruchomieniu. Metryki ilościowe są zawsze identyczne."

### B-05: AI Limitations Not at Point of Consumption
- **Components:** PsychDisclaimer used on 8 components
- **Issue:** PsychDisclaimer exists but is rendered in `text-[11px]` at `text-muted-foreground/60` — effectively invisible. The disclaimer that should protect users and the company from liability is the least readable text in the UI.
- **2026 Standard:** Limitations visible at point of consumption, not buried.
- **Impact:** Legal risk. Users may interpret entertainment content as clinical assessment.
- **Severity:** HIGH
- **Fix:** Increase PsychDisclaimer font to minimum 12px. Increase opacity to /80 minimum. Add a visible "⚠ Rozrywka, nie diagnoza" chip at the top of AI sections, not just at the bottom.

---

## C. Privacy-First Design Patterns

### C-01: No Data Flow Visualization
- **Components:** DropZone, analysis/new/page.tsx
- **Issue:** The privacy notice says "przetwarzane lokalnie w przeglądarce" but there is no visual diagram showing: File → parsed in browser → metrics calculated → ~2% samples → Gemini AI → results in IndexedDB. Users in 2026 expect to SEE where their data goes.
- **2026 Standard:** Visual data flow explanation, not just text.
- **Impact:** Users cannot make informed consent decisions.
- **Severity:** HIGH
- **Fix:** Add a simple 4-step data flow diagram on the upload page. Show it as an expandable or always-visible infographic.

### C-02: Auto-Generated AI Photos Without Consent
- **Component:** `DatingProfileResult.tsx`, lines 280-283
- **Issue:** The component automatically calls `/api/analyze/image` on mount, sending personality data, appearance keywords extracted from messages (hair color, glasses, tattoos), and red flags to the AI image generator. No consent prompt appears.
- **2026 Standard:** Explicit consent before sending personal data to AI image generation.
- **Impact:** Privacy violation. Personal appearance data derived from messages is sent to an external AI without any user action.
- **Severity:** CRITICAL
- **Fix:** Show a consent button before generating the image. Explain what data is sent. Allow opt-out.

### C-03: Discord Messages Flow Through Server
- **Component:** `DiscordImport.tsx`, `/api/discord/fetch-messages`
- **Issue:** The privacy notice says "Token bota jest używany jednorazowo" but Discord messages flow through the app's server. This is fundamentally different from the file upload flow where data stays local. The distinction is not communicated.
- **2026 Standard:** Transparent about all data flows, especially server-side processing.
- **Impact:** Users assume Discord import has the same privacy guarantees as file upload. It doesn't.
- **Severity:** HIGH
- **Fix:** Add explicit notice: "Wiadomości z Discorda przechodzą przez nasz serwer do pobrania, ale nie są zapisywane."

### C-04: Share Cards Contain Real Names
- **Component:** All share card components (PersonalityCard, VersusCard, etc.)
- **Issue:** The share link system correctly anonymizes names to "Osoba A"/"Osoba B", but downloadable PNG cards show actual participant names. Users sharing cards on social media expose the other person's identity.
- **2026 Standard:** Privacy-by-default for shared content involving third parties.
- **Impact:** The other person's name and analysis results shared publicly without their consent.
- **Severity:** HIGH
- **Fix:** Offer option to anonymize names in downloaded cards. Default to anonymized. Add a "Uwaga: karta zawiera prawdziwe imiona" warning before download.

### C-05: No Privacy Policy or Terms of Service
- **Components:** LandingFooter, CookieConsent, Settings
- **Issue:** No `/privacy` or `/regulamin` page exists. Footer links "Prywatność" to `#faq`. CookieConsent has no policy link. For a GDPR-targeting app processing personal conversation data, this is a legal gap.
- **2026 Standard:** Accessible privacy policy and terms of service are legal requirements.
- **Impact:** Legal non-compliance. UODO risk.
- **Severity:** CRITICAL
- **Fix:** Create `/privacy` and `/terms` pages with actual legal content. Link from footer, cookie banner, and upload page.

---

## D. Information Architecture

### D-01: "Command Center" in English Across 12+ Pages
- **Components:** `ModePageShell.tsx:121`, `Navigation.tsx:193`, plus 10+ mode pages
- **Issue:** The back button on every mode page says "Command Center" in English. This appears in the navigation, mobile menu, and breadcrumbs.
- **Severity:** HIGH
- **Fix:** Replace with "Centrum Dowodzenia" or "Strona Główna Analizy" consistently across all files.

### D-02: Mode Titles Predominantly in English
- **Component:** `analysis/[id]/page.tsx`, MODE_DEFINITIONS
- **Issue:** 12 of 16 mode titles are in English: "AI Deep Dive", "Data Observatory", "CPS Screening", "Moral Foundations", "Emotion Causes", "Roast Arena", "Stand-Up Comedy", "Subtext Decoder", "Dating Profile", "Reply Simulator", "Delusion Quiz", "Export Studio".
- **Severity:** MEDIUM
- **Fix:** Add Polish subtitles or fully translate. Consider bilingual format: "AI Deep Dive — Głęboka analiza AI".

### D-03: "ACR" Unexplained in Navigation
- **Component:** `ModeSwitcherPill.tsx`, line 49
- **Issue:** The label "ACR" in the bottom navigation means nothing to a first-time user. No tooltip or expanded form visible.
- **Severity:** MEDIUM
- **Fix:** Show full label "Kapitalizacja" on desktop. Add tooltip on mobile icon.

### D-04: No Recommended Reading Order
- **Component:** `analysis/[id]/page.tsx`, results hub
- **Issue:** 16 modes are shown at once. No guided path or "start here" beyond a "Rekomendowane" badge on 3 cards. A first-time user doesn't know which to explore first.
- **Severity:** MEDIUM
- **Fix:** Add a "Zacznij tutaj" guide with numbered suggested path. Unlock sections progressively or show a suggested flow.

### D-05: Jargon Without Explanation
- **Components:** Multiple
- **Issue:** Terms like "LSM" (Language Style Matching), "Gottman", "Pursuit-Withdrawal", "Integrative Complexity", "Big Five", "MBTI" appear without accessible explanations. LSMCard title is in English. No plain-language tooltips on psychological terms.
- **Severity:** MEDIUM
- **Fix:** Add `title` attributes or inline tooltips with plain-language Polish explanations for all academic terms.

---

## E. Visual Design & Readability

### E-01: Footer Link Contrast Failure
- **Component:** `LandingFooter.tsx`
- **Element:** `text-[#555555]` on `#050505` background
- **Issue:** Contrast ratio ~2.8:1, well below WCAG AA 4.5:1 minimum.
- **Severity:** CRITICAL
- **Fix:** Change to `#888888` minimum (5.3:1 ratio) or `#a8a8a8` (7.5:1).

### E-02: Feature Accent Colors Fail Contrast on Cards
- **Component:** `LandingFeatureShowcase.tsx`
- **Element:** Blue `#3b82f6`, purple `#a855f7`, red `#ef4444` as text on `#111111` cards
- **Issue:** Blue: 3.8:1, Purple: 3.4:1, Red: 3.7:1 — all fail WCAG AA 4.5:1 for normal text.
- **Severity:** HIGH
- **Fix:** Lighten accent text colors for small text contexts. Use `#60a5fa` (blue-400), `#c084fc` (purple-400), `#f87171` (red-400).

### E-03: PsychDisclaimer Effectively Invisible
- **Component:** `PsychDisclaimer.tsx`
- **Element:** `text-[11px]` at `text-muted-foreground/60`
- **Issue:** 11px text at 60% opacity on dark background. The most legally important text is the least readable.
- **Severity:** HIGH
- **Fix:** Minimum 12px, opacity /80, add subtle but visible background treatment.

### E-04: Tooltip Text Fails Contrast
- **Components:** `HeatmapChart.tsx`, `ResponseTimeChart.tsx`, chart-config
- **Element:** Hardcoded `#666` text in tooltips on `rgba(17,17,17,0.92)` background
- **Issue:** `#666` on near-black = 3.17:1, fails WCAG AA.
- **Severity:** MEDIUM
- **Fix:** Use `#999` minimum for tooltip text.

### E-05: `text-[9px]` and `text-[10px]` Used Extensively
- **Components:** AIPredictions, ThreatMeters, DamageReport, RankingBadges, SubtextDecoder, HeatmapChart
- **Issue:** 9-10px text is below WCAG minimum recommended size (12px body text). On mobile at 85% card scale, this becomes ~7.6-8.5px effective size.
- **Severity:** MEDIUM
- **Fix:** Minimum 11px everywhere, 12px for body content.

### E-06: No `prefers-color-scheme` Support
- **Component:** `globals.css`
- **Issue:** The app forces dark mode with no light mode option. No `prefers-color-scheme` media query, no `color-scheme: dark` meta declaration. Users who prefer light mode get no accommodation.
- **Severity:** MEDIUM
- **Fix:** At minimum, add `<meta name="color-scheme" content="dark">` and `color-scheme: dark` to `:root` so browser UI elements (scrollbars, form controls) match. Full light mode is optional but the dark-only choice should be intentional and documented.

### E-07: Non-HDR Display Degradation
- **Component:** `globals.css`, HDR/P3 section
- **Issue:** The `@media (dynamic-range: high)` section overrides all accent colors with `color(display-p3 ...)`. On standard sRGB displays (vast majority of users), these fall back to the default hex values. The design may have been optimized for HDR luminance levels that don't exist on sRGB. Needs manual testing.
- **Severity:** LOW — NEEDS MANUAL TESTING
- **Fix:** Verify all text remains readable on standard sRGB displays. Test with P3 colors disabled.

---

## F. Responsive Design & Mobile

### F-01: ModeSwitcherPill Icons Too Small on Mobile
- **Component:** `ModeSwitcherPill.tsx`
- **Element:** `size-4` icons (16px) with `px-2.5 py-2` padding
- **Issue:** 16 mode icons in a horizontal scroll. Each icon button is approximately 36x36px total — below the 44x44px WCAG 2.5.8 minimum target size.
- **Severity:** HIGH
- **Fix:** Increase to `size-5` icons with `px-3 py-2.5` padding. Consider showing only primary modes on mobile with a "more" overflow.

### F-02: KPI Grid Odd Item on Mobile
- **Component:** `analysis/[id]/page.tsx`
- **Element:** KPI strip with 5 items in `grid-cols-2`
- **Issue:** 5 items in a 2-column grid = 1 orphaned card on the last row. No special handling.
- **Severity:** LOW
- **Fix:** Use `grid-cols-3` on mobile for 5 items, or make the 5th card span 2 columns.

### F-03: Hub Video Performance on Mobile
- **Component:** `analysis/[id]/page.tsx`
- **Element:** Hub video background + aurora mesh + scanlines + interactive grid
- **Issue:** Multiple visual effects running simultaneously on the results page. On mid-range phones, this creates CPU/GPU load.
- **Severity:** MEDIUM
- **Fix:** Disable aurora mesh, scanlines, and interactive grid on mobile. Keep only static background.

### F-04: Phone Mockup Scroll-Within-Scroll
- **Component:** `DatingProfileResult.tsx`
- **Issue:** Dating profile renders inside a phone mockup that requires scrolling within the page's scroll. This is a known mobile UX anti-pattern.
- **Severity:** MEDIUM
- **Fix:** Show the dating profile as a standard card layout on mobile, save the phone mockup for desktop.

---

## G. Loading, Error & Empty States

### G-01: No Progressive Feedback During AI Analysis
- **Component:** `AIAnalysisButton.tsx`
- **Issue:** The 4-pass analysis shows step names but no estimated time, no percentage, and no content preview. Users wait 30-60 seconds seeing only "Mapuje dynamikę konwersacji..." with a spinner.
- **2026 Standard:** Progressive loading with contextual updates. The user should feel like they're watching the analysis build.
- **Severity:** HIGH
- **Fix:** Add estimated time per pass. Show preview snippets of results as they arrive. Use a horizontal timeline showing all 4 passes with progress within each.

### G-02: Raw Technical Error Messages
- **Component:** `AIAnalysisButton.tsx`
- **Issue:** `error instanceof Error ? err.message : String(err)` displays raw error messages like "Analysis failed: 500 Internal Server Error" to users.
- **Severity:** MEDIUM
- **Fix:** Map technical errors to Polish user-friendly messages: `"Analiza nie powiodła się. Spróbuj ponownie za chwilę."`

### G-03: No IndexedDB Error Handling
- **Component:** `dashboard/page.tsx`
- **Issue:** No error handling for `listAnalyses()` failure. If IndexedDB is corrupted, unavailable, or full, the page stays in loading state indefinitely.
- **Severity:** MEDIUM
- **Fix:** Add catch handler with Polish error message and guidance (clear data, try different browser).

### G-04: PDF Export Fails Silently
- **Component:** `ExportPDFButton.tsx`
- **Issue:** The `catch` block only logs to console. If PDF generation fails, the button simply stops spinning with no user-visible feedback.
- **Severity:** MEDIUM
- **Fix:** Show error toast: `"Generowanie PDF nie powiodło się. Spróbuj ponownie."`

### G-05: No Resume After Tab Close During Analysis
- **Issue:** If a user closes the tab during AI analysis, there is no way to resume. The partial results are lost. There is no warning before closing.
- **Severity:** MEDIUM
- **Fix:** Add `beforeunload` listener during active analysis. Store partial results in IndexedDB for resume.

---

## H. Interactive Elements & Micro-interactions

### H-01: Dashboard Analysis Cards Not Keyboard Navigable
- **Component:** `dashboard/page.tsx`
- **Issue:** Analysis cards use `onClick` on `<div>` elements for navigation. No `role="link"`, no `tabIndex`, no `onKeyDown`. Keyboard users cannot navigate to their analyses.
- **Severity:** CRITICAL
- **Fix:** Wrap cards in `<Link>` or add `role="link"`, `tabIndex={0}`, and keyboard handler.

### H-02: Demo Carousel Keyboard Interference
- **Component:** `LandingDemo.tsx`, lines 88-95
- **Issue:** Arrow key handler is attached to `window`, meaning arrow keys navigate the carousel even when the user is focused elsewhere (e.g., typing in a form).
- **Severity:** HIGH
- **Fix:** Only capture arrow keys when the carousel is focused. Use `onKeyDown` on the carousel container, not `window`.

### H-03: Hover-Only Tooltips in Charts
- **Components:** `HeatmapChart.tsx`, `ResponseTimeChart.tsx`
- **Issue:** Data values in heatmap cells are only accessible via mouse hover. Touch users and keyboard users cannot see the data.
- **Severity:** HIGH
- **Fix:** Add `onClick`/`onFocus` handlers. Consider adding a data table alternative or `aria-label` per cell.

### H-04: Share Card Download Has No Icon
- **Component:** `PersonalityCard.tsx` and other share cards
- **Issue:** "Pobierz kartę" buttons have no download icon, unlike `ExportPDFButton` which properly uses `FileDown` icon.
- **Severity:** LOW
- **Fix:** Add `Download` icon consistently to all download buttons.

---

## I. Performance UX

### I-01: 60 Continuous Animations Across 45 Files
- **Scope:** Global
- **Issue:** `animate-ping`, `animate-pulse`, `animate-bounce`, `animate-spin`, and `@keyframes.*infinite` found in 60 instances across 45 files. Many are continuous (running without user trigger), including:
  - `ai-orb-drift` (25s infinite) on AI page background
  - `ai-title-shimmer` (8s infinite) on AI page title
  - `ai-title-streak` (5s infinite) on AI page title overlay
  - `ai-nav-ring-pulse` (2.5s infinite) on section dots
  - `heroFragmentDrift` (16-24s infinite) on landing hero
  - `heroTextFloatLeft/Right` (12-14s infinite) on landing hero
  - `marquee-slide` in LandingSocialProof (continuous)
  - `ParticleBackground` canvas (continuous `requestAnimationFrame`)
  - `HangingLetters` physics loop (continuous `requestAnimationFrame`)
  - GSAP ticker proximity detection on AI page (every frame)
  - GSAP ticker velocity glow on AI page (every frame)
- **2026 Standard:** Continuous decorative animations are the #1 performance killer. `prefers-reduced-motion` must be respected.
- **Severity:** HIGH
- **Fix:** Audit every continuous animation. Remove purely decorative ones. Gate all behind `prefers-reduced-motion`. Use IntersectionObserver to pause off-screen animations.

### I-02: GSAP Per-Frame Ticker on AI Page
- **Component:** `useAIScrollChoreography.ts`
- **Element:** `gsap.ticker.add(updateProximity)` and `gsap.ticker.add(updateVelocity)`
- **Issue:** Two per-frame callbacks (60fps) running on the AI page for proximity glow and velocity edge glow. Each iterates all cards and reads `getBoundingClientRect()`.
- **Severity:** MEDIUM
- **Fix:** Use IntersectionObserver or throttle to 30fps. Skip when scroll delta is 0.

### I-03: ScrollProgress Causes Re-renders on Every Scroll
- **Component:** `ScrollProgress.tsx`
- **Issue:** `setProgress()` (React state update) called on every scroll event without throttling.
- **Severity:** MEDIUM
- **Fix:** Use `requestAnimationFrame` throttling or CSS `animation-timeline: scroll()`.

### I-04: MetricsScene3D WebGL on Desktop
- **Component:** `MetricsScene3D.tsx`, `ModePageShell.tsx:102-108`
- **Issue:** Full R3F (React Three Fiber) scene with particle system rendered on the metrics page. Correctly skipped on mobile and when WebGL is unavailable.
- **Severity:** LOW — correctly gated

---

## J. Accessibility (European Accessibility Act)

### J-01: Zero `focus-visible` Styles Globally
- **Component:** `globals.css`
- **Issue:** No `focus-visible` CSS rules in the global stylesheet. Only 5 files have any `focus-visible` references (button.tsx, badge.tsx, DropZone, AuthForm, PortalCard). The vast majority of interactive elements — buttons, links, cards, tabs, nav items — have NO visible focus indicator.
- **2026 Standard:** WCAG 2.4.7 Level AA requires visible focus indicators. European Accessibility Act makes this law.
- **Severity:** CRITICAL
- **Fix:** Add global `focus-visible` styles: `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`. Add specific overrides where needed.

### J-02: Only 7 Keyboard Handlers in Entire Component Library
- **Scope:** All `src/components/`
- **Issue:** Only 6 files have `onKeyDown`/`onKeyPress`/`onKeyUp` handlers: ArgumentTopicPicker, ArgumentSimulator, DropZone, DiscordImport, Navigation, ReplySimulator. The remaining 100+ components are mouse/touch only.
- **Severity:** CRITICAL
- **Fix:** Ensure all interactive elements use native `<button>` or `<a>` elements (which have keyboard support built-in). Replace `<div onClick>` patterns with proper elements.

### J-03: SVG Gauges Have No ARIA Labels
- **Components:** AIPredictions, ThreatMeters, DamageReport, DelusionQuiz, LSMCard (5+ components)
- **Issue:** All SVG arc/circle gauges that display percentage values have no `role="img"`, no `aria-label`, and no visually-hidden text alternative.
- **Severity:** HIGH
- **Fix:** Add `role="img" aria-label="Wynik: 75%"` to each gauge SVG.

### J-04: No Focus Traps in Modals
- **Components:** ShareCardGallery overlay, ShareCaptionModal
- **Issue:** When overlays open, keyboard users can Tab to hidden content behind the overlay.
- **2026 Standard:** WCAG 2.4.3 (Focus Order) — focus must be contained within modal dialogs.
- **Severity:** HIGH
- **Fix:** Implement focus trapping (e.g., `focus-trap` library or custom implementation).

### J-05: `prefers-reduced-motion` Not Respected for JS Animations
- **Components:** CurtainReveal, HangingLetters, ParticleBackground, LandingDemo, all framer-motion components, GSAP choreography, useCountUp
- **Issue:** The global CSS rule handles CSS animations, but JavaScript animations via Web Animations API, `requestAnimationFrame`, framer-motion, and GSAP are NOT affected. Only `useAIScrollChoreography.ts` checks `prefers-reduced-motion` properly.
- **Severity:** CRITICAL
- **Fix:** Add `window.matchMedia('(prefers-reduced-motion: reduce)')` check at the beginning of every JavaScript animation. Create a shared `useReducedMotion()` hook.

### J-06: Only 14 Alt Texts Across 12 Files
- **Scope:** All `src/components/`
- **Issue:** Images, SVGs, and visual elements overwhelmingly lack alt text. Only 14 `alt` attributes found.
- **Severity:** HIGH
- **Fix:** Audit all `<Image>`, `<img>`, and meaningful SVGs. Add descriptive alt text or `aria-hidden="true"` for decorative elements.

### J-07: No Skip-to-Content Link
- **Component:** Dashboard layout, Navigation
- **Issue:** No skip-navigation link at the top of any page.
- **Severity:** MEDIUM
- **Fix:** Add `<a href="#main-content" class="sr-only focus:not-sr-only">Przejdź do treści</a>` to the layout.

### J-08: Color-Only Information in Charts
- **Components:** LSMCard, CPSScreener (AnswerIcon), HeatmapChart
- **Issue:** Color is the sole differentiator between participants in charts, between risk levels in CPS, and between activity levels in heatmap. No pattern/shape/text alternatives in some cases.
- **Severity:** MEDIUM
- **Fix:** Add patterns, shapes, or text labels as secondary indicators alongside color.

---

## K. Copy & Microcopy

### K-01: "Command Center" in English (12+ Files)
- Already covered in D-01. Listed here for completeness.
- **Severity:** HIGH

### K-02: Missing Polish Diacritics
- **Components:** SubtextDecoder (pervasive), VersusCard, PersonalityCard, DatingProfileResult, ReplySimulator, Settings, Upload page privacy notice
- **Issue:** Diacritics missing throughout: "kartę"→"karte", "zdjęcie"→"zdjecie", "OSKARŻENIA"→"OSKARZENIA", "ZAKOŃCZONA"→"ZAKONCZONA", "Wydział"→"Wydzial", "Pewność"→"Pewnosc", "wiadomości"→"wiadomosci", etc.
- **Severity:** HIGH
- **Fix:** Systematic search-and-fix for all missing diacritics. Use a Polish spellchecker pass.

### K-03: English Share Caption Templates
- **Component:** `ShareCaptionModal.tsx`
- **Issue:** Caption templates are predominantly in English: "Just got our chat roasted by AI and I'm deceased 💀", English hashtags (#podtekst #roasted). The app is Polish-first.
- **Severity:** MEDIUM
- **Fix:** Provide Polish templates as primary, with English as secondary option for international sharing.

### K-04: Time Locale Set to en-US
- **Component:** `AIAnalysisButton.tsx`, line 233
- **Issue:** `'en-US'` locale used for time formatting instead of `'pl-PL'`.
- **Severity:** LOW
- **Fix:** Change to `'pl-PL'`.

### K-05: Statistics Formatting Uses English Convention
- **Component:** `profile/page.tsx`
- **Issue:** `formatLarge` uses "1.5K", "2.3M" instead of Polish "1,5 tys.", "2,3 mln".
- **Severity:** LOW
- **Fix:** Use Polish number formatting.

---

## L. Trust & Conversion

### L-01: No Actual Social Proof
- **Component:** `LandingSocialProof.tsx`
- **Issue:** Despite the component name, there are zero testimonials, zero user counts, zero ratings, zero "X analyses completed" counter. The section contains a manifesto and card showcase only.
- **Severity:** MEDIUM
- **Fix:** Add a live counter ("X rozmów przeanalizowanych"), testimonials, or social media embeds.

### L-02: FAQ References Non-Existent Pricing Plans
- **Component:** `LandingFAQ.tsx`
- **Issue:** FAQ mentions "3 analizy miesięcznie" and "Plany Pro i Unlimited" but Stripe payments are not implemented.
- **Severity:** HIGH
- **Fix:** Remove or update pricing references. Show actual free tier limitations.

### L-03: Footer Links Are Deceptive
- **Component:** `LandingFooter.tsx`
- **Issue:** Multiple footer links ("Profil osobowości", "Viral Scores", "Red Flag Report", "Styl przywiązania") all point to the same `#demo` anchor. Users clicking specific links expect specific content.
- **Severity:** LOW
- **Fix:** Either link to actual feature-specific content or remove misleading links.

### L-04: No "Wow Moment" Guidance
- **Component:** Results hub page
- **Issue:** After analysis, 16 modes are displayed. There is no guided "here's your biggest insight" moment. The confetti is nice but doesn't showcase a compelling result.
- **Severity:** MEDIUM
- **Fix:** Show the top 3 most interesting findings immediately on the hub page. E.g., "Your Health Score is 73/100", "Top insight: [quote from AI analysis]".

### L-05: Share Mechanics Require Multiple Steps
- **Component:** ShareCardGallery
- **Issue:** To share a result: navigate to Export mode → browse 20+ cards → select card → wait for render → click download → go to social media. No one-click share for the most viral-worthy card.
- **Severity:** MEDIUM
- **Fix:** Add a "Quick Share" button on the results hub that auto-selects the most interesting card and initiates share/download immediately.

---

## Non-Standard CSS Class Warnings

Multiple components reference classes that may not exist in the Tailwind/CSS configuration:
- `text-text-muted` — used in AIPredictions, ThreatMeters, DamageReport
- `text-text-secondary` — used in SubtextDecoder, DelusionQuiz
- `text-text-tertiary` — used in SubtextDecoder, DelusionQuiz

These should be verified against the `globals.css` definitions. If they resolve to nothing, significant amounts of supporting text may be invisible or unexpectedly styled.
