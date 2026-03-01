# PodTeksT — Plan Dopieszczania 🔧

> Żadnych nowych feature'ów. Tylko polerowanie tego co jest, żeby było najlepsze możliwe.
> Priorytet: wiarygodność wyników → czystość kodu → UX → wydajność.

---

## Status weryfikacji (2026-02-26)

| Zadanie | Status | Uwagi |
|---------|--------|-------|
| 1.1 Gottman rename | ✅ ZROBIONE | "Wzorce Ryzyka Komunikacyjnego" + podtytuł SPAFF + softened riskLevel labels |
| 1.2 Konsolidacja percentyli | ✅ ZROBIONE | Oba systemy zachowane (różne UI), "TOP X%" → "Lepszy niż ~X%", disclaimers dodane |
| 1.3 Ghost Risk default 0 | ✅ ZROBIONE | Już zwraca score:0 dla <3 mies. |
| 1.4 Health Score claim | ✅ ZROBIONE | Komentarz "heuristic, not empirically derived" + cytaty |
| 1.5 VersusCard labels | ✅ ZROBIONE | Simp→Fan, Clingy→Energiczny, Overthinker→Pisarz |
| 1.6 Subtext false positives | ✅ ZROBIONE | Delay 2h ✅. Passive markers >15% → reduced score. Ellipsis >10% → reduced score. |
| 1.7 Damage Report decouple | ✅ ZROBIONE | 100% quantitative: sentiment+conflict+reciprocity+RT asymmetry+volume decline |
| 2.1 Gemini DRY | ✅ ZROBIONE | simulator-prompts.ts deduplicated (court/dating already clean) |
| 2.2 Min sample size | ✅ ZROBIONE | Intimacy: 100 msg min. Catchphrases: 50/person. Pronouns: 200 words (already). Tests updated. |
| 2.3 CPS thresholds | ✅ ZROBIONE | CPSFrequencyLevel type + getPatternFrequency() — percentage-based |
| 2.4 Sentiment expansion | ❌ DO ZROBIENIA | |
| 3.1-3.5 Disclaimery | ✅ ZROBIONE | Footer na hub + ModePageShell. ThreatMeters subtitle. DamageReport rename. |
| 3.4 Threat Meters header | ✅ ZROBIONE | "Wskaźniki Dynamiki" + podtytuł "nie ocena psychologiczna" |
| 4.1 Low message warning | ✅ ZROBIONE | Banner na hub page dla <200 wiadomości |
| 4.2 Empty states | ✅ ZROBIONE | 6 components fixed (LSM, Pronoun, IC, TemporalFocus, Repair, Capitalization). 4 already safe. |

---

## Zasada: każdy fix = lepszy produkt bez nowych komplikacji

Podzieliłem wszystko na **5 bloków** od najważniejszego. Przy każdym zadaniu podaję:
- **Plik(i)** do zmiany
- **Co dokładnie zrobić** (nie "rozważ" — konkretna zmiana)
- **Czas** (realny, nie optymistyczny)
- **Wpływ** na użytkownika

---

## BLOK 1: Wiarygodność wyników (3-4 dni)
*Największy wpływ na jakość. Użytkownicy widzą te wyniki i muszą im ufać.*

### 1.1 Gottman Horsemen — rename + disclaimer ⚠️ CRITICAL
**Pliki:** `gottman-horsemen.ts`, `GottmanHorsemen.tsx`
**Problem:** Nazywanie modułu "Czterej Jeźdźcy Gottmana" implikuje walidowaną metodologię SPAFF. Mapowanie CPS→Gottman jest heurystyczne i nie odpowiada oryginalnym konstruktom.
**Zmiana:**
- Zmienić nagłówek z "Czterej Jeźdźcy Gottmana" na **"Wzorce Ryzyka Komunikacyjnego"** (inspirowane Gottmanem)
- Zachować emoji i 4 kategorie (Krytycyzm, Pogarda, Defensywność, Stonewalling) — nazwy są rozpoznawalne
- Dodać podtytuł: *"Heurystyczna analiza inspirowana badaniami Gottmana — nie zastępuje metody obserwacyjnej SPAFF"*
- `GOTTMAN_DISCLAIMER` już istnieje — upewnić się że jest widoczny, nie ukryty na dole
- Zmienić `riskLevel` labels: "Krytyczny — wszystkie 4 jeźdźce" → "Podwyższone ryzyko we wszystkich 4 obszarach"
**Czas:** 1-2h
**Wpływ:** Eliminuje najpoważniejsze ryzyko psychometryczne — fałszywe roszczenie kliniczne

### 1.2 Konsolidacja dwóch systemów percentyli ⚠️ CRITICAL
**Pliki:** `ranking-percentiles.ts`, `percentiles.ts`, + komponenty UI które je konsumują
**Problem:** Dwa niezależne systemy (log-normal CDF vs step-function) mogą dawać sprzeczne wyniki dla tych samych danych.
**Zmiana:**
1. Najpierw zmapować: który komponent UI używa którego systemu
   - `RankingBadges.tsx` → `ranking-percentiles.ts` (TOP X% badges)
   - Szukać importów `percentiles.ts` → prawdopodobnie KPI cards
2. Wybrać JEDEN system — rekomendacja: **zachować step-function** (`percentiles.ts`) bo jest prostszy i łatwiejszy do ręcznej kalibracji. Usunąć `ranking-percentiles.ts`.
3. Przerobić `RankingBadges.tsx` żeby korzystał z `percentiles.ts`
4. Dodać komentarz: "Progi heurystyczne — nie oparte na danych populacyjnych"
5. Na UI: zmienić "TOP 5%" na **"Lepszy niż ~95% rozmów"** z asteriskiem *szacunkowo*
**Czas:** 3-4h
**Wpływ:** Spójne wyniki, koniec sprzecznych rankingów

### 1.3 Ghost Risk — default 0 zamiast 50
**Pliki:** `viral-scores.ts` (już naprawione na 0 w obecnym kodzie — ✅ sprawdzić)
**Problem:** Nowe/krótkie rozmowy (<3 mies.) nie powinny wyświetlać "moderate risk"
**Zmiana:** Zweryfikować że `computeGhostRisk()` zwraca `score: 0` dla <3 miesięcy. W obecnym kodzie: ✅ już zwraca 0. Ale sprawdzić czy `ThreatMeters` nie nadpisuje tego wartością neutralną.
**Czas:** 30min (weryfikacja)
**Wpływ:** Nowi użytkownicy nie widzą fałszywych alarmów

### 1.4 Health Score — usunąć fałszywy claim
**Plik:** `health-score.ts`
**Problem:** Komentarz "calibrated based on clinical psychology research" jest nieudowodniony.
**Zmiana:** Zamienić na: `// Wagi dobrane heurystycznie na bazie ogólnych konceptów psychologii relacji. Nie walidowane empirycznie.`
**Czas:** 5min
**Wpływ:** Uczciwe przedstawienie limitów narzędzia

### 1.5 VersusCard labels — usunąć toksyczne
**Plik:** `story-data.ts`
**Problem:** "Simp" i "Clingy" to pejoratywne etykiety. Produkt dla par nie powinien obrażać.
**Zmiana:**
- "Simp" → **"Fan"** (lub "Entuzjasta")
- "Clingy" → **"Energiczny"** (lub "Niecierpliwy")
- "Overthinker" → **"Pisarz"** (neutralne, oparte na długości wiadomości)
**Czas:** 15min
**Wpływ:** Mniej skarg, lepsze viralowe share'y (ludzie chętniej udostępniają pozytywne wyniki)

### 1.6 Subtext Decoder — mniej false positives
**Plik:** `subtext.ts`
**Problem:** Próg 30min delayed response jest za niski dla asynchronicznych rozmów. "ok"/"spoko" prawie zawsze jest genuine, nie passive.
**Zmiana:**
- `DELAYED_RESPONSE_THRESHOLD`: 30min → **2h** (7_200_000ms)
- Passive markers: dodać frequency check — jeśli ktoś mówi "ok" w >15% wiadomości, to ich normalny styl, nie subtext. Zmniejszyć punkty z +5 na +2 w takim przypadku.
- Trailing "..." — sprawdzić czy osoba regularnie kończy zdania wielokropkiem. Jeśli tak (>10% wiadomości), zredukować punkty z +2 na +1.
**Czas:** 1-2h
**Wpływ:** Mniej absurdalnych "hidden meanings" w normalnych rozmowach

### 1.7 Damage Report — decouple od Health Score
**Plik:** `damage-report.ts`
**Problem:** Emotional Damage w 80% zależy od Health Score (który jest AI-generated). Circular dependency.
**Zmiana:** Zamienić formułę:
```
// Było: (100 - healthScore) * 0.8 + sentimentAsymmetry * 0.2
// Nowe: oparte wyłącznie na danych ilościowych
const conflictDensity = clamp(conflictCount / totalMonths * 10, 0, 50);
const responseAsymmetry = clamp(rtAsymmetryPercent, 0, 25);
const volumeDecline = clamp(recentVsEarlierDecline, 0, 25);
emotionalDamage = conflictDensity + responseAsymmetry + volumeDecline;
```
**Czas:** 1-2h
**Wpływ:** Emotional Damage oparte na faktach, nie na AI

---

## BLOK 2: Czystość kodu (2-3 dni)
*Mniejszy wpływ na użytkownika, duży wpływ na maintainability.*

### 2.1 Gemini Helper DRY ⚠️ CRITICAL
**Pliki:** `court-prompts.ts`, `dating-profile-prompts.ts`, `simulator-prompts.ts`, `gemini.ts`, `json-parser.ts`
**Problem:** 3 pliki duplikują `callGeminiWithRetry()` i `parseGeminiJSON()`.
**Zmiana:**
1. Upewnić się że `gemini.ts` eksportuje `callGeminiWithRetry()` — jeśli nie, wyeksportować
2. Upewnić się że `json-parser.ts` eksportuje `parseGeminiJSON()` — już eksportuje
3. W każdym z 3 plików: usunąć lokalne definicje, dodać `import { callGeminiWithRetry } from './gemini'` i `import { parseGeminiJSON } from './json-parser'`
4. Sprawdzić czy sygnatury są identyczne — jeśli nie, ujednolicić
**Czas:** 1-2h
**Wpływ:** ~300 linii mniej kodu, jednolite zachowanie retry/parse

### 2.2 Minimum sample size checks
**Pliki:** `sentiment.ts`, `pronouns.ts`, `intimacy.ts`, `catchphrases.ts`
**Problem:** Algorytmy produkują wyniki nawet z 5 wiadomości.
**Zmiana:** Dodać na początku każdej głównej funkcji:
```typescript
const MIN_MESSAGES = 50; // per person for reliable scoring
if (personMessages.length < MIN_MESSAGES) return null; // or default neutral
```
Komponenty UI powinny obsługiwać `null` — wyświetlić "Za mało danych".
**Czas:** 2-3h (4 pliki + UI fallbacks)
**Wpływ:** Eliminuje absurdalne wyniki z mikroskopijnych rozmów

### 2.3 CPS thresholds — normalizacja per-pattern
**Plik:** `communication-patterns.ts`
**Problem:** Uniform threshold (np. 50%) mimo różnej liczby pytań per pattern.
**Zmiana:** Zmienić severity calculation z `yesCount / threshold` na `yesCount / totalAnswerable`:
```typescript
const percentage = pattern.total > 0 ? (pattern.yesCount / pattern.total) * 100 : 0;
// severity based on actual percentage, not vs fixed threshold
```
**Czas:** 1h
**Wpływ:** Uczciwe porównanie między wzorcami o różnej liczbie pytań

### 2.4 Sentiment dictionary — ekspansja do 500+
**Plik:** `sentiment.ts`
**Problem:** ~200+200 słów to za mało. Wiele polskich wyrażeń emocjonalnych nie jest pokrytych.
**Zmiana:**
1. Dodać ~100 polskich pozytywnych: emocjonalne (wzruszony, zachwycony, dumny, wdzięczny), potoczne (petarda, bomba, miodzio, czadowo), relacyjne (tęsknię, kocham, przytulam)
2. Dodać ~100 polskich negatywnych: emocjonalne (rozczarowany, zawiedziony, zraniony, sfrustrowany), potoczne (porażka, koszmar, beznadziejny, dno), relacyjne (olałeś, ignorujesz, wyjeżdżasz)
3. Dodać ~50 angielskich brakujących: "appreciate", "grateful", "thrilled", "exhausted", "overwhelmed", "toxic", "gaslight"
4. Dodać minimum word count threshold — nie scorować wiadomości <3 słów
**Czas:** 2-3h
**Wpływ:** Dokładniejszy sentiment, mniej zero-scored messages

---

## BLOK 3: Disclaimery i labeling (1 dzień)
*Niski koszt, duży wpływ na zaufanie. Uczciwy produkt = lojalny użytkownik.*

### 3.1 Percentile disclaimers
**Pliki:** `RankingBadges.tsx` (lub komponent który wyświetla TOP X%)
**Zmiana:** Pod każdym rankingiem dodać `<PsychDisclaimer variant="compact">Szacunki heurystyczne — nie oparte na danych populacyjnych</PsychDisclaimer>`
**Czas:** 30min

### 3.2 Gottman disclaimer — prominence
**Plik:** `GottmanHorsemen.tsx`
**Zmiana:** Przenieść disclaimer NA GÓRĘ sekcji (przed wykresem, nie pod), zmienić na bold. Dodać cytat: Gottman, J.M. & Silver, N. (1999).
**Czas:** 20min

### 3.3 Damage Report — rename
**Pliki:** `DamageReport.tsx`, `damage-report.ts`, `types.ts`
**Zmiana:**
- "Emotional Damage" → **"Napięcie w relacji"** (Relationship Tension)
- "Communication Grade A-F" → **"Ocena wzajemności"** (Reciprocity Rating)
- Zachować A-F bo jest intuicyjne, ale zmienić kontekst
**Czas:** 30min

### 3.4 Threat Meters header
**Plik:** komponent `ThreatMeters.tsx`
**Zmiana:** Sprawdzić że nagłówek to "Wskaźniki Dynamiki" (nie "Wskaźniki Zagrożeń" — powinno być już zmienione w Faza 26). Dodać podtytuł: *"Ilościowe wskaźniki dynamiki rozmowy — nie ocena psychologiczna"*
**Czas:** 15min

### 3.5 Ogólny disclaimer footer
**Plik:** `PsychDisclaimer.tsx` + użycie w głównym layoucie analizy
**Zmiana:** Na dole strony wyników dodać stały footer:
*"PodTeksT analizuje wzorce tekstowe, nie emocje ani intencje. Wyniki mają charakter rozrywkowy i orientacyjny. Nie zastępują konsultacji specjalisty."*
**Czas:** 20min

---

## BLOK 4: UX polish (2-3 dni)
*Detale które robią różnicę między "fajnym projektem" a "profesjonalnym produktem".*

### 4.1 Error states — minimum wiadomości
**Pliki:** komponenty analizy (AI buttons, chart components)
**Problem:** Przy <100 wiadomościach wyniki są niestabilne, ale nic nie ostrzega.
**Zmiana:** Na stronie wyników, jeśli `totalMessages < 200`:
- Żółty banner: "Ta rozmowa ma [X] wiadomości. Dla najdokładniejszych wyników zalecamy minimum 500."
- Nie blokować — pozwolić analizować, ale ostrzec
**Czas:** 1h

### 4.2 Empty states — brak danych
**Problem:** Komponenty jak LSMCard, PronounCard, GottmanHorsemen mogą nie mieć danych. Co wtedy?
**Zmiana:** Upewnić się że KAŻDY komponent ma fallback:
```tsx
if (!result) return (
  <Card className="opacity-50">
    <p className="text-muted-foreground text-sm">Za mało danych dla tej analizy</p>
  </Card>
);
```
**Czas:** 2-3h (przejść wszystkie komponenty)

### 4.3 Loading states
**Problem:** SSE streaming może trwać 30-60s. Co widzi użytkownik?
**Zmiana:** Dodać progress indicator per-pass:
- Pass 1/4: "Analizuję ton i styl..." ✅
- Pass 2/4: "Badam dynamikę relacji..." ⏳
- Pass 3/4: "Tworzę profile osobowości..."
- Pass 4/4: "Synteza i werdykt..."
**Czas:** 1-2h (jeśli SSE już wysyła pass indicators)

### 4.4 Share cards — QA
**Problem:** 20+ typów share cards. Czy wszystkie wyglądają dobrze?
**Zmiana:** Przejść każdy typ i sprawdzić:
- Czy tekst nie wychodzi poza granice karty?
- Czy polskie znaki (ą, ę, ż) renderują się poprawnie?
- Czy branding PodTeksT jest na każdej karcie?
- Czy działa Web Share API + PNG fallback?
**Czas:** 2-3h (manual QA + drobne fixy)

### 4.5 Mobile responsiveness — analiza
**Problem:** Dashboard i wyniki analizy mogą nie wyglądać dobrze na telefonie.
**Zmiana:** Sprawdzić na 375px (iPhone SE) i 390px (iPhone 14):
- Czy wykresy (Recharts) skalują się?
- Czy tabele nie overflowują?
- Czy modal share cards działają?
- Czy sidebar zamyka się na mobile?
**Czas:** 2-3h (audit + fixy)

---

## BLOK 5: Wydajność i stabilność (1-2 dni)
*Invisible ale ważne.*

### 5.1 Gemini error handling — resilience
**Plik:** `gemini.ts`, route handlers
**Problem:** 3x retry z exponential backoff istnieje, ale co jeśli Gemini zwraca 500 3 razy pod rząd?
**Zmiana:** Upewnić się że graceful degradation działa:
- Jeśli Pass 2 fails, reszta dalej działa
- Jeśli entertainment feature fails, wyświetlić "Spróbuj ponownie" zamiast crash
- Logować errory z identyfikatorem sesji (nie content wiadomości!)
**Czas:** 1-2h

### 5.2 Bundle size audit
**Zmiana:** Uruchomić `pnpm build` i sprawdzić bundle analysis:
- Czy Spline 3D scenes są lazy-loaded?
- Czy Framer Motion jest tree-shaken?
- Czy jsPDF (ciężki) ładuje się tylko na demand?
**Czas:** 1-2h

### 5.3 Core Web Vitals
**Zmiana:** Uruchomić Lighthouse na:
- Landing page (LCP, FCP — ważne dla SEO)
- Strona wyników (INP — interactivity pod dużą ilością danych)
- Dashboard (CLS — przesunięcia layoutu)
**Czas:** 1-2h (audit) + czas na fixy

### 5.4 Rate limiting — persistence
**Problem:** In-memory rate limiting resetuje się gdy Cloud Run restartuje instancję.
**Zmiana:** Jeśli to problem: dodać Redis (Upstash — darmowy tier) lub użyć Cloud Run session affinity.
Jeśli nie jest jeszcze problemem (mały ruch) — odłożyć.
**Czas:** 2-3h jeśli potrzebne

---

## Kolejność realizacji

```
Tydzień 1: BLOK 1 (wiarygodność) + BLOK 3 (disclaimery)
           → Najwyższy wpływ, najmniejszy risk

Tydzień 2: BLOK 2 (czystość kodu)
           → Refactoring, testy manualne

Tydzień 3: BLOK 4 (UX) + BLOK 5 (wydajność)
           → Polish, audit, QA
```

**Total: ~2-3 tygodnie przy normalnym tempie.**

---

## Checklist — po zakończeniu

- [ ] Żaden komponent nie używa nazwy "Gottman" bez disclaimera
- [ ] Jeden system percentyli (nie dwa)
- [ ] Gemini helpers zaimportowane, nie zduplikowane
- [ ] Minimum sample size w sentiment, pronouns, intimacy, catchphrases
- [ ] Subtext Decoder nie flaguje 30-minutowej ciszy jako "hidden meaning"
- [ ] Emotional Damage nie zależy od AI Health Score
- [ ] "Simp" i "Clingy" usunięte
- [ ] Health Score nie twierdzi że jest "klinicznie kalibrowany"
- [ ] Sentiment dictionary: 500+ słów
- [ ] Każdy komponent ma empty state
- [ ] Mobile OK na 375px+
- [ ] Lighthouse Performance > 80 na landing page
- [ ] Disclaimer footer na stronie wyników

---

## Czego NIE robić w tym okresie

- ❌ Nowych feature'ów
- ❌ Nowych parserów
- ❌ Stripe/monetyzacja (jeszcze nie)
- ❌ i18n (jeszcze nie)
- ❌ Nowych share cards
- ❌ Nowych trybów AI

**Jedyny cel: to co jest, ma działać doskonale.**

---

*Plan na bazie PSYCHOMETRIC_AUDIT.md (35+ modułów) + code review.*
*Ostatnia aktualizacja: 2026-02-26*
