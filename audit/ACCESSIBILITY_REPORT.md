# PodTeksT — Accessibility Audit Report

**Date:** 2026-03-01
**Standard:** WCAG 2.2 Level AA + European Accessibility Act (in force 2025)
**Method:** Static code analysis of all components, CSS, and interaction patterns

---

## Executive Summary

PodTeksT has **critical accessibility failures** across all WCAG categories. The application is effectively unusable for keyboard-only users, screen reader users, and users with vestibular/motion sensitivities. The European Accessibility Act compliance status is: **NON-COMPLIANT**.

### Compliance Overview

| WCAG Category | Status | Key Gap |
|---------------|--------|---------|
| 1.1 Text Alternatives | ❌ FAIL | Only 14 alt texts across 100+ components |
| 1.3 Adaptable | ⚠️ PARTIAL | Semantic HTML inconsistent; headings missing |
| 1.4 Distinguishable | ❌ FAIL | Multiple contrast failures; no light mode |
| 2.1 Keyboard Accessible | ❌ FAIL | Only 7 keyboard handlers; dashboard cards not navigable |
| 2.4 Navigable | ❌ FAIL | No skip-to-content; no focus indicators |
| 2.5 Input Modalities | ⚠️ PARTIAL | Some tap targets below 44px |
| 3.1 Readable | ⚠️ PARTIAL | Mixed English/Polish; missing diacritics |
| 3.2 Predictable | 🟢 PASS | Consistent navigation pattern |
| 4.1 Compatible | ⚠️ PARTIAL | Missing ARIA on interactive widgets |

---

## 1. Perceivable

### 1.1 Text Alternatives (Level A) — ❌ FAIL

**Finding:** Only 14 `alt` attributes found across 12 files in the entire component library.

| Component | Has Alt? | Issue |
|-----------|----------|-------|
| DropZone | ✅ | Decorative Discord icon has alt |
| BadgesGrid | ✅ | Badge images have alt |
| AnalysisImageCard | ✅ | AI image has alt |
| DatingProfileResult | ✅ | AI photo has alt |
| RankingBadges | ✅ | Badge icons have alt |
| ParticipantPhotoUpload | ✅ | Uploaded photo has alt |
| All SVG charts | ❌ | HeatmapChart has `role="img"` + `aria-label`; ALL OTHERS lack text alternatives |
| All SVG gauges | ❌ | AIPredictions, ThreatMeters, DamageReport, DelusionQuiz, LSMCard — no ARIA on SVG arcs |
| Share cards | ❌ | PersonalityCard pentagon chart, VersusCard comparisons — no text alternatives |
| Lucide icons | ❌ | Most decorative icons not marked `aria-hidden` |

**Recommendation:**
1. Add `aria-hidden="true"` to all decorative Lucide icons
2. Add `role="img" aria-label="..."` to all data visualization SVGs
3. Add alt text to all `<Image>` components

### 1.3 Adaptable (Level A) — ⚠️ PARTIAL

**Heading Structure Issues:**
| Page | Issue |
|------|-------|
| Landing (desktop) | Hero text uses `<span>` not `<h1>` — no heading |
| LandingHowItWorks | Steps rendered as `<div>`, not `<ol>` |
| Dashboard cards | No heading structure within cards |
| Analysis mode pages | `<h1>` via ModePageShell is correct ✅ |
| Share cards | All headings are `<div>` elements |

**ARIA Landmarks:**
| Landmark | Present? | File |
|----------|----------|------|
| `<main>` | ✅ | ModePageShell.tsx, DashboardShell |
| `<nav>` | ✅ | Navigation.tsx, ModeSwitcherPill.tsx, AISectionDots |
| `<header>` | ✅ | Navigation.tsx (`role="banner"`) |
| `<footer>` | ⚠️ | LandingFooter uses `<section>`, not `<footer>` |
| skip-to-content | ❌ | Not present anywhere |

### 1.4 Distinguishable (Level AA) — ❌ FAIL

#### Contrast Ratio Failures

| Element | Location | Foreground | Background | Ratio | Requirement | Status |
|---------|----------|-----------|------------|-------|-------------|--------|
| Footer links | LandingFooter | `#555555` | `#050505` | ~2.8:1 | 4.5:1 | ❌ FAIL |
| Blue accent text | FeatureShowcase | `#3b82f6` | `#111111` | ~3.8:1 | 4.5:1 | ❌ FAIL |
| Purple accent text | FeatureShowcase | `#a855f7` | `#111111` | ~3.4:1 | 4.5:1 | ❌ FAIL |
| Red accent text | FeatureShowcase | `#ef4444` | `#111111` | ~3.7:1 | 4.5:1 | ❌ FAIL |
| Muted text /50 | Multiple | `~#545454` | `#050505` | ~2.8:1 | 4.5:1 | ❌ FAIL |
| Muted text /60 | PsychDisclaimer | `~#656565` | `#0a0a0a` | ~3.2:1 | 4.5:1 | ❌ FAIL |
| White /30 | LSMCard norm ref | `~#4d4d4d` | `#050505` | ~2.5:1 | 4.5:1 | ❌ FAIL |
| Tooltip text | Chart tooltips | `#666666` | `#111111` | ~3.2:1 | 4.5:1 | ❌ FAIL |
| Muted foreground | Standard | `#a8a8a8` | `#050505` | ~7.5:1 | 4.5:1 | ✅ PASS |
| Primary text | Standard | `#fafafa` | `#050505` | ~19.5:1 | 4.5:1 | ✅ PASS |
| Card text | Standard | `#fafafa` | `#111111` | ~16.1:1 | 4.5:1 | ✅ PASS |

**Key offenders:** Any use of `/50`, `/60`, or `/70` opacity on muted colors fails contrast. This pattern appears in 30+ component files.

#### Minimum Text Size Violations

| Size | Components Using It |
|------|-------------------|
| `text-[9px]` (9px) | AIPredictions, ThreatMeters, RankingBadges, HeatmapChart |
| `text-[10px]` (10px) | SubtextDecoder (6+ instances), LandingHowItWorks badges |
| `text-[11px]` (11px) | PsychDisclaimer, TurningPointsTimeline |
| `text-[0.65rem]` (10.4px) | LandingHowItWorks detail badges |

WCAG 1.4.4 (Resize Text) recommends minimum 12px for body text.

#### Color-Only Information

| Component | Issue |
|-----------|-------|
| LSMCard | Score bar color (green/amber/red) conveys quality — numeric value is alternative ✅ |
| CPSScreener AnswerIcon | Green checkmark vs red X inverted meaning — confusing for colorblind |
| HeatmapChart | Activity level conveyed solely by color intensity — no text per cell |
| GottmanHorsemen | Severity distinguished by color — text labels provide alternative ✅ |
| Charts (all) | Participant lines distinguished only by color — no patterns/dashes |

#### `prefers-color-scheme` — NOT SUPPORTED
The app forces dark mode. No `color-scheme` declaration. No light mode option.

---

## 2. Operable

### 2.1 Keyboard Accessible (Level A) — ❌ FAIL

**Keyboard handler inventory:**

| Component | Handler | Purpose |
|-----------|---------|---------|
| DropZone | `onKeyDown` | Enter/Space triggers file dialog ✅ |
| DiscordImport | `onKeyDown` | Enter submits PIN ✅ |
| Navigation | `onKeyDown` | Escape closes mobile menu ⚠️ (no focus trap) |
| ArgumentTopicPicker | `onKeyDown` | Enter selects topic ✅ |
| ArgumentSimulator | `onKeyDown` | Enter sends message ✅ |
| ReplySimulator | `onKeyDown` | Enter sends message ✅ |

**Total: 7 handlers across 6 files.** For an app with 100+ interactive components, this is critically insufficient.

**Critical keyboard failures:**

| Component | Issue |
|-----------|-------|
| Dashboard analysis cards | `<div onClick>` — not keyboard navigable |
| Export instructions | `<div onClick>` — not keyboard accessible |
| Share card gallery thumbnails | No keyboard focus or activation |
| Modal overlays | No focus trapping |
| HeatmapChart cells | Hover-only tooltips — no keyboard access |
| LandingDemo carousel | Arrow keys on `window` — interferes with all keyboard interaction |
| CourtVerdict collapsibles | `<button>` but no `aria-expanded` |
| SectionNavigator desktop | Buttons present but no visible focus ring |

### 2.4 Navigable (Level AA) — ❌ FAIL

#### No Skip-to-Content Link
No skip navigation link exists anywhere in the application.

**Fix:** Add to DashboardShell/layout:
```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
  Przejdź do treści
</a>
```

#### Focus Indicator Audit

| Component | Has focus-visible? |
|-----------|-------------------|
| `button.tsx` (shadcn) | ✅ `focus-visible:ring-ring/50` |
| `badge.tsx` (shadcn) | ✅ |
| `DropZone.tsx` | ✅ Custom focus ring |
| `AuthForm.tsx` | ✅ |
| `PortalCard.tsx` | ✅ |
| **All other components** | ❌ No focus indicators |

**Total: 5 files with focus-visible. 95%+ of interactive elements have no visible focus indicator.**

#### Focus Management in Modals

| Modal/Overlay | Focus trap? | Focus return? | Escape close? |
|--------------|-------------|---------------|---------------|
| ShareCardGallery mobile | ❌ | ❌ | ✅ |
| ShareCaptionModal | ❌ | ❌ | ✅ |
| CookieConsent | ❌ | N/A | ❌ |
| LandingDemo fullscreen | ❌ | ❌ | ✅ |
| Navigation mobile menu | ❌ | ❌ | ✅ |

### 2.5 Input Modalities (Level AA) — ⚠️ PARTIAL

#### Target Size (WCAG 2.5.8 — Level AA minimum 24x24px, AAA 44x44px)

| Element | Approx. Size | Meets AA? | Meets AAA? |
|---------|-------------|-----------|------------|
| ModeSwitcherPill icons | ~36x36px | ✅ | ❌ |
| DropZone remove buttons | 44x44px | ✅ | ✅ |
| SectionNavigator desktop dots | ~28x28px | ✅ | ❌ |
| Dashboard delete button | ~24x24px | ✅ (borderline) | ❌ |
| LandingDemo carousel dots | ~16x16px | ❌ | ❌ |
| HeatmapChart cells | ~16x16px | ❌ | ❌ |
| Share card close button (desktop) | ~24x24px | ✅ (borderline) | ❌ |
| Discord message limit buttons | ~32x28px | ✅ | ❌ |

---

## 3. Understandable

### 3.1 Readable (Level A) — ⚠️ PARTIAL

**Language declaration:** Not verified from code (would need to check `<html lang="pl">`).

**Mixed language content:**
| Category | Examples |
|----------|---------|
| Navigation labels | "Command Center" (12+ files) |
| Mode titles | "AI Deep Dive", "Roast Arena", "Dating Profile", etc. |
| Button labels | "Share card" in ReplySimulator |
| Error messages | Minimum message count in English |
| Share captions | Templates predominantly in English |
| Feature names | "Health Score", "Story Mode", "Wrapped" |
| Academic terms | "Language Style Matching", "Delusion Index" |

**Missing diacritics:** Pervasive in SubtextDecoder, VersusCard, DatingProfileResult, ReplySimulator. See UX_AUDIT_REPORT.md K-02.

### 3.2 Predictable (Level A) — 🟢 PASS

Navigation behavior is consistent. ModeSwitcherPill provides reliable mode switching. ModePageShell provides consistent page structure. Back button always returns to hub.

---

## 4. Robust

### 4.1 Compatible (Level A) — ⚠️ PARTIAL

#### ARIA Usage Audit

| Pattern | Component | Status |
|---------|-----------|--------|
| `role="progressbar"` | Step indicator in new/page.tsx | ✅ Correct with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| `role="progressbar"` | AIAnalysisButton progress | ❌ Missing |
| `role="progressbar"` | All SVG arc gauges | ❌ Missing |
| `role="img"` | HeatmapChart | ✅ With `aria-label` |
| `role="img"` | ResponseTimeChart | ✅ With `aria-label` |
| `role="img"` | All other charts | ❌ Missing |
| `role="dialog"` | ShareCaptionModal | ✅ With `aria-modal` and `aria-labelledby` |
| `role="dialog"` | ShareCardGallery overlay | ❌ Missing |
| `role="dialog"` | Free tier limit overlay | ❌ Missing |
| `role="switch"` | Settings toggles | ✅ With `aria-checked` |
| `role="tablist"` | Import mode tabs | ❌ Missing |
| `role="tablist"` | AI section navigation | ❌ Missing |
| `aria-expanded` | CourtVerdict collapsibles | ❌ Missing |
| `aria-expanded` | Export instructions | ❌ Missing |
| `aria-expanded` | SubtextDecoder context toggle | ❌ Missing |
| `aria-pressed` | Relationship type buttons | ❌ Missing |
| `aria-pressed` | Discord message limit buttons | ❌ Missing |
| `aria-selected` | Discord server/channel selectors | ❌ Missing |
| `aria-current="page"` | Navigation active link | ❌ Missing |
| `aria-live` | ReplySimulator messages | ❌ Missing |
| `aria-live` | Analysis progress updates | ❌ Missing |

---

## 5. `prefers-reduced-motion` Audit

### CSS Animations (handled by global rule)
The `globals.css` rule at line 167-176 correctly handles all CSS animations:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Smart Exemptions (correct)
- `animate-spin` on loaders kept running ✅
- Marquee slowed but not stopped ✅

### JavaScript Animations — ❌ NOT HANDLED (except where noted)

| Animation System | Components | Respects pref? |
|-----------------|-----------|----------------|
| Web Animations API | CurtainReveal | ❌ |
| `requestAnimationFrame` | ParticleBackground | ❌ |
| `requestAnimationFrame` | HangingLetters | ❌ |
| `requestAnimationFrame` | ScrambleCounter (5 instances on hub) | ❌ |
| `requestAnimationFrame` | useCountUp (3 components) | ❌ |
| GSAP ScrollTrigger | useAIScrollChoreography | ✅ (checks matchMedia + sets final states) |
| GSAP ticker | Proximity glow, velocity glow | ✅ (gated by isMobile check; reduced-motion sets final states) |
| framer-motion | 30+ components | ❌ (framer-motion has `MotionConfig reducedMotion` but it's not used globally) |
| CSS `animate-ping` | ThreatMeters, DamageReport (on HIGH severity) | ⚠️ CSS rule stops it, but the visual intent may be lost |

**Critical finding:** The most impactful animations (CurtainReveal page block, particle backgrounds, scroll-based reveals) bypass the CSS reduced-motion rule entirely.

**Recommendation:** Create a shared hook:
```typescript
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}
```

Add `<MotionConfig reducedMotion="user">` wrapper in the root layout for framer-motion.

---

## 6. Keyboard Navigation Map

### Full Flow Keyboard Test

| Action | Key | Works? | Notes |
|--------|-----|--------|-------|
| Navigate to CTA | Tab | ⚠️ | No visible focus ring on most elements |
| Open curtain | Enter/Space | ✅ | Document-level handler |
| Skip curtain | — | ❌ | No skip option; must wait 5s |
| Navigate landing sections | Tab | ⚠️ | Links work but no focus indicators |
| Scroll demo carousel | Arrow keys | ⚠️ | Captures globally, interferes with page |
| Navigate to upload | Enter | ✅ | CTA link works |
| Trigger file dialog | Enter/Space | ✅ | DropZone keyboard support |
| Select relationship type | Tab + Enter | ❌ | Buttons lack keyboard support |
| Start analysis | Tab + Enter | ⚠️ | Button accessible but may not receive focus visibly |
| Navigate dashboard cards | Tab | ❌ | Cards are `<div onClick>` — not keyboard accessible |
| Delete analysis | Tab + Enter | ⚠️ | Delete button is `<button>` but tiny |
| Navigate mode pages | Tab | ⚠️ | ModeSwitcherPill links are keyboard accessible |
| Back to hub | Tab + Enter | ✅ | "Command Center" link works |
| Interact with charts | Tab | ❌ | No keyboard interaction on any chart |
| View chart tooltips | Focus | ❌ | Hover-only |
| Open share card | Tab + Enter | ❌ | Gallery thumbnails not keyboard accessible |
| Close modal | Escape | ✅ | Works in ShareCaptionModal and overlays |
| Navigate within modal | Tab | ❌ | No focus trap |

---

## 7. Prioritized Fix List

### Phase 0: Immediate (Legal/Compliance)

1. **Add global `focus-visible` styles** — Single CSS addition fixes 95% of keyboard navigation visibility
2. **Add `prefers-reduced-motion` JS check** — Create shared hook, wrap framer-motion in `<MotionConfig>`
3. **Replace `<div onClick>` with proper elements** — Dashboard cards, export instructions, share gallery
4. **Add ARIA labels to SVG visualizations** — 5+ component gauge SVGs
5. **Add skip-to-content link** — Layout component addition

### Phase 1: Critical Path

6. **Fix contrast failures** — Footer links, accent text, muted opacity patterns, tooltip text
7. **Add focus traps to modals** — ShareCardGallery, ShareCaptionModal, Navigation mobile
8. **Increase minimum text size** — Replace all `text-[9px]`/`text-[10px]` with minimum 11px
9. **Add ARIA roles to interactive widgets** — Tabs, collapsibles, progress indicators

### Phase 2: Full Compliance

10. **Add `aria-expanded` to all collapsibles** — CourtVerdict, SubtextDecoder, export instructions
11. **Add `aria-live` regions** — ReplySimulator, analysis progress
12. **Add `aria-current="page"` to navigation** — Active link indication
13. **Add keyboard-accessible chart tooltips** — HeatmapChart, ResponseTimeChart
14. **Fix color-only information** — Add patterns to chart lines, fix CPS AnswerIcon
15. **Add alt text to all images** — Systematic audit of `<Image>` and `<img>` elements
16. **Add `color-scheme: dark` declaration** — Ensure browser UI matches

### Effort Estimate

| Phase | Items | Est. Hours |
|-------|-------|-----------|
| Phase 0 | 5 items | 4-6h |
| Phase 1 | 4 items | 6-8h |
| Phase 2 | 7 items | 8-12h |
| **Total** | **16 items** | **18-26h** |
