# PodTeksT — UX Implementation Plan

**Date:** 2026-03-01
**Based on:** UX_AUDIT_REPORT.md (82 findings), USER_FLOW_MAP.md, ACCESSIBILITY_REPORT.md
**Priority logic:** Legal risk > user-blocking > misleading content > friction > polish

---

## Phase 0: Legal & Compliance (CRITICAL — Do Before Launch)

*European Accessibility Act + EU AI Act + RODO. These carry legal penalties.*

### 0.1 Global Focus Indicators
- **Refs:** J-01, ACCESSIBILITY_REPORT §4
- **Files:** `src/app/globals.css`
- **Action:** Add global `focus-visible` rule:
  ```css
  :focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
  ```
- **Then:** Override per-component where the default conflicts with design (cards, pills, etc.)
- **Effort:** 1 hour (global) + 2 hours (per-component overrides)

### 0.2 `prefers-reduced-motion` for JS Animations
- **Refs:** J-05, I-01, ACCESSIBILITY_REPORT §5
- **Files:** Create `src/hooks/useReducedMotion.ts`; patch 12+ files
- **Action:**
  1. Create shared hook:
     ```ts
     export function useReducedMotion(): boolean {
       const [reduced, setReduced] = useState(false);
       useEffect(() => {
         const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
         setReduced(mq.matches);
         const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
         mq.addEventListener('change', handler);
         return () => mq.removeEventListener('change', handler);
       }, []);
       return reduced;
     }
     ```
  2. Gate these components: `CurtainReveal`, `HangingLetters`, `ParticleBackground`, `LandingDemo`, `useAIScrollChoreography` (already done), `ScrollProgress`, `PortalCard` parallax, `useCountUp`, `HangingLetters`, all framer-motion `animate` props
  3. When reduced: skip animation, show final state immediately
- **Effort:** 4 hours

### 0.3 Privacy Policy & Terms of Service
- **Refs:** C-05
- **Files:** Create `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`
- **Action:**
  1. Create `/privacy` page covering: local processing, Gemini API data sent (~2% messages), IndexedDB storage, no server logs, data deletion, cookie usage
  2. Create `/terms` page covering: entertainment disclaimer, AI limitations, user responsibility
  3. Link from: `LandingFooter`, `CookieConsent`, upload page, Settings
- **Effort:** 4 hours (content + pages + linking)

### 0.4 AI Transparency Badges
- **Refs:** B-01, B-05
- **Files:** Create `src/components/shared/AIBadge.tsx`, `src/components/shared/QuantBadge.tsx`; patch 20+ analysis components
- **Action:**
  1. Create `AIBadge`: sparkle icon + "Wygenerowane przez AI" — compact chip, consistent styling
  2. Create `QuantBadge`: calculator icon + "Obliczone z Twoich danych"
  3. Add `AIBadge` to: all AI mode pages (AI Deep Dive, CPS, Court, Dating, Simulator, Subtext, Stand-Up, Roast, Moral Foundations, Emotion Causes, Capitalization), AI Predictions, personality profiles, Health Score
  4. Add `QuantBadge` to: Metrics, Emotions, timeline charts, LSM, pronouns, chronotype, bid-response, repair patterns, IC, temporal focus, emotional granularity, shift-support
  5. Optional: different card border style for AI (subtle purple glow) vs quant (subtle blue border)
- **Effort:** 6 hours

### 0.5 AI Photo Consent Gate
- **Refs:** C-02
- **Files:** `src/components/analysis/DatingProfileResult.tsx`
- **Action:** Replace auto-call to `/api/analyze/image` on mount with explicit consent button: "Wygeneruj zdjecie profilowe AI — wyslemy opis osobowosci do Gemini"
- **Effort:** 30 minutes

### 0.6 Color-Scheme Declaration
- **Refs:** E-06
- **Files:** `src/app/globals.css`, `src/app/layout.tsx`
- **Action:**
  1. Add `color-scheme: dark;` to `:root` in globals.css
  2. Add `<meta name="color-scheme" content="dark">` to layout.tsx
- **Effort:** 10 minutes

---

## Phase 1: Flow Blockers & Critical Usability (Week 1)

*Issues that cause users to leave or produce misleading results.*

### 1.1 CurtainReveal: Reduce to 2s + Visible CTA
- **Refs:** A-01
- **Files:** `src/components/landing/CurtainReveal.tsx`
- **Action:**
  1. Change `AUTO_OPEN_MS` from `5000` to `2000`
  2. Add visible animated "Odslon" CTA button with `animate-pulse`
  3. When `prefers-reduced-motion`: skip entirely, show content immediately
  4. Add `aria-live="polite"` announcement when curtain opens
- **Effort:** 1 hour

### 1.2 Translate ALL English Error Messages to Polish
- **Refs:** A-04, A-05, G-02
- **Files:** `src/app/(dashboard)/analysis/new/page.tsx`, `src/components/analysis/AIAnalysisButton.tsx`
- **Action:**
  1. Line 149: `"This conversation has only..."` → `"Ta rozmowa ma tylko ${count} wiadomosci. Minimum 100 wiadomosci jest wymagane do analizy."`
  2. Line 213: `"An unexpected error..."` → `"Wystapil nieoczekiwany blad podczas analizy. Sprobuj ponownie."`
  3. AIAnalysisButton: Map all technical errors to Polish user-friendly messages
  4. Audit all `catch` blocks across API-calling components
- **Effort:** 2 hours

### 1.3 "Command Center" → Polish
- **Refs:** D-01, K-01
- **Files:** `src/components/shared/ModePageShell.tsx`, `src/components/shared/Navigation.tsx`, 10+ mode pages
- **Action:** Global replace "Command Center" → "Centrum Dowodzenia" across all files
- **Effort:** 30 minutes

### 1.4 Quiz Gate: Make Non-Blocking
- **Refs:** A-07
- **Files:** `src/app/(dashboard)/analysis/[id]/page.tsx`
- **Action:**
  1. Remove the quiz interstitial gate
  2. Show results immediately with confetti
  3. Add a non-blocking "Sprawdz swoja intuicje" prompt card in the hub (between KPI strip and portal cards)
  4. Move quiz to its own mode card instead of blocking results
- **Effort:** 2 hours

### 1.5 Export Instructions Visible by Default
- **Refs:** A-03
- **Files:** `src/app/(dashboard)/analysis/new/page.tsx`
- **Action:**
  1. Expand instructions by default on first visit (detect via `localStorage.getItem('podtekst-has-uploaded')`)
  2. Increase trigger text from `text-xs` to `text-sm`
  3. Add `role="button"`, `tabIndex={0}`, `onKeyDown` to the collapsible trigger
  4. Add `aria-expanded` state
- **Effort:** 1 hour

### 1.6 FAQ: Remove Non-Existent Pricing References
- **Refs:** L-02
- **Files:** `src/components/landing/LandingFAQ.tsx`
- **Action:** Remove "3 analizy miesiecznie" and "Plany Pro i Unlimited" or replace with "Aktualnie wszystkie funkcje sa dostepne bezplatnie"
- **Effort:** 15 minutes

### 1.7 Contrast Fixes: Critical Failures
- **Refs:** E-01, E-02, E-03, E-04, E-05
- **Files:** `LandingFooter.tsx`, `LandingFeatureShowcase.tsx`, `PsychDisclaimer.tsx`, chart components, globals.css
- **Action:**
  1. Footer links: `#555555` → `#888888` minimum
  2. Feature accent text: `#3b82f6` → `#60a5fa`, `#a855f7` → `#c084fc`, `#ef4444` → `#f87171`
  3. PsychDisclaimer: `text-[11px]` → `text-xs` (12px), `text-muted-foreground/60` → `text-muted-foreground/80`
  4. Chart tooltips: `#666` → `#999` minimum
  5. Minimum `text-[11px]` everywhere (replace all `text-[9px]` and `text-[10px]`)
- **Effort:** 3 hours

### 1.8 Missing Polish Diacritics
- **Refs:** K-02
- **Files:** SubtextDecoder, VersusCard, PersonalityCard, DatingProfileResult, ReplySimulator, Settings, Upload page
- **Action:** Systematic search for: karte→karte, zdjecie→zdjecie, OSKARZENIA→OSKARZENIA, ZAKONCZONA→ZAKONCZONA, Wydzial→Wydzial, Pewnosc→Pewnosc, wiadomosci→wiadomosci, etc. Fix all to proper Polish with diacritics.
- **Effort:** 2 hours

---

## Phase 2: Missing States (Week 2)

*Loading, error, and empty states that leave users confused.*

### 2.1 Progressive AI Analysis Feedback
- **Refs:** G-01
- **Files:** `src/components/analysis/AIAnalysisButton.tsx`
- **Action:**
  1. Add estimated time per pass: "Przebieg 1/4 — Przeglad rozmowy (~15s)"
  2. Show horizontal timeline with all 4 passes and active marker
  3. Display brief preview of partial results as each pass completes (e.g., "Styl komunikacji: bezposredni i emocjonalny")
  4. Show elapsed time counter
- **Effort:** 4 hours

### 2.2 Quantitative Analysis Progress
- **Refs:** A-06
- **Files:** `src/lib/analysis/quantitative.ts`, `src/app/(dashboard)/analysis/new/page.tsx`
- **Action:**
  1. Add progress callback parameter to `computeQuantitativeAnalysis()`
  2. Report categories: "Objetos...", "Czas odpowiedzi...", "Wzorce...", "Sentyment...", "Psycholingwistyka..."
  3. Display in ProcessingState with progress bar
- **Effort:** 2 hours

### 2.3 IndexedDB Error Handling
- **Refs:** G-03
- **Files:** `src/app/(dashboard)/dashboard/page.tsx`
- **Action:**
  1. Wrap `listAnalyses()` in try/catch
  2. Show error state: "Nie udalo sie zaladowac analiz. Sprobuj odswiezyc strone lub wyczysc dane przegladarki w Ustawieniach."
  3. Add link to `/settings` for data management
- **Effort:** 1 hour

### 2.4 PDF Export Error Feedback
- **Refs:** G-04
- **Files:** `src/components/analysis/ExportPDFButton.tsx`
- **Action:** Add error toast in catch block: "Generowanie PDF nie powiodlo sie. Sprobuj ponownie."
- **Effort:** 15 minutes

### 2.5 Tab Close Warning During Analysis
- **Refs:** G-05
- **Files:** `src/components/analysis/AIAnalysisButton.tsx`
- **Action:**
  1. Add `beforeunload` listener when analysis is in progress
  2. Remove listener on completion
  3. Optional: Save partial AI results to IndexedDB after each pass completes
- **Effort:** 1 hour

### 2.6 Discord Privacy Notice
- **Refs:** C-03
- **Files:** `src/components/upload/DiscordImport.tsx`
- **Action:** Add prominent notice: "Uwaga: Wiadomosci z Discorda przechodzą przez nasz serwer do pobrania. Nie sa zapisywane. To inny model niz przesylanie pliku (ktory jest w pelni lokalny)."
- **Effort:** 30 minutes

---

## Phase 3: AI Explainability (Week 3)

*2026 standard: users expect to understand AI-generated content.*

### 3.1 Confidence Indicators Based on Sample Size
- **Refs:** B-03
- **Files:** Create `src/components/shared/ConfidenceBadge.tsx`; patch analysis section headers
- **Action:**
  1. Create `ConfidenceBadge` component:
     - `< 200 messages`: "Ograniczone dane" (orange badge)
     - `200-1000 messages`: "Standardowa probka" (no badge or subtle gray)
     - `> 1000 messages`: "Bogata probka" (green badge)
  2. Display at top of each analysis section next to AIBadge/QuantBadge
  3. For AI sections: also show "Przeanalizowano ~X wiadomosci z Y"
- **Effort:** 3 hours

### 3.2 "Dlaczego ten wynik?" Expandable Chips
- **Refs:** B-02
- **Files:** Create `src/components/shared/WhyThis.tsx`; patch AI result components
- **Action:**
  1. Create `WhyThis` component: clickable "Dlaczego?" chip that expands to show rationale
  2. For AI results: show source quotes from the AI pass response
  3. For quantitative results: show formula or methodology note
  4. Priority integration: ThreatMeters, DamageReport, AIPredictions, Health Score
- **Effort:** 6 hours

### 3.3 Reproducibility Warning
- **Refs:** B-04
- **Files:** `src/components/analysis/AIAnalysisButton.tsx`
- **Action:** Show one-time info banner (dismissable, stored in localStorage):
  "Wyniki AI moga sie nieznacznie roznic przy kazdym uruchomieniu. Metryki ilosciowe (wykresy, statystyki) sa zawsze identyczne."
- **Effort:** 1 hour

### 3.4 PsychDisclaimer Upgrade
- **Refs:** B-05, E-03
- **Files:** `src/components/shared/PsychDisclaimer.tsx`
- **Action:**
  1. Increase minimum font to 12px
  2. Increase opacity to /80
  3. Add visible "Rozrywka, nie diagnoza" chip at the top of AI sections (not just bottom disclaimer)
  4. Consider adding a subtle background (e.g., `bg-amber-500/5 border border-amber-500/10 rounded-lg p-3`)
- **Effort:** 1 hour

### 3.5 Share Card Anonymization Option
- **Refs:** C-04
- **Files:** `src/components/share-cards/ShareCardGallery.tsx`, all share card components
- **Action:**
  1. Add toggle in ShareCardGallery: "Anonimizuj imiona" (default: ON)
  2. When ON: replace real names with "Osoba A" / "Osoba B" in downloaded PNGs
  3. Show warning when toggle is OFF: "Karta zawiera prawdziwe imiona"
- **Effort:** 3 hours

---

## Phase 4: Keyboard Navigation & ARIA (Week 3-4)

*European Accessibility Act compliance.*

### 4.1 Replace `<div onClick>` with Semantic Elements
- **Refs:** H-01, J-02
- **Files:** `dashboard/page.tsx`, portal cards, mode cards, nav items
- **Action:**
  1. Dashboard analysis cards: wrap in `<Link>` from next/link
  2. Portal cards in results hub: ensure `<button>` or `<Link>` wrapping
  3. All clickable `<div>` elements: replace with `<button>` or `<a>` as appropriate
  4. Search for `<div onClick` pattern and fix each instance
- **Effort:** 4 hours

### 4.2 Skip-to-Content Link
- **Refs:** J-07
- **Files:** `src/app/(dashboard)/layout.tsx`, `src/app/layout.tsx`
- **Action:** Add `<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-background focus:text-foreground">Przejdz do tresci</a>`
- **Effort:** 30 minutes

### 4.3 SVG ARIA Labels
- **Refs:** J-03, J-06
- **Files:** AIPredictions, ThreatMeters, DamageReport, DelusionQuiz, LSMCard, HeatmapChart, all gauge components
- **Action:**
  1. Add `role="img" aria-label="..."` to all data visualization SVGs
  2. Format labels with actual values: `aria-label="Wynik zaufania: 73 na 100"`
  3. Add `aria-hidden="true"` to all decorative Lucide icons
- **Effort:** 3 hours

### 4.4 Focus Traps in Modals
- **Refs:** J-04
- **Files:** `ShareCaptionModal.tsx`, `ShareCardGallery.tsx` overlay, any overlay/dialog
- **Action:**
  1. Use shadcn/ui Dialog (which has built-in focus trapping) where possible
  2. For custom overlays: add focus trap logic (first/last focusable element cycling)
- **Effort:** 2 hours

### 4.5 Chart Keyboard Accessibility
- **Refs:** H-03
- **Files:** `HeatmapChart.tsx`, `ResponseTimeChart.tsx`, chart components
- **Action:**
  1. Add `tabIndex={0}` to chart containers
  2. Add `onFocus`/`onClick` tooltip triggers (not just hover)
  3. Add screen-reader-only data tables as alternatives to visual charts
- **Effort:** 4 hours

### 4.6 Demo Carousel Key Scope
- **Refs:** H-02
- **Files:** `src/components/landing/LandingDemo.tsx`
- **Action:** Move arrow key handler from `window` to carousel container's `onKeyDown`
- **Effort:** 30 minutes

---

## Phase 5: Responsive & Mobile (Week 4)

### 5.1 ModeSwitcherPill Tap Targets
- **Refs:** F-01
- **Files:** `src/components/shared/ModeSwitcherPill.tsx`
- **Action:**
  1. Increase icon from `size-4` (16px) to `size-5` (20px)
  2. Increase padding from `px-2.5 py-2` to `px-3 py-2.5`
  3. Ensure minimum 44x44px touch target per mode button
  4. Consider showing only 6-8 primary modes on mobile with "..." overflow
- **Effort:** 1 hour

### 5.2 Mobile Video/Animation Budget
- **Refs:** F-03, I-01
- **Files:** `src/app/(dashboard)/analysis/[id]/page.tsx`, `ModePageShell.tsx`
- **Action:**
  1. Disable aurora mesh + scanlines + interactive grid on mobile
  2. Use static gradient background instead of video on mid-range devices
  3. Test with Chrome DevTools throttling (4x CPU slowdown)
- **Effort:** 2 hours

### 5.3 Dating Profile: No Phone Mockup on Mobile
- **Refs:** F-04
- **Files:** `src/components/analysis/DatingProfileResult.tsx`
- **Action:** On `< md` breakpoint: render as standard card layout without the phone frame. Keep mockup for desktop.
- **Effort:** 1 hour

### 5.4 KPI Grid 5-Item Fix
- **Refs:** F-02
- **Files:** `src/app/(dashboard)/analysis/[id]/page.tsx`
- **Action:** Make 5th KPI card span full width on mobile: `last:col-span-2` or switch to `grid-cols-3` when there are 5 items.
- **Effort:** 15 minutes

---

## Phase 6: Polish & Micro-interactions (Week 5+)

*Enhancement opportunities that improve perceived quality.*

### 6.1 Polish Mode Titles
- **Refs:** D-02
- **Files:** `src/app/(dashboard)/analysis/[id]/page.tsx` MODE_DEFINITIONS
- **Action:** Add Polish subtitles to English mode titles:
  - "AI Deep Dive" → "AI Deep Dive — Gleboka analiza"
  - "Data Observatory" → "Obserwatorium Danych"
  - "CPS Screening" → "Screening CPS"
  - "Roast Arena" → "Arena Roastow"
  - etc.
- **Effort:** 1 hour

### 6.2 Jargon Tooltips
- **Refs:** D-05
- **Files:** LSMCard, GottmanHorsemen, PursuitWithdrawalCard, IntegrativeComplexityCard, PersonalityDeepDive
- **Action:** Add `title` attribute or info icon with tooltip explaining:
  - "LSM" → "Dopasowanie Stylu Jezykowego — miara naśladowania sposobu mowy rozmowcy"
  - "Gottman" → "Model Johna Gottmana — 4 wzorce zagrazajace relacjom"
  - "Big Five" → "5 glownych wymiarow osobowosci wg psychologii"
  - "MBTI" → "System 16 typow osobowosci Myersa-Briggsa"
- **Effort:** 2 hours

### 6.3 Guided Reading Path
- **Refs:** D-04, L-04
- **Files:** `src/app/(dashboard)/analysis/[id]/page.tsx`
- **Action:**
  1. Add "Zacznij tutaj" highlight on the top 3 recommended modes
  2. Show top insight summary on the hub page: Health Score + one key AI finding
  3. Consider progressive reveal: show "Rekomendowane" modes first, "Wszystkie" behind a tab
- **Effort:** 3 hours

### 6.4 Social Proof
- **Refs:** L-01
- **Files:** `src/components/landing/LandingSocialProof.tsx`
- **Action:** Add live counter "X rozmow przeanalizowanych" (tracked via GA4 or localStorage aggregate). Add 3-5 testimonial cards.
- **Effort:** 2 hours

### 6.5 Quick Share Button
- **Refs:** L-05
- **Files:** `src/app/(dashboard)/analysis/[id]/page.tsx`
- **Action:** Add "Udostepnij" button on hub page that auto-selects the most interesting share card (based on available data: HealthScore card if AI done, StatsCard if not) and triggers Web Share API.
- **Effort:** 2 hours

### 6.6 Polish Share Captions
- **Refs:** K-03
- **Files:** `src/components/analysis/ShareCaptionModal.tsx`
- **Action:** Replace English templates with Polish primary, English secondary:
  - "AI przeanalizowalo naszego czata i jestem w szoku"
  - "#podtekst #rozmowa #analiza"
- **Effort:** 30 minutes

### 6.7 Performance: Continuous Animation Audit
- **Refs:** I-01, I-02, I-03
- **Files:** Multiple (45 files with continuous animations)
- **Action:**
  1. GSAP tickers: throttle to 30fps, skip when scroll delta is 0
  2. ScrollProgress: replace React state with CSS `animation-timeline: scroll()` or `requestAnimationFrame` throttle
  3. Add IntersectionObserver to pause off-screen continuous animations
  4. Remove purely decorative continuous animations that have no functional purpose
  5. Target: maximum 5 concurrent continuous animations on any single page
- **Effort:** 6 hours

### 6.8 Data Flow Visualization
- **Refs:** C-01
- **Files:** `src/app/(dashboard)/analysis/new/page.tsx`
- **Action:** Add a 4-step visual diagram on upload page:
  1. "Plik" (phone icon) → 2. "Przetwarzanie lokalne" (browser icon) → 3. "~2% do AI" (cloud icon, dotted line) → 4. "Wyniki w przegladarce" (chart icon)
  Simple SVG or CSS illustration, always visible above the DropZone.
- **Effort:** 2 hours

### 6.9 Footer Links Fix
- **Refs:** L-03
- **Files:** `src/components/landing/LandingFooter.tsx`
- **Action:** Remove deceptive links that all point to `#demo`. Keep only real links: Privacy, Terms, GitHub, Contact.
- **Effort:** 15 minutes

### 6.10 Locale Fixes
- **Refs:** K-04, K-05
- **Files:** `AIAnalysisButton.tsx`, `profile/page.tsx`
- **Action:** Change `'en-US'` → `'pl-PL'` for time formatting. Change `formatLarge` to use Polish conventions ("1,5 tys." instead of "1.5K").
- **Effort:** 30 minutes

---

## Summary

| Phase | Focus | Items | Est. Effort | Priority |
|-------|-------|-------|-------------|----------|
| **0** | Legal & Compliance | 6 | ~16 hours | MUST before launch |
| **1** | Flow Blockers | 8 | ~12 hours | MUST before launch |
| **2** | Missing States | 6 | ~9 hours | SHOULD before launch |
| **3** | AI Explainability | 5 | ~14 hours | SHOULD before launch |
| **4** | Keyboard & ARIA | 6 | ~14 hours | MUST for EAA compliance |
| **5** | Responsive & Mobile | 4 | ~4 hours | SHOULD before launch |
| **6** | Polish & Micro-interactions | 10 | ~20 hours | NICE to have |
| **Total** | | **45** | **~89 hours** | |

### Critical Path (Phases 0 + 1 + 4)

These 20 items are required for legal compliance and preventing user bounce:

1. Global focus indicators (0.1)
2. `prefers-reduced-motion` JS support (0.2)
3. Privacy policy + terms (0.3)
4. AI transparency badges (0.4)
5. AI photo consent (0.5)
6. Color-scheme declaration (0.6)
7. CurtainReveal fix (1.1)
8. English → Polish errors (1.2)
9. "Command Center" → Polish (1.3)
10. Quiz gate removal (1.4)
11. Export instructions visible (1.5)
12. FAQ pricing removal (1.6)
13. Contrast fixes (1.7)
14. Polish diacritics (1.8)
15. Semantic elements (4.1)
16. Skip-to-content (4.2)
17. SVG ARIA labels (4.3)
18. Modal focus traps (4.4)
19. Chart keyboard access (4.5)
20. Demo carousel scope (4.6)

**Estimated critical path: ~42 hours**

### Quick Wins (< 1 hour each)

These can be done immediately with minimal risk:

1. Color-scheme declaration (0.6) — 10 min
2. FAQ pricing fix (1.6) — 15 min
3. KPI grid fix (5.4) — 15 min
4. Footer links fix (6.9) — 15 min
5. Locale fixes (6.10) — 30 min
6. AI photo consent gate (0.5) — 30 min
7. "Command Center" → Polish (1.3) — 30 min
8. Demo carousel key scope (4.6) — 30 min
9. Skip-to-content link (4.2) — 30 min
10. PDF error feedback (2.4) — 15 min
11. Discord privacy notice (2.6) — 30 min
12. Polish share captions (6.6) — 30 min

**Total quick wins: ~5 hours for 12 fixes**
