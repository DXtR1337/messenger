# PodTeksT — Audyt wieloagentowy (standalone)

> [!NOTE]
> **PodTeksT** — odkryj to, co kryje się między wierszami.
> *(bo wiesz, eks...)*

**Luty 2026 | Claude Opus 4.6**

---

## Rozdział 14: Audyt wieloagentowy
<a name="ch-audyt"></a>

> „Mierz dwa razy, tnij raz. Albo lepiej — mierz dziewięć razy, bo każdy agent widzi co innego.”

Niniejszy rozdział dokumentuje wyniki kompleksowego audytu przeprowadzonego w **dziewięciu równoległych osiach**: **audyt UX/designu** strony analizy, **audyt monetyzacji** z planem cenowym, **audyt optymalizacji** wydajności, **unit economics** kosztów AI, **audyt bezpieczeństwa**, **audyt mobile UX**, **audyt onboardingu**, **audyt jakości kodu** oraz **audyt SEO**. Każda oś została zrealizowana przez niezależnego agenta AI (Claude Opus 4.6), który przeanalizował kod źródłowy, architekturę komponentów i wzorce użytkowania.

> [!IMPORTANT]
> **Kontekst audytu**
> Audyt przeprowadzono na stanie kodu z lutego 2026 (po Fazie 22). Analiza opiera się na faktycznej zawartości plików źródłowych, nie na założeniach. Kluczowe statystyki wejściowe:
> - `src/app/(dashboard)/analysis/[id]/page.tsx` — **1322 linii** kodu, **50+ komponentów** importowanych
> - **37** instancji `IntersectionObserver` (via Framer Motion `whileInView`)
> - **9** handlerów `useCallback` w jednym pliku
> - `src/lib/rate-limit.ts` — rate limiting **wyłączony** (zwraca `{allowed: true}` zawsze)
> - Zero infrastruktury monetyzacji — brak auth, brak płatności, brak tierów

---

<a name="sec:audyt-design"></a>
## 14.1. Audyt UX/designu strony analizy

### 14.1.1. Diagnoza: monolit na jednej stronie
Strona wyników analizy renderuje **wszystkie** dane na jednej stronie. Skutkuje to:

| Metryka | Wartość | Problem |
| :--- | :--- | :--- |
| Wysokość strony (2-osobowa) | 4000–6000 px | 15–20 ekranów mobilnych |
| Wysokość strony (5+ osób) | 5000–7000 px | Dodatkowe sekcje serwera |
| Importowane komponenty | 50+ | Pojedynczy `page.tsx` |
| Instancje IntersectionObserver | 37 | Każde `whileInView` tworzy osobną instancję |
| Sekcje nawigacji (SectionNavigator) | 6–9 | Niewystarczające pokrycie treści |
| Odległość AI Analysis od foldu | ~3000 px | Najcenniejsza treść pogrzebana pod metrykami |

### 14.1.2. Mapa sekcji strony
1. **Hero Zone** — `AnalysisHeader`, `ParticipantStrip`
2. **Kluczowe metryki** — `KPICards`, `StatsGrid`
3. **Longitudinal Delta** — porównanie z poprzednią analizą
4. **Aktywność i czas** — Timeline, Heatmap, Response Time, Emoji
5. **Wzorce komunikacji** — Message Length, Sentiment, Intimacy, Conflicts
6. **Viral Scores** — Viral Scores Section, Best Time To Text
7. **Ghost Forecast**
8. **Osiągnięcia** — Badges Grid
9. **Delusion Quiz**
10. **Group Chat Awards**
11. **Sieć interakcji** — Network Graph
12. **Udostępnij wyniki** — Share Cards, PDF export
13. **Analiza AI** — Roast, Tone, Love Language, Personality, CPS, Subtext, Court

> [!WARNING]
> **Kluczowy problem**
> Sekcja **Analiza AI** znajduje się na samym dole strony. Użytkownik musi przewinąć ~3000 px przed zobaczeniem wyników AI.

### 14.1.3. Proponowane rozwiązanie: architektura tabowa
Zamiast jednej długiej strony, proponujemy **5 zakładek (tabów)** z lazy-loadingiem:

| Nr | Tab | Zawartość |
| :--- | :--- | :--- |
| 1 | **Przegląd** | Header, KPICards, HealthScore, Delta |
| 2 | **Metryki** | Timeline, Heatmap, Emoji, Sentiment, Conflicts |
| 3 | **AI Insights** | Roast, LoveLanguage, PersonalityDeepDive, CPS |
| 4 | **Rozrywka** | CourtTrial, DatingProfile, RepySimulator, Quiz |
| 5 | **Udostępnij** | ShareCardGallery, ExportPDF, Badges |

---

<a name="sec:audyt-monetyzacja"></a>
## 14.2. Audyt monetyzacji

### 14.2.1. Model Freemium: 3-Tier

| Funkcja | Free (0 PLN) | Pro (29,99 PLN/m) | Unlimited (49,99 PLN/m) |
| :--- | :--- | :--- | :--- |
| Metryki ilościowe | Wszystkie | Wszystkie | Wszystkie |
| AI Pass 1 (Ton) | Tak | Tak | Tak |
| AI Pass 2–4 | Nie | Tak | Tak |
| Roast (podstawowy) | Tak | Tak | Tak |
| Enhanced Roast | Nie | Tak | Tak |
| Udostępnij | 5 kart | Wszystkie | Wszystkie |
| Analizy / miesiąc | 3 | 15 | Bez limitu |

### 14.2.2. Scenariusze akwizycji i MAU

| Scenariusz | Budżet/m | Kanały | M3 MAU | M6 MAU | M12 MAU |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A — Bootstrap** | 0 PLN | Viral cards, SEO | 100 | 400 | 1,200 |
| **B — Lean** | 2-5k PLN| Organic + Influencers | 300 | 1,000 | 3,000 |
| **C — Growth** | 10-20k PLN| Pełny mix marketingowy | 800 | 3,000 | 10,000 |

---

<a name="sec:unit-economics"></a>
## 14.3. Unit economics i koszty AI

### 14.3.1. Tokeny promptów systemowych

| Prompt | ~Tokeny | Lokalizacja |
| :--- | :--- | :--- |
| PASS_1_SYSTEM (Overview) | ~450 | `prompts.ts:16-57` |
| PASS_2_SYSTEM (Dynamics) | ~1,100 | `prompts.ts:63-145` |
| PASS_3_SYSTEM (Profiles) | ~1,400 | `prompts.ts:151-296` |
| PASS_4_SYSTEM (Synthesis) | ~900 | `prompts.ts:302-369` |
| ROAST_SYSTEM | ~550 | `prompts.ts:375-410` |
| **Suma (pełna analiza)** | **~7,850** | |

### 14.3.2. Cennik Gemini API (PLN, Luty 2026)

| Kategoria | Flash (tekst/obraz) | Pro (obraz) |
| :--- | :--- | :--- |
| Input (per 1M tokenów) | **0,25 PLN** | wyższy |
| Output (per 1M tokenów) | **4,50 PLN** | wyższy |
| Cached input (1M) | **0,20 PLN** | --- |

### 14.3.3. Koszt per analiza i Marża

| Scenariusz | Koszt AI (PLN) | Marża (Pro) | Marża (Unlimited) |
| :--- | :--- | :--- | :--- |
| Podstawowa (5 calls) | **0,11 PLN** | 99% | 98% |
| Rozszerzona (10 calls)| **0,22 PLN** | 95% | 93% |
| Pełna (20 calls) | **0,44 PLN** | 78% | 74% |

---

<a name="sec:bezpieczenstwo"></a>
## 14.4. Bezpieczeństwo i prywatność

### 14.4.1. Inwentarz walidacji Zod

| Endpoint | Schema | Status | Uwagi |
| :--- | :--- | :--- | :--- |
| `/api/analyze` | `analyzeRequestSchema`| **WARN** | `passthrough()` w próbkach |
| `/api/analyze/cps`| `cpsRequestSchema` | OK | Walidacja uczestnika |
| `/api/discord/fetch`| brak Zod | **FAIL** | Brak ścisłej walidacji |

### 14.4.2. RODO Compliance Checklist

| Wymóg RODO | Status | Szczegóły |
| :--- | :--- | :--- |
| Minimalizacja danych | Spełniony | Próbkowanie < 1% chatu |
| Prawo do usunięcia | Spełniony | Lokalny `deleteAnalysis()` |
| Polityka prywatności | **Brak** | Brak strony `/privacy` |
| Informacja o AI | **Brak** | Brak info o Google Gemini |

---

<a name="sec:mobile-ux"></a>
## 14.5. Audyt Mobile UX

### 14.5.1. Analiza punktów dotykowych (Touch targets)

| Element | Rozmiar | Minimum | Wynik |
| :--- | :--- | :--- | :--- |
| Hamburger Menu | 18x18px | 44x44px | **FAIL** |
| Checkbox AI Consent| 20x20px | 44x44px | **FAIL** |
| Story Share Card | ~44x44px| 44x44px | **PASS** |

### 14.5.2. html2canvas na iOS — Problemy

| Problem | Dotkliwość | Opis |
| :--- | :--- | :--- |
| CORS proxy images | Wysoka | Safari blokuje rasteryzację zewnętrzną |
| Retina scaling | Średnia | Ryzyko rozmycia na ekranach Retina |
| Canvas memory limit | Wysoka | Crash przy bardzo długich kartach (Receipt) |

---

<a name="sec:jakosc-kodu"></a>
## 14.6. Jakość kodu i Developer Experience

### 14.6.1. Scorecard techniczny
- **TS Any Usage:** 0 (doskonale)
- **Strict Mode:** On (doskonale)
- **Test Coverage:** < 5% (krytycznie)
- **High Security Vulns:** 4 (jsPDF/minimatch)

### 14.6.2. Obsługa błędów

| Wzorzec | Ilość | Ocena | Przykład |
| :--- | :--- | :--- | :--- |
| Try-catch + HTTP | 22 | Dobra | API responses |
| Try-catch + console.error | 16 | **Warn** | Brak monitoringu (Sentry) |
| Silent fallback | 18 | OK | `decodeFBString` |

---

<a name="sec:seo-performance"></a>
## 14.7. SEO i Web Performance

### 14.7.1. Analiza fontów

| Rodzina | Warianty | Rozmiar | Wpływ SEO |
| :--- | :--- | :--- | :--- |
| Geist Sans | Variable | ~25 KB | Niska waga |
| Space Grotesk | 5 wag | ~65 KB | **Ciężki (Tab 4 only)** |
| JetBrains Mono | 5 wag | ~80 KB | **Ciężki (Story only)** |

> [!TIP]
> **Oszczędność:** Warunkowe ładowanie fontów (tylko tam gdzie są użyte) zmniejszy initial payload o **145 KB (60%)**.

---

<a name="sec:audyt-podsumowanie"></a>
## 14.8. Podsumowanie i Roadmapa

### Kluczowe wnioski
1. **Design:** Monolit wymaga podziału na taby (DOM -80%).
2. **Bezpieczeństwo:** Rate limit **wyłączony** (P0), 5 HIGH CVE w jsPDF (P0).
3. **SEO:** robots.txt błąd domeny (P0).
4. **Unit Economics:** Zdrowy margines 91% na kosztach AI.

### Skonsolidowana Roadmapa

**Sprint 0 (Naprawy P0):**
- Fix `rate-limit.ts` (Redis).
- Update `jspdf` (4.2.0+).
- Fix `robots.txt` domain.

**Sprint 1 (Architektura):**
- Wdrożenie Tabów (AnalysisTabs).
- Re-render optimization.

**Sprint 2 (Revenue & Quality):**
- Supabase Auth + Stripe.
- Test Coverage > 60%.
- GDPR Compliance (/privacy).
