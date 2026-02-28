# Immersive Modes Upgrade — Design Document

**Date:** 2026-02-26
**Branch:** redesign/immersive-dashboard

## Goal

Upgrade all 16 analysis mode pages with:
1. Ambient video backgrounds
2. Improved AI prompts (more content, more specific, data-driven)
3. AI-generated images inline (Gemini image gen)

## Architecture

Three independent layers, each deployable separately:

### Layer 1: Ambient Video on All Mode Pages

Add `VideoBackground` component to 13 pages that lack it.

**Component:** `src/components/shared/VideoBackground.tsx`
- Looping video, low opacity (10-15%)
- `preload="none"`, pauses on hidden tab
- Poster image fallback

**Mapping:**

| Page | Video File | Status |
|------|-----------|--------|
| standup | standup.mp4 | DONE |
| ai | ai.mp4 | DONE |
| metrics | metrics.mp4 | DONE |
| court | court.mp4 | TODO |
| roast | roast.mp4 | TODO |
| subtext | subtext.mp4 | TODO |
| dating | dating.mp4 | TODO |
| simulator | simulator.mp4 | TODO |
| delusion | delusion.mp4 | TODO |
| cps | cps.mp4 | TODO |
| moral | moral.mp4 | TODO |
| emotions | emotions.mp4 | TODO |
| capitalization | capitalization.mp4 | TODO |
| share | share.mp4 | TODO |
| couple | TBD | TODO |

**Implementation:** Each page wraps content in a container with `VideoBackground` as first child + gradient overlay div.

---

### Layer 2: Improved AI Prompts

#### Standup (`STANDUP_ROAST_SYSTEM` in prompts.ts)
- **Acts:** 7 → 10 (add: "Social Media Audit", "Voice Messages Tribunal", "Screenshot Gallery")
- **Punchlines:** 4-6 → 6-10 per act
- **Mandatory callbacks:** every act after 3rd must reference ≥1 earlier act
- **Crowdwork:** address participants by name directly
- **Data anchoring:** every punchline MUST cite a specific stat or quote from chat
- **Update `StandUpRoastResult` type** to accommodate 10 acts

#### Court (`COURT_TRIAL_SYSTEM` in court-prompts.ts)
- **Witness testimony scene:** chat quotes presented as sworn testimony
- **Longer closing arguments:** prosecution + defense more dramatic
- **More charges:** 3-6 → 5-8 per defendant
- **Prosecutor questions:** rhetorical questions directed at defendants
- **Creative sentences:** more absurd, specific punishments
- **Update `CourtResult` type** if new fields needed

#### Enhanced Roast (`ENHANCED_ROAST_SYSTEM` in prompts.ts)
- **Rounds structure:** 3 rounds (Warm-Up, Main Event, Finish Him)
- **More roasts:** 6-8 → 10-12 per person
- **More superlatives:** 3 → 6+ with longer descriptions
- **Data weaponization:** every roast cites a specific number from quant analysis
- **Update `RoastResult` type** for rounds structure

---

### Layer 3: AI-Generated Images

Use existing `/api/analyze/image` endpoint (Gemini image gen).

| Page | Image Type | Trigger | Cache |
|------|-----------|---------|-------|
| court | Mugshot portrait with booking plate | After verdict generation | analysis context |
| standup | Comedy show marquee poster | On intro scene | analysis context |
| roast | UFC-style fight card poster | On arena entrance | analysis context |
| dating | Caricature dating profile photo | After profile generation | analysis context |

**Implementation per page:**
1. "Generate Image" button (optional, user-triggered)
2. Call `/api/analyze/image` with mode-specific prompt + participant data
3. Display inline with loading skeleton
4. Cache in analysis context (StoredAnalysis) to avoid re-generation

---

## Files to Modify

### Layer 1 (Video)
- 13 page.tsx files under `src/app/(dashboard)/analysis/[id]/*/page.tsx`
- Possibly `globals.css` for per-mode gradient overlays

### Layer 2 (Prompts)
- `src/lib/analysis/prompts.ts` — STANDUP_ROAST_SYSTEM, ENHANCED_ROAST_SYSTEM
- `src/lib/analysis/court-prompts.ts` — COURT_TRIAL_SYSTEM
- `src/lib/analysis/types.ts` — update result types if needed
- Corresponding page components to render new fields

### Layer 3 (Images)
- Mode page components (court, standup, roast, dating)
- Possibly new hook: `useModeImage.ts` for shared image generation logic
- `src/lib/analysis/types.ts` — add image cache fields to StoredAnalysis

---

## Verification

- `npx vitest run` — all tests pass
- `npx tsc --noEmit` — no new type errors
- Manual: each mode page loads without crash
- Manual: AI generation produces richer, more specific results
- Manual: images generate and display correctly
