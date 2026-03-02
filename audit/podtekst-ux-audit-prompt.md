# PodTeksT — Comprehensive UX/UI Audit

## Context

You are auditing the UX/UI of PodTeksT, a Polish chat analysis application. Users upload exported conversations (Messenger, WhatsApp, Instagram, Telegram, Discord), the app parses them in the browser, calculates 80+ metrics, runs 4 AI passes via Gemini API, and presents results across 10+ sections with downloadable cards, badges, roasts, simulations, and more.

The app has a dark theme with purple/violet accent colors, HDR-optimized gradients, and heavy visual design. The target audience is Polish-speaking young adults (18-30) who want to analyze their chat dynamics — part serious psychology, part entertainment with uncensored humor.

This is a REAL product heading to market. The UX must be bulletproof for a user who has never seen the app before.

## Your Task

Go through EVERY page, component, layout, and user flow in the codebase. Analyze the full experience from landing page through analysis completion. Read the actual code — CSS, Tailwind classes, component structure, state management, routing, loading states, error handling.

## Audit Scope

### A. First-Time User Flow (Critical Path)

Trace the EXACT journey of a new user who knows nothing about the app:

1. **Landing page → Upload** — How many clicks/steps from landing to starting analysis? Is the CTA obvious? Is "upload your chat export" self-explanatory or does the user need to know what that means?
2. **Export instructions** — Does the app explain HOW to export chats from each platform? With screenshots? Step by step? This is the #1 drop-off point — if someone doesn't know how to export from Messenger, they leave.
3. **File upload → Parsing** — What feedback does the user get during parsing? Progress bar? Estimated time? What happens if parsing fails? What's the error message?
4. **Parsing → Analysis** — Transition from local parsing to AI analysis. Is it clear what's happening? How long does it take? Is there a loading state that communicates progress?
5. **Analysis → Results** — How are results presented? Is the user overwhelmed or guided? Is there a logical reading order?

Map every possible drop-off point and dead end in this flow.

### B. Information Architecture

1. **Navigation** — Bottom nav bar has: EMOCJE, ACR, KŁÓTNIA, AI DEEP DIVE, METRYKI, EKSPORT. Is this logical? Does a first-time user know what "ACR" means? What about "KŁÓTNIA" before they've seen results?
2. **Section hierarchy** — Are the 10+ sections prioritized? Which ones should the user see first? Is there a recommended reading order or is it a flat dump of everything?
3. **Content density** — Each section likely has charts, numbers, text, cards. How dense is each screen? Can a user scan and understand in 5 seconds or does it require deep reading?
4. **Labels and terminology** — Go through EVERY label, tooltip, section title, button text. Flag anything that:
   - Uses jargon without explanation (LSM, Gottman, Pursuit-Withdrawal)
   - Is ambiguous
   - Is inconsistent (same concept, different names in different places)
   - Is only in English when the app is Polish (or vice versa)

### C. Visual Design & Readability

1. **Contrast ratios** — The app uses dark theme with purple accents. Check EVERY text element against WCAG AA standards (4.5:1 for normal text, 3:1 for large text). Especially:
   - Subtitle/secondary text on dark backgrounds
   - Disabled states
   - Chart labels and axis text
   - Tooltip text
   - Card descriptions
2. **Non-HDR displays** — The design is optimized for HDR. How does it look on a standard sRGB display? Are there elements that become invisible or unreadable?
3. **Typography hierarchy** — Is there a clear visual hierarchy? Can you tell headings from body from captions at a glance?
4. **Color usage** — Are colors used consistently? Does red always mean "bad"? Green always "good"? What about colorblind users?
5. **Spacing and alignment** — Consistent padding, margins, grid alignment across all sections.

### D. Responsive Design & Mobile

1. **Mobile layout** — Go through every component and check mobile breakpoints. The app MUST work on phones — that's where most young adults will use it.
   - Does the bottom nav work on small screens?
   - Do charts/graphs scale properly?
   - Are cards readable on 375px width?
   - Can you tap targets easily (minimum 44x44px)?
   - Do modals/overlays work on mobile?
2. **Tablet** — Any layout breaking between 768px-1024px?
3. **Wide screens** — Does the layout handle 1440px+ gracefully or does it stretch awkwardly?
4. **Orientation** — Does landscape mode break anything?

### E. Loading, Error & Empty States

This is where most apps fall apart. Check EVERY async operation:

1. **Loading states:**
   - File upload progress
   - Parsing progress (can take 30+ seconds for large files)
   - AI analysis progress (4 passes — is each pass shown?)
   - Chart/component lazy loading
   - Are there skeleton loaders or just spinners?
   - Is there estimated time remaining?

2. **Error states:**
   - Invalid file format uploaded
   - Corrupted export file
   - File too large / too small
   - Gemini API failure (rate limit, timeout, server error)
   - Network loss during AI analysis
   - Browser runs out of memory (large chats)
   - IndexedDB storage full
   - Each error: Is the message helpful? Does it tell the user what to do next? Is it in Polish?

3. **Empty states:**
   - Section with no data (e.g., no reactions in the chat)
   - Metric that can't be calculated (insufficient data)
   - Search/filter with no results
   - New account with no analyses yet

4. **Edge case UX:**
   - What happens if user closes tab during analysis? Can they resume?
   - What if they navigate away and come back?
   - What if they upload a second chat while first is still analyzing?
   - What if the chat has only 10 messages? 100? 500,000?

### F. Interactive Elements

1. **Buttons** — Do all buttons have hover, active, disabled, and loading states? Are destructive actions (delete analysis) confirmed?
2. **Cards (22 downloadable formats)** — How do they generate? How long? Can user preview before downloading? File format and size?
3. **Charts and graphs** — Are they interactive? Tooltips on hover? Can you zoom? Are axes labeled? Are they accessible?
4. **Tabs/Sections** — Smooth transitions? State preserved when switching? Deep linking possible?
5. **Sharing flow** — How does link sharing work? What does the recipient see? Is there a preview? Does it work if recipient doesn't have an account?

### G. Performance UX

1. **Perceived performance** — Even if something takes 10 seconds, does it FEEL fast? Progressive loading? Optimistic UI?
2. **Animation budget** — List EVERY animation in the app. Flag any that:
   - Run continuously (not triggered by interaction)
   - Are purely decorative with no functional purpose
   - Cause layout shifts
   - Stack with other animations
   - Can't be disabled (accessibility: prefers-reduced-motion)
3. **Scroll performance** — Are there sections with heavy rendering that could cause jank during scroll?
4. **Memory** — Components that mount and never unmount? Event listeners that never clean up? This directly impacts UX on low-end devices.

### H. Accessibility

1. **Keyboard navigation** — Can you complete the entire flow without a mouse?
2. **Screen reader** — Are there proper aria labels, roles, alt texts?
3. **Focus management** — Is focus trapped in modals? Does it move logically?
4. **Reduced motion** — Does the app respect `prefers-reduced-motion`?
5. **Font sizing** — Does the app work with browser font size set to 150%?

### I. Copy & Microcopy

1. **Tone consistency** — The landing page is casual with swearing ("Bez marketingowego pierdolenia"). Does the rest of the app maintain this tone or does it suddenly switch to corporate-speak?
2. **Error messages** — Are they helpful and human, or generic "Something went wrong"?
3. **Empty states** — Do they guide the user or just say "No data"?
4. **Tooltips and explanations** — Are metric descriptions understandable to someone without a psychology degree?
5. **CTAs** — Are button labels action-oriented? "Generuj roast" vs "Roast" vs "Kliknij tutaj"?

### J. Trust & Transparency

1. **Privacy messaging** — Is the "your data stays with you" message visible at the right moments? (Upload screen, not just landing page)
2. **AI disclaimers** — Is it clear which results are AI-generated vs calculated? Is there a disclaimer that AI results are for entertainment?
3. **Metric confidence** — Do metrics show reliability indicators? Can the user tell which numbers are solid vs experimental?
4. **Premium vs Free** — Is the paywall clear? Does the user know what they get before paying? No dark patterns?

## Deliverables

### 1. `UX_AUDIT_REPORT.md`
For each issue found:
- **Component/Page** and file location
- **Screenshot description** or exact element reference
- **Issue** — what's wrong
- **Impact** — how it affects the user (confusion, drop-off, frustration, inaccessibility)
- **Severity** — CRITICAL (blocks usage) / HIGH (significant friction) / MEDIUM (suboptimal) / LOW (polish)
- **Fix** — specific, actionable recommendation

### 2. `USER_FLOW_MAP.md`
Complete flowchart of every user path through the app:
- Happy path (upload → analysis → results → share)
- Error paths
- Edge cases
- Drop-off points with severity ratings

### 3. `UX_IMPLEMENTATION_PLAN.md`
Prioritized fixes:
- Phase 1: Flow blockers and critical usability issues
- Phase 2: Missing states (loading, error, empty)
- Phase 3: Responsive/mobile fixes
- Phase 4: Accessibility
- Phase 5: Polish and microinteractions

## Rules

- Test every component. Don't assume anything works because it looks good in code.
- Think like a 20-year-old who just saw the app on TikTok and has 30 seconds of patience.
- Think like a 20-year-old on a 3-year-old Android phone with a cracked screen.
- If you can't determine something from code alone (e.g., actual render output), flag it as "NEEDS MANUAL TESTING" with specific test instructions.
- Polish language — every user-facing string must be in Polish and make sense. Flag any English leftovers, typos, or awkward phrasing.
- Be brutal. Pretty doesn't mean usable. Animations don't mean good UX. Dark theme doesn't mean readable.
