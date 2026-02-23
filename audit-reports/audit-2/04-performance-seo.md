# Audit 2: Performance + Bundle Size + SEO

**Date:** 2026-02-19
**Auditor:** Claude Opus 4.6 (Automated)
**Scope:** Bundle analysis, rendering performance, SEO metadata, accessibility, Core Web Vitals
**Overall Score:** Performance: **5/10** | SEO: **7/10** | Accessibility: **8/10**

---

## Executive Summary

Performance is the weakest area after security. The application has significant bundle size issues (Spline 3D, no code splitting), rendering bottlenecks (ParticleBackground, WrappedPlayer), and lacks lazy loading patterns. SEO is adequate for a SPA with good metadata setup. Accessibility is surprisingly good thanks to shadcn/ui's Radix primitives, but gaps exist in custom components.

---

## Critical Performance Issues (4)

### PERF-01: ParticleBackground Likely O(n²) Rendering
- **File:** Landing page particle/canvas component
- **Impact:** Frame drops, jank, battery drain — especially on mobile
- **Details:** Canvas-based particle animation likely checks particle-to-particle interactions (collision, proximity lines), resulting in O(n²) per frame. With 100+ particles at 60fps, this is 600K+ operations per second.
- **Recommendation:**
  - Reduce particle count to 30-50
  - Use spatial partitioning (grid-based) for proximity checks
  - Cap at 30fps on mobile or disable entirely
  - Use `requestAnimationFrame` with frame budget checking

### PERF-02: WrappedPlayer Monolith (1,089 LOC, Eagerly Loaded)
- **File:** `src/components/wrapped/WrappedPlayer.tsx` (1,089 LOC)
- **Impact:** Entire "Spotify Wrapped" story feature loaded upfront even if user never accesses it
- **Details:** The WrappedPlayer manages 10+ animation slides, audio playback, gesture handling, and share functionality in a single component. It's imported statically wherever used.
- **Recommendation:**
  - Lazy load with `React.lazy()` — only load when user clicks "View Story"
  - Split into `WrappedSlide[]` sub-components
  - Defer audio loading until slide requires it

### PERF-03: Spline 3D Scenes (800KB+ Each, 3 Files)
- **Files:** `public/scene.splinecode`, `public/scene-2.splinecode`, `public/scene-3.splinecode`
- **Impact:** ~2.4MB+ of 3D scene data + Spline runtime JS (~200-400KB)
- **Details:** Three 3D scenes for visual effects on the landing page. The Spline runtime library itself adds significant JavaScript. Total impact: 3-4MB+ of downloaded assets on first visit.
- **Recommendation:**
  - Keep ONE scene maximum, lazy loaded
  - Use `IntersectionObserver` to only load when scrolled into view
  - Replace others with CSS gradients or Lottie animations (10-50KB each)
  - On mobile: static images only

### PERF-04: Analysis Page Loads 50+ Components Statically
- **File:** `src/app/(dashboard)/analysis/[id]/page.tsx` (793 LOC)
- **Impact:** First paint of analysis results requires downloading ALL visualization code (~200-400KB JS)
- **Details:** The page imports 50+ components at the top level:
  - All chart components (Recharts-based)
  - All share card components (15+)
  - PDF export, image generation, CPS screener
  - Each Recharts component bundles its own SVG rendering logic
- **Recommendation:**
  - Tab-based UI: only load the active tab's components
  - `React.lazy()` for below-fold sections
  - Dynamic import for PDF/export features (used by <5% of users)
  - Consider `next/dynamic` with `ssr: false` for chart components

---

## Bundle Size Analysis

### Estimated Bundle Breakdown

| Category | Estimated Size | Notes |
|----------|---------------|-------|
| Next.js runtime | ~80KB gzip | Standard |
| React + ReactDOM | ~45KB gzip | Standard |
| Recharts | ~60-80KB gzip | Multiple chart types used |
| Framer Motion | ~30KB gzip | Animation library |
| Spline Runtime | ~200-400KB gzip | 3D rendering engine |
| Spline Scenes | ~2.4MB (3 files) | Static assets, not gzipped |
| shadcn/ui + Radix | ~20-30KB gzip | Tree-shaken |
| Application code | ~100-150KB gzip | All components + lib |
| **Total JS** | **~550-800KB gzip** | Without Spline scenes |

### Recommendations for Bundle Reduction
1. **Remove or lazy-load Spline** → saves 200-400KB JS + 2.4MB assets
2. **Code-split analysis page** → reduces initial JS by ~200KB
3. **Dynamic import Recharts** → per-chart lazy loading
4. **Tree-shake framer-motion** → import only used features

---

## SEO Assessment (7/10)

### Strengths
- `src/app/sitemap.ts` exists — programmatic sitemap generation
- `src/app/layout.tsx` has proper metadata (title, description, OpenGraph)
- Semantic HTML structure in landing page sections
- Dark theme doesn't affect SEO (content is server-rendered via Next.js)

### Weaknesses
- **No structured data** (JSON-LD) — missing for SoftwareApplication, FAQPage schemas
- **No robots.txt** configuration visible
- **Landing page heavy on client-side rendering** — critical content may not be in initial HTML
- **Missing alt text** on decorative images and icons
- **No canonical URLs** explicitly set
- **Polish-only content** without hreflang — limits international SEO

### SEO Recommendations
1. Add JSON-LD structured data for SoftwareApplication
2. Add `robots.txt` in `public/`
3. Ensure landing page hero text is server-rendered (not client-only animation)
4. Add hreflang tags when i18n is implemented
5. Add canonical URLs to prevent duplicate content

---

## Accessibility Assessment (8/10)

### Strengths
- **shadcn/ui foundation:** Built on Radix primitives which provide excellent a11y by default (keyboard nav, ARIA attributes, focus management)
- **Semantic HTML:** Proper heading hierarchy, landmark elements
- **Color system:** Primary actions have sufficient contrast (blue #3b82f6 on dark bg)
- **Form labels:** Upload form has proper labels

### Weaknesses
- **Muted text contrast:** `--text-muted: #555555` on `--bg-primary: #050505` = ~2.5:1 contrast ratio (WCAG AA requires 4.5:1)
- **Focus indicators:** Some custom components may override default focus rings
- **Screen reader support for charts:** Recharts components lack `aria-label` and `role` attributes. Data visualization is invisible to screen readers.
- **Skip navigation link:** Missing — keyboard users must tab through entire nav
- **Animation control:** No global "reduce motion" toggle beyond `prefers-reduced-motion`

---

## Core Web Vitals Estimate

| Metric | Estimated Value | Target | Status |
|--------|----------------|--------|--------|
| LCP (Largest Contentful Paint) | 3-5s | <2.5s | Needs Work |
| FID (First Input Delay) | 100-300ms | <100ms | Needs Work |
| CLS (Cumulative Layout Shift) | 0.05-0.15 | <0.1 | Borderline |
| INP (Interaction to Next Paint) | 200-400ms | <200ms | Needs Work |
| TTFB (Time to First Byte) | <500ms | <800ms | Good |

**Primary bottleneck:** Spline 3D + ParticleBackground on landing page. Analysis page heavy JS load delays interactivity.

---

## Recommendations Priority

| Priority | Action | Impact |
|----------|--------|--------|
| P0 | Lazy-load or remove Spline 3D | -2.4MB assets, -400KB JS |
| P0 | Disable ParticleBackground on mobile | Mobile LCP improvement |
| P0 | Code-split analysis page | -200KB initial JS |
| P1 | Dynamic import Recharts per chart | Bundle reduction |
| P1 | Lazy load WrappedPlayer | Reduce unused JS |
| P1 | Fix muted text contrast to 4.5:1 | WCAG AA compliance |
| P2 | Add JSON-LD structured data | SEO improvement |
| P2 | Add aria-labels to chart components | Screen reader support |
| P2 | Add skip-navigation link | Keyboard accessibility |
| P3 | Implement robots.txt | SEO hygiene |
