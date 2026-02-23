# Audit 2: Frontend UI/UX + Mobile

**Date:** 2026-02-19
**Auditor:** Claude Opus 4.6 (Automated)
**Scope:** All frontend components, landing page, analysis views, mobile responsiveness
**Overall Score:** Frontend Desktop: **7.0/10** | Mobile: **5.5/10**

---

## Executive Summary

The frontend delivers a polished, data-dense desktop experience with strong visual design (dark theme, Bloomberg-meets-Spotify aesthetic). However, mobile support is significantly lacking with blocking animations, unresponsive layouts, and touch target issues. Several components exceed recommended size limits, and accessibility patterns (focus traps, ARIA) need work.

---

## Critical Issues (5)

### ~~CRIT-01: CurtainReveal Animation Blocks Interaction~~ → DOWNGRADED to Minor
- **File:** `src/components/landing/` (landing page entry animation)
- **Status:** Animation is already skippable (click/tap to skip). Original assessment was incorrect.
- **Remaining concern (minor):** On very slow mobile connections, the animation still takes bandwidth/CPU before skip is available. Consider reducing animation complexity on mobile or respecting `prefers-reduced-motion`.

### CRIT-02: No Focus Traps in Modals/Dialogs
- **Files:** `src/components/analysis/ShareCaptionModal.tsx`, various modal components
- **Impact:** Keyboard users can tab behind open modals, breaking accessibility
- **Details:** When modals open (share card, caption modal, etc.), focus is not trapped within the modal. Tab key moves focus to elements behind the overlay.
- **Recommendation:** Implement `useFocusTrap` hook or use Radix Dialog which provides this automatically. shadcn/ui Dialog component should handle this if used correctly.

### CRIT-03: Touch Targets Below 44px Minimum
- **Files:** Multiple components across the app
- **Impact:** Mobile users struggle to tap buttons, links, and interactive elements
- **Details:** Many interactive elements (navigation links, small buttons, chart tooltips, share card actions) have touch targets smaller than the WCAG 2.5.8 recommended 44×44px minimum.
- **Recommendation:** Audit all interactive elements and ensure minimum 44px touch target via padding/margin. Use Tailwind `min-h-11 min-w-11` on all clickable elements.

### CRIT-04: ParticleBackground Renders on Mobile
- **File:** `src/components/landing/` (particle/background effects)
- **Impact:** Severe performance degradation on mobile devices, battery drain
- **Details:** The particle background animation (canvas-based) runs on all viewports including mobile. On older/mid-range phones, this causes frame drops, jank, and battery drain.
- **Recommendation:** Disable particle effects on mobile (`matchMedia('(max-width: 768px)')`) or use `prefers-reduced-motion` media query. Show static gradient instead.

### CRIT-05: WrappedPlayer Component is 1,089 Lines
- **File:** `src/components/wrapped/WrappedPlayer.tsx` (1,089 LOC)
- **Impact:** Unmaintainable, untestable monolith that handles all "Wrapped/Story" animation logic
- **Details:** Single component manages all story slides, animations, transitions, audio, and user interaction. No separation of concerns.
- **Recommendation:** Extract into sub-components: `WrappedSlide`, `WrappedNavigation`, `WrappedAudioController`, `useWrappedAnimation` hook. Target <200 LOC per component.

---

## Major Issues (10)

### MAJ-01: Analysis Page is 793 Lines with 50+ Imports
- **File:** `src/app/(dashboard)/analysis/[id]/page.tsx` (793 LOC)
- **Details:** Single page component imports 50+ child components statically. No code splitting, no lazy loading. First paint requires downloading all analysis visualization code upfront.
- **Recommendation:** Use `React.lazy()` + `Suspense` for below-fold sections. Split into tab-based sections with dynamic imports.

### MAJ-02: No Responsive Breakpoint Testing
- **Details:** Components use Tailwind responsive classes inconsistently. Charts (Recharts) don't adapt to mobile widths — horizontal scrolling required. Share cards render at fixed desktop dimensions.
- **Recommendation:** Systematic mobile audit per component. Use `useMediaQuery` hook for chart dimension adaptation.

### MAJ-03: LandingDemo Component Complexity (411 LOC)
- **File:** `src/components/landing/LandingDemo.tsx` (411 LOC)
- **Details:** Complex interactive demo with hardcoded sample data, multiple state variables, and animation logic mixed with rendering.
- **Recommendation:** Extract sample data to constants file, separate animation logic into custom hook.

### MAJ-04: Spline 3D Scene Files (800KB+ Each)
- **Files:** `public/scene.splinecode`, `public/scene-2.splinecode`, `public/scene-3.splinecode`
- **Details:** Three Spline 3D scene files totaling ~2.4MB+ loaded for visual effects. Spline runtime adds additional JS bundle weight.
- **Recommendation:** Lazy load Spline only on desktop. Use static images/CSS gradients on mobile. Consider if 3D adds enough value vs. cost.

### MAJ-05: Chart Components Not Mobile-Optimized
- **Files:** `src/components/analysis/HeatmapChart.tsx`, `ComparisonTimeline.tsx`, `ResponseTimeChart.tsx`, `TimelineChart.tsx`
- **Details:** Recharts components render at fixed or desktop-optimized dimensions. Heatmap particularly problematic — 24×7 grid doesn't fit mobile screens.
- **Recommendation:** Use `ResponsiveContainer` consistently. Provide simplified mobile variants (e.g., daily summary instead of hourly heatmap).

### MAJ-06: No Loading Skeletons for Share Cards
- **Files:** `src/components/share-cards/*.tsx`
- **Details:** Share card gallery renders all 15+ cards eagerly. No skeleton states, no lazy rendering, no virtualization.
- **Recommendation:** Implement `IntersectionObserver`-based lazy rendering. Show skeleton placeholder until card scrolls into view.

### MAJ-07: Navigation Not Mobile-Friendly
- **File:** `src/components/shared/Navigation.tsx`
- **Details:** Desktop sidebar navigation doesn't collapse to a mobile-appropriate hamburger menu or bottom tab bar on small screens.
- **Recommendation:** Implement responsive navigation: sidebar on desktop, bottom tabs or hamburger on mobile.

### MAJ-08: Missing Error Boundaries on Chart Sections
- **Details:** Individual chart components lack error boundaries. A single chart rendering error can crash the entire analysis page.
- **Recommendation:** Wrap each major visualization section in an `ErrorBoundary` with a graceful fallback message.

### MAJ-09: Cookie Consent Banner May Overlap Content on Mobile
- **File:** `src/components/shared/CookieConsent.tsx`
- **Details:** Fixed-position cookie consent may overlap important content or CTAs on small viewports.
- **Recommendation:** Ensure cookie consent banner doesn't obscure critical UI elements. Test on 320px viewport.

### MAJ-10: SidebarContext Doesn't Persist Across Page Navigations
- **File:** `src/components/shared/SidebarContext.tsx`
- **Details:** Sidebar open/close state is managed via React context without persistence. State resets on full page refresh.
- **Recommendation:** Persist sidebar state to `localStorage`. Minor UX improvement.

---

## Minor Issues (10)

1. **MIN-01:** Some share card text overflows on narrow screens (PersonalityPassportCard, ReceiptCard)
2. **MIN-02:** Dark theme contrast ratios borderline on muted text (`#555555` on `#050505` = 2.5:1, below WCAG AA 4.5:1)
3. **MIN-03:** StoryIntro animation may stutter on mid-range devices
4. **MIN-04:** DropZone drag feedback not clearly visible on touch devices
5. **MIN-05:** Chart tooltip positioning can go off-screen on edge elements
6. **MIN-06:** Brand logo component doesn't scale down gracefully below 120px width
7. **MIN-07:** Some framer-motion animations don't respect `prefers-reduced-motion`
8. **MIN-08:** Export PDF button doesn't indicate processing state clearly
9. **MIN-09:** Missing `aria-label` on several icon-only buttons
10. **MIN-10:** WeekdayWeekendCard chart legend text too small on mobile

---

## Positive Findings

- **Strong visual design:** Dark theme is consistent and polished. Color system (blue/purple for participants) is well-applied.
- **Good component architecture:** shadcn/ui base with consistent customization patterns.
- **SSE progress indicators:** Real-time analysis progress feedback is excellent UX.
- **Share card system:** 15+ shareable cards is a strong viral feature.
- **Framer Motion animations:** Smooth entrance animations add polish.

---

## Recommendations Priority

| Priority | Action | Impact |
|----------|--------|--------|
| P0 | Fix CurtainReveal blocking + disable particles on mobile | Bounce rate reduction |
| P0 | Add focus traps to modals | Accessibility compliance |
| P1 | Code-split analysis page with lazy loading | 40-60% faster initial load |
| P1 | Make charts responsive with mobile variants | Mobile usability |
| P1 | Split WrappedPlayer into sub-components | Maintainability |
| P2 | Lazy load Spline 3D on desktop only | Bundle size reduction |
| P2 | Add error boundaries to chart sections | Stability |
| P3 | Fix contrast ratios on muted text | WCAG compliance |
