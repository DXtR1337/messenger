                        # DOKUMENTACJA SYSTEMU: CHATSCOPE SaaS
**Wersja:** 1.0.0 (Luty 2025)  
**Status:** MASTER DOCUMENT (Technologia, Architektura, Biznes, Audyt)  
**Autor:** Senior Full Stack Architect & UI/UX Specialist
**Perspektywa:** Silicon Valley Senior Audit (ex-Vercel, ex-Google, ex-Apple)

---

## 1. STRESZCZENIE WYKONAWCZE (EXECUTIVE SUMMARY)
**ChatScope** to platforma analityczna SaaS, która transformuje dane z komunikatorów w wartościowe wglądy w relacje międzyludzkie. Produkt charakteryzuje się wyjątkową synergią **solidnej inżynierii danych** z **mistrzowskim wykorzystaniem mechanizmów wiralowych**.

### Tabela Wyników (Audit Scorecard):
| Kategoria | Wynik | Perspektywa |
|-----------|-------|-------------|
| **Frontend Architecture** | 6.5/10 | Skalowalność, nowoczesność stosu. |
| **UX/UI Design** | 7.2/10 | Estetyka premium, mikro-interakcje. |
| **Growth & Virality** | 9.0/10 | Mechanizm Wrapped, Share Cards. |
| **Overall Health** | **6.4/10** | Solidna baza z krytycznymi brakami w infra. |

---

## 2. STOS TECHNOLOGICZNY (TECH STACK) — DEEP DIVE
Aplikacja wykorzystuje architekturę "Bleeding Edge", wyznaczając standardy wydajności dla nowoczesnych SaaSów.

### 2.1. Core Frontend (Next.js 16.1.6 + React 19)
-   **React 19:** Pełne wykorzystanie `useTransition` i `Suspense` dla płynnego interfejsu.
-   **Tailwind CSS 4:** Wykorzystanie nowego silnika Lightning CSS, redukującego czas budowania stylów o 80%.
-   **Shadcn/UI & Radix:** Architektura komponentów typu *headless*, gwarantująca spójność UI przy pełnej kontroli nad kodem.

### 2.2. Visualization & 3D Engine
-   **Spline 3D:** Renderowanie modeli `.splinecode` bezpośrednio w DOM, co zapewnia immersyjne doświadczenie (np. interaktywne tła reagujące na ruch myszy).
-   **Recharts:** Zaawansowana wizualizacja danych ilościowych z customowymi tooltipami i płynnymi animacjami.
-   **Framer Motion 12:** Orkiestracja animacji wejścia (staggered animations) i przejść między route'ami.

### 2.3. Data Pipeline & Logic
-   **Local-First Parsing:** Surowe dane (JSON/TXT) są parsowane asynchronicznie w przeglądarce, co eliminuje obawy o prywatność i koszty serwerowe transferu plików.
-   **IndexedDB (via `lib/utils.ts`):** Zastąpienie LocalStorage wydajną bazą przeglądarkową dla obsługi konwersji o rozmiarach przekraczających 200,000 wiadomości.
-   **LZ-String Compression:** Optymalizacja danych przesyłanych w URL dla funkcji "Anonymous Roast Report".

---

## 3. ARCHITEKTURA I FUNKCJE BIZNESOWE

### 3.1. Jak to działa: Mechanizm Analizy
1.  **Ingestion:** Parsery (`messenger.ts`, `whatsapp.ts`) normalizują dane do uniwersalnego formatu `ParsedConversation`.
2.  **Quantitative Analysis:** Obliczenia matematyczne (ilość słów, częstotliwość, aktywność czasowa).
3.  **Qualitative Analysis (AI Layer):** Wysłanie zanonimizowanych deskryptorów do **Google Gemini API** (`@google/generative-ai`) w celu wygenerowania warstwy narracyjnej.
4.  **Rendering:** Złożenie wyników w interaktywny Dashboard.

### 3.2. Kluczowe Funkcje Viralowe (Growth Hooks)
-   **Receipt Card:** Wizualizacja rozmowy w formie paragonu sklepowego (unikalny branding).
-   **Ghost Forecast:** Przewidywanie prawdopodobieństwa "zniknięcia" osoby na podstawie danych historycznych.
-   **Delusion Score:** Analiza dysproporcji w zaangażowaniu między stronami.
-   **Story Mode:** Generowanie pionowych raportów gotowych do wrzucenia na IG/TikTok.

---

## 4. ANALIZA RYZYK I BEZPIECZEŃSTWA (SENIOR AUDIT FINDINGS)

> [!WARNING]
> **KRYTYCZNE RYZYKA DO ZAADRESOWANIA:**
> 1. **Brak Autentykacji:** Endpointy API (np. `/api/analyze`) są otwarte dla każdego, co grozi nadużyciami i wysokimi kosztami API Gemini.
> 2. **Klucze w .env.local:** Wyciek kluczy Anthropic/Gemini/GCP wymaga natychmiastowej rotacji.
> 3. **Legal (SCID-II):** Wykorzystanie narzędzia komercyjnego SCID-II do screeningu zaburzeń osobowości niesie ryzyko prawne (APA) i etyczne. Zalecana zmiana na autorski "Personality Matcher".

---

## 5. STRATEGIA PRODUKTOWA I MARKETINGOWA

### 5.1. Model Biznesowy (Monetyzacja)
-   **Model "Pay-per-Analysis":** $2.99 za pełny raport Deep Analysis.
-   **Model Subskrypcyjny:** $9.99/mo za nielimitowane analizy i funkcje "Comparison".
-   **Viral Loops:** Każda share card zawiera QR kod kierujący do landing page'a, co tworzy samonapędzający się lejek sprzedażowy.

### 5.2. Go-To-Market (GTM)
-   **TikTok Wrapped Trend:** Wykorzystanie sezonowości (koniec roku, Walentynki) do promocji "Wrapped for Couples".
-   **SEO Focus:** Frazy "Jak pobrać rozmowę z Messengera", "Analityka Tindera", "Statystyki relacji".

---

## 6. ROADMAPA TECHNICZNA (CTO VISION)

### Faza 1: Stabilizacja (1-2 tyg.)
-   Wdrożenie Supabase Auth dla bezpiecznego logowania.
-   Integracja Stripe SDK (Lemon Squeezy dla rynków globalnych).
-   Implementacja Error Boundaries i Loading States (LCP improvement).

### Faza 2: Skalowanie (1-3 mies.)
-   **Obsługa nowych źródeł:** Instagram, Telegram, iMessage.
-   **Deep Sentiment:** Analiza tonu wypowiedzi przy użyciu zaawansowanych modeli LLM.
-   **B2B Integration:** Narzędzie do analizy zdrowia komunikacji w zespołach (Slack).

---

## 7. STRUKTURA WORKSPACE
- `/src/app` — Logika routingu (Dashboard, Roast, Landing).
- `/src/components` — Modularne komponenty UI (Chart, Stats, Spline).
- `/src/lib` — Core engine (Parsery, algorytmy analizy, integracja AI).
- `/audit-reports` — Szczegółowe raporty techniczne.

---

**Podsumowanie:**  
ChatScope to produkt o ogromnym potencjale rynkowym. Łączy w sobie "fun" z głęboką analityką danych. Przy wdrożeniu poprawek bezpieczeństwa i stabilizacji infrastruktury, jest to projekt gotowy na globalny sukces w kategorii *Lifestyle & Social Data*.
