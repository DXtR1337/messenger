# Design Doc: 4 Viral Features — PodTeksT Faza 20

**Data:** 2026-02-19
**Autor:** Claude Opus 4.6
**Status:** Draft — awaiting approval

---

## Scope

4 nowe, niezależne features entertainment-first:

1. **Stawiam Zakład** — quiz samoświadomości + Delusion Index
2. **Symulator Odpowiedzi** — AI odpowiada jak druga osoba
3. **Twój Chat w Sądzie** — akt oskarżenia + wyrok + mugshot card
4. **Szczery Profil Randkowy** — brutally honest Tinder/Hinge card

Każda feature = osobny przycisk w sekcji analizy, osobny share card, niezależna od pozostałych.

---

## Feature 1: Stawiam Zakład (Delusion Quiz)

### Opis
15 pytań o własną rozmowę. Użytkownik obstawia odpowiedzi. System ujawnia prawdziwe dane z analizy kwantytatywnej. Na końcu: Self-Awareness Score (x/15) + Delusion Index (0-100).

### Architektura
- **Zero AI** — 100% client-side z istniejących danych `QuantitativeAnalysis`
- **Nowy komponent:** `src/components/analysis/DelusionQuiz.tsx`
- **Nowy share card:** `src/components/share-cards/DelusionCard.tsx`
- **Nowe typy:** `DelusionQuizResult` w `types.ts`
- **Nowa funkcja:** `computeDelusionQuiz()` w `src/lib/analysis/delusion-quiz.ts`
- **Persystencja:** Zapisywane w `StoredAnalysis.qualitative` jako nowe pole `delusionQuiz`

### Pytania (15, z istniejących metryk)
| # | Pytanie | Dane źródłowe | Format odpowiedzi |
|---|---|---|---|
| 1 | Kto wysyła więcej wiadomości? | `perPerson[x].totalMessages` | Pick A/B |
| 2 | Ile wynosi twój średni czas odpowiedzi? | `timing.perPerson[x].medianResponseTimeMs` | <5min / 5-30min / 30min-2h / 2h+ |
| 3 | Kto pisze dłuższe wiadomości? | `perPerson[x].averageMessageLength` | Pick A/B |
| 4 | Kto częściej inicjuje rozmowę? | `timing.conversationInitiations` | Pick A/B |
| 5 | Kto używa więcej emoji? | `perPerson[x].emojiCount` | Pick A/B |
| 6 | Ile procent rozmów zaczynasz ty? | `timing.conversationInitiations` | <30% / ~50% / >70% |
| 7 | Kto częściej double-textuje? | `engagement.doubleTexts` | Pick A/B |
| 8 | O której godzinie jesteś najbardziej aktywny/a? | heatmap peak hour | Morning/Afternoon/Evening/Night |
| 9 | Jak długo trwała najdłuższa cisza? | `timing.longestSilence.durationMs` | <1d / 1-3d / 3-7d / 7d+ |
| 10 | Kto odpowiada szybciej? | `timing.perPerson[x].medianResponseTimeMs` | Pick A/B |
| 11 | Ile wiadomości wysłaliście łącznie? | `metadata.totalMessages` | <1k / 1-5k / 5-20k / 20k+ |
| 12 | Kto wysyła więcej wiadomości w nocy (po 22)? | `perPerson[x].lateNightMessages` | Pick A/B |
| 13 | Jaki jest wasz Compatibility Score? | `viralScores.compatibilityScore` | <30 / 30-60 / 60-80 / 80+ |
| 14 | Kto daje więcej reakcji? | `perPerson[x].reactionsGiven` | Pick A/B |
| 15 | Czy rozmowa się rozwija czy zanika? | `patterns.volumeTrend` | Rozwija / Stabilna / Zanika |

### UI Flow
1. **Intro screen** — "Stawiam Zakład — sprawdź czy znasz swoją rozmowę" + Start button
2. **Card stack** — każde pytanie jako swipeable card (Framer Motion)
   - Pytanie na górze
   - Opcje odpowiedzi jako przyciski
   - Po wyborze: animacja reveal (flip card) z prawdziwą odpowiedzią
   - Zielony check / czerwony X + witty one-liner
   - Auto-advance po 2s
3. **Results screen** — Self-Awareness Score (x/15) + Delusion Index (0-100) + lista odpowiedzi
4. **Share card** — DelusionCard.tsx (360x640, styl share card)

### Delusion Index Calculation
```
delusionIndex = 100 - (correctAnswers / totalQuestions * 100)
// Bonus: ważone — pytania o siebie samego liczą się podwójnie
```

### Share Card Design
- Gradient: fioletowo-różowy (delusion = ego = warm tones)
- Główny element: okrągły gauge z wynikiem Delusion Index
- Poniżej: "Self-Awareness: X/15"
- Label: "BAZOWANY" (0-20), "REALISTA" (20-40), "LEKKO ODJECHANY" (40-60), "TOTAL DELULU" (60-80), "POZA RZECZYWISTOŚCIĄ" (80-100)

---

## Feature 2: Symulator Odpowiedzi (Reply Simulator)

### Opis
Użytkownik wpisuje wiadomość, AI generuje odpowiedź w stylu drugiej osoby (na podstawie jej prawdziwych wzorców komunikacji). Max 5 wymian. Na końcu: Prediction Confidence + share card.

### Architektura
- **AI-powered:** Nowy SSE endpoint `/api/analyze/simulate`
- **Nowy komponent:** `src/components/analysis/ReplySimulator.tsx`
- **Nowy share card:** `src/components/share-cards/SimulatorCard.tsx`
- **Nowy prompt:** `simulateReplyPrompt()` w `prompts.ts`
- **Nowa funkcja:** `runReplySimulation()` w `gemini.ts`
- **Nowe typy:** `SimulationResult`, `SimulationExchange` w `types.ts`
- **Walidacja:** Zod schema w `schemas.ts`

### API Endpoint: `/api/analyze/simulate`
```
POST /api/analyze/simulate
Body: {
  userMessage: string,
  targetPerson: string,
  participants: string[],
  samples: AnalysisSamples,
  quantitativeContext: string,
  previousExchanges?: SimulationExchange[],
  personalityProfile?: PersonProfile
}
Response: SSE stream
  { type: 'typing', delay: number }  // realistic typing delay
  { type: 'reply', message: string, confidence: number }
  { type: 'meta', responseTimeEstimate: string, styleNotes: string }
```

### Prompt Strategy
System prompt zawiera:
- Top 50 najpopularniejszych fraz osoby (`topWords`, `topPhrases`)
- Średnia długość wiadomości + styl (krótki/długi)
- Profil emoji (top emoji + częstotliwość)
- Styl komunikacji z Pass 3 (jeśli dostępny)
- Big Five + MBTI (jeśli dostępny)
- 20-30 przykładowych wiadomości tej osoby (z samples)
- Instrukcja: "Odpowiedz DOKŁADNIE tak jak ta osoba — jej słownictwem, długością, stylem emoji, interpunkcją"

### UI Flow
1. **Wybór osoby** — "Kogo chcesz zasymulować?" (dropdown z participants)
2. **Chat interface** — wygląda jak Messenger/WhatsApp
   - Typing indicator z realnym delay (median response time / 60 — żeby nie czekać za długo)
   - Wiadomość pojawia się z animacją
   - Timestamp: "odpowiedział/a w ~X min (mediana z danych)"
3. **Max 5 wymian** — po 5. pojawia się summary
4. **Summary** — "Ta symulacja bazowała na X wiadomościach" + Confidence Score
5. **Share card** — screenshot rozmowy

### Ograniczenia
- Max 5 wymian per sesja (koszt API)
- Max 200 znaków per wiadomość użytkownika
- Rate limit: 5 symulacji / 10 min (jak inne endpointy)
- Wymaga min. 500 wiadomości od target person (do nauki stylu)

---

## Feature 3: Twój Chat w Sądzie (Chat Court)

### Opis
AI analizuje rozmowę i generuje pełny "proces sądowy": zarzuty, dowody, obronę, wyrok + karę. Każda osoba dostaje mugshot card z wyrokiem.

### Architektura
- **AI-powered:** Nowy SSE endpoint `/api/analyze/court`
- **Nowy komponent:** `src/components/analysis/ChatCourtButton.tsx`
- **Nowy komponent:** `src/components/analysis/CourtVerdict.tsx` (wyświetlanie wyników)
- **Nowy share card:** `src/components/share-cards/MugshotCard.tsx`
- **Nowy prompt:** `courtTrialPrompt()` w `prompts.ts`
- **Nowa funkcja:** `runCourtTrial()` w `gemini.ts`
- **Nowe typy:** `CourtResult` w `types.ts`

### API Endpoint: `/api/analyze/court`
```
POST /api/analyze/court
Body: {
  participants: string[],
  samples: AnalysisSamples,
  quantitativeContext: string,
  existingAnalysis?: { pass1, pass2, pass4 }  // optional context from prior AI
}
Response: SSE stream
  { type: 'progress', status: 'Przygotowuję akt oskarżenia...' }
  { type: 'complete', result: CourtResult }
```

### CourtResult Type
```typescript
interface CourtResult {
  caseNumber: string;           // "SPRAWA NR PT-2026/02/4872"
  courtName: string;            // "Sąd Okręgowy ds. Emocjonalnych"
  charges: CourtCharge[];       // 2-4 charges
  prosecution: string;          // Mowa oskarżyciela (paragraph)
  defense: string;              // Mowa obrońcy (paragraph)
  verdict: CourtVerdict;        // Wyrok
  perPerson: Record<string, PersonVerdict>;
}

interface CourtCharge {
  id: string;
  charge: string;               // "Ghosting w Pierwszym Stopniu"
  article: string;              // "Art. 47 § 2 Kodeksu Uczuciowego"
  severity: 'wykroczenie' | 'występek' | 'zbrodnia';
  evidence: string[];           // Cytaty + metryki jako dowody
  defendant: string;            // Kto jest oskarżony
}

interface PersonVerdict {
  name: string;
  verdict: 'winny' | 'niewinny' | 'warunkowo';
  mainCharge: string;
  sentence: string;             // "6 miesięcy terapii par"
  mugshotLabel: string;         // Label na mugshot card
  funFact: string;              // Zabawny fakt z danych
}
```

### Prompt Strategy
- Zarzuty bazują na: red flags (Pass 2/4), ghosting patterns, double-texting, power imbalance, emotional labor asymmetry
- Kategorie zarzutów: Ghosting, Breadcrumbing, Love Bombing, Emotional Negligence, Passive Aggression, Double Standards, Serial Double-Texting, Nocturnal Harassment (3 AM texts)
- Styl: formalny język prawniczy ale z absurdalnym kontekstem
- Dowody: konkretne cytaty z wiadomości + metryki liczbowe

### Mugshot Card Design
- Gradient: ciemny, policyjny (navy/black)
- Górna część: "SĄD OKRĘGOWY DS. EMOCJONALNYCH" header
- Imię osoby bold
- "ZARZUT: [charge]"
- "WYROK: [verdict]"
- "KARA: [sentence]"
- Numer sprawy na dole
- Rozmiar: 360x640 (standard share card)

---

## Feature 4: Szczery Profil Randkowy (Honest Dating Profile)

### Opis
AI generuje profil randkowy w stylu Tinder/Hinge — ale brutalnie szczery, bazujący na prawdziwych danych o komunikacji. Każda osoba w rozmowie dostaje swój profil.

### Architektura
- **AI-powered:** Nowy SSE endpoint `/api/analyze/dating-profile`
- **Nowy komponent:** `src/components/analysis/DatingProfileButton.tsx`
- **Nowy komponent:** `src/components/analysis/DatingProfileResult.tsx`
- **Nowy share card:** `src/components/share-cards/DatingProfileCard.tsx`
- **Nowy prompt:** `datingProfilePrompt()` w `prompts.ts`
- **Nowa funkcja:** `runDatingProfile()` w `gemini.ts`
- **Nowe typy:** `DatingProfileResult` w `types.ts`

### API Endpoint: `/api/analyze/dating-profile`
```
POST /api/analyze/dating-profile
Body: {
  participants: string[],
  samples: AnalysisSamples,
  quantitativeContext: string,
  existingAnalysis?: { pass1, pass3 }  // personality data if available
}
Response: SSE stream
  { type: 'progress', status: 'Tworzę szczere profile...' }
  { type: 'complete', result: DatingProfileResult }
```

### DatingProfileResult Type
```typescript
interface DatingProfileResult {
  profiles: Record<string, PersonDatingProfile>;
}

interface PersonDatingProfile {
  name: string;
  age_vibe: string;              // "Zachowuje się jak 22-latek w kryzysie"
  bio: string;                   // 2-3 zdania w ICH stylu pisania
  stats: DatingProfileStat[];    // 5-6 brutally honest stats
  prompts: DatingProfilePrompt[]; // 3 "honest prompts" w stylu Hinge
  red_flags: string[];           // 2-3 red flags z danych
  green_flags: string[];         // 2-3 green flags z danych
  match_prediction: string;      // "Pasuje do: osób które lubią czekać"
  dealbreaker: string;           // "Dealbreaker: nie odpisuje weekendami"
  overall_rating: string;        // "⭐⭐⭐ 3/5 — Would Match But Mute"
}

interface DatingProfileStat {
  label: string;                 // "Czas odpowiedzi"
  value: string;                 // "47 min (ale przy jedzeniu: 14 sek)"
  emoji: string;                 // "⏱️"
}

interface DatingProfilePrompt {
  prompt: string;                // "Mój love language to..."
  answer: string;                // "...zostawianie na czytaniu na 3 godziny"
}
```

### Prompt Strategy
- Bio napisane w STYLU pisania danej osoby (ich słownictwo, interpunkcja, emoji)
- Stats łączą prawdziwe metryki z roast-style komentarzem
- Prompty w stylu Hinge ale brutally honest:
  - "Mój love language to..."
  - "Największy green flag jaki mam..."
  - "Nie dogadamy się jeśli..."
  - "W weekendy znajdziesz mnie..."
  - "Guilty pleasure w pisaniu to..."
- Red/green flags z danych kwantytatywnych (nie AI — ghosting patterns, response time consistency, initiation balance)
- Match prediction bazowany na attachment style + communication needs

### Dating Profile Card Design
- Wygląd: mockup ekranu Tinder/Hinge (zaokrąglone rogi, swipe feel)
- Gradient: ciepły (pink/coral — dating app vibes)
- Imię + "age vibe" na górze
- Bio sekcja
- Stats jako ikonki z liczbami
- 2 prompt cards
- Rating na dole (stars)
- Rozmiar: 360x640 (standard)
- Opcja: toggle między osobami (tabs)

---

## Wspólne wzorce

### Persystencja
Wszystkie wyniki zapisywane w `StoredAnalysis.qualitative`:
```typescript
// Dodać do QualitativeAnalysis:
delusionQuiz?: DelusionQuizResult;
courtTrial?: CourtResult;
datingProfile?: DatingProfileResult;
// replySimulation NIE jest persystowane (ephemeral)
```

### Nowe Share Cards
Dodać do `CARD_CONFIGS` w `ShareCardGallery.tsx`:
```typescript
{ id: 'delusion', title: 'Deluzja', emoji: '🤡', requiresQualitative: false },
{ id: 'mugshot', title: 'Mugshot', emoji: '⚖️', requiresQualitative: false, requiresCourt: true },
{ id: 'dating-profile', title: 'Profil randkowy', emoji: '💘', requiresQualitative: false, requiresDatingProfile: true },
{ id: 'simulator', title: 'Symulacja', emoji: '🤖', requiresQualitative: false, requiresSimulation: true },
```

### Przyciski w sekcji analizy
Każda feature = nowa sekcja z SectionDivider w `[id]/page.tsx`:
- Stawiam Zakład: po sekcji Viral Scores (sekcja 06)
- Symulator/Sąd/Dating: po sekcji AI Analysis (sekcja 11)

### Analytics Events
```typescript
// Nowe eventy w events.ts:
{ name: 'delusion_quiz_start' }
{ name: 'delusion_quiz_complete', params: { score, delusionIndex } }
{ name: 'reply_simulator_start', params: { targetPerson } }
{ name: 'reply_simulator_exchange', params: { exchangeNumber } }
{ name: 'court_trial_start' }
{ name: 'court_trial_complete' }
{ name: 'dating_profile_start' }
{ name: 'dating_profile_complete' }
```

---

## Kolejność implementacji

| Fala | Feature | Effort | AI? | Blokuje? |
|---|---|---|---|---|
| 1 | Stawiam Zakład | ~1 dzień | NIE | Nic |
| 2 | Szczery Profil Randkowy | ~1-2 dni | TAK | Nic |
| 2 | Twój Chat w Sądzie | ~1-2 dni | TAK | Nic |
| 3 | Symulator Odpowiedzi | ~2-3 dni | TAK | Nic |

Fala 1 i 2 mogą być budowane równolegle przez osobnych agentów.
Fala 3 (Symulator) jest najbardziej złożona — UI chatowy + streaming per-wymiana.

---

## Struktura agentów (team)

4 agenci, 1 koordynator:

1. **agent-quiz** — Stawiam Zakład (client-side only)
   - `delusion-quiz.ts` + `DelusionQuiz.tsx` + `DelusionCard.tsx`
   - Integracja z `[id]/page.tsx`

2. **agent-court** — Twój Chat w Sądzie (API + frontend)
   - `/api/analyze/court/route.ts` + prompt + `CourtVerdict.tsx` + `MugshotCard.tsx`
   - Integracja z `[id]/page.tsx`

3. **agent-dating** — Szczery Profil Randkowy (API + frontend)
   - `/api/analyze/dating-profile/route.ts` + prompt + `DatingProfileResult.tsx` + `DatingProfileCard.tsx`
   - Integracja z `[id]/page.tsx`

4. **agent-simulator** — Symulator Odpowiedzi (API + frontend)
   - `/api/analyze/simulate/route.ts` + prompt + `ReplySimulator.tsx` + `SimulatorCard.tsx`
   - Integracja z `[id]/page.tsx`

Koordynator: pilnuje typów (`types.ts`), share card gallery, i page integration.

---

## Ryzyka

1. **Merge conflicts** — 4 agentów edytuje `types.ts`, `page.tsx`, `ShareCardGallery.tsx`
   - Mitygacja: koordynator integruje zmiany w tych shared files
2. **Prompt quality** — zarzuty/profile mogą być generic
   - Mitygacja: użyć konkretnych cytatów i liczb w promptach
3. **Simulator voice accuracy** — trudno odwzorować styl pisania
   - Mitygacja: duży context window z przykładami, iteracyjne testowanie
4. **Rate limits** — 3 nowe endpointy AI = więcej calls
   - Mitygacja: niezależne rate limiting per endpoint
