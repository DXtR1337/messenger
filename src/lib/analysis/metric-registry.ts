/**
 * Metric Registry — metadata for every quantitative metric in PodTeksT.
 *
 * Provides: metric name, experimental status, academic citation,
 * minimum sample size, and brief description.
 *
 * Used by ExperimentalBadge and MetricTooltip components to render
 * consistent transparency indicators across all analysis cards.
 */

export interface MetricMeta {
  /** Display name (Polish) */
  name: string;
  /** Whether this metric uses novel/unvalidated methodology */
  isExperimental: boolean;
  /** Academic citation key (references citations.ts or inline) */
  citation?: string;
  /** Minimum sample size for reliable results */
  minSampleSize?: string;
  /** Brief description of what the metric measures */
  description: string;
  /** Known limitations */
  limitations?: string;
}

/**
 * Registry of all quantitative metrics.
 * Keys match component/module identifiers for easy lookup.
 */
export const METRIC_REGISTRY: Record<string, MetricMeta> = {
  // ── Validated / well-established ──────────────────────────
  sentiment: {
    name: 'Analiza Sentymentu',
    isExperimental: false,
    citation: 'Słownik wielowarstwowy (plWordNet-emo, NAWL, sentiment-polish)',
    minSampleSize: '50 wiadomości',
    description: 'Średni ładunek emocjonalny wiadomości na skali od -1 (negatywny) do +1 (pozytywny).',
  },
  responseTime: {
    name: 'Czas Odpowiedzi',
    isExperimental: false,
    description: 'Mediana i rozkład czasu między wiadomością a odpowiedzią. Filtrowane wartości odstające metodą IQR.',
    minSampleSize: '30 wiadomości',
  },
  reciprocity: {
    name: 'Indeks Wzajemności',
    isExperimental: false,
    description: 'Kompozytowa miara balansu rozmowy: proporcja wiadomości, inicjacji, czasu odpowiedzi i reakcji.',
    minSampleSize: '30 wiadomości',
  },
  conflicts: {
    name: 'Wykrywanie Konfliktów',
    isExperimental: false,
    description: 'Detekcja eskalacji (skoki długości w wymianie), zimnej ciszy (24h+ po intensywnej wymianie) i rozwiązań.',
    minSampleSize: '50 wiadomości',
    limitations: 'Opiera się na wzorcach czasowych i długości — nie rozumie treści semantycznej.',
  },

  // ── Semi-established (adapted methodology) ────────────────
  lsm: {
    name: 'Language Style Matching',
    isExperimental: false,
    citation: 'Ireland & Pennebaker (2010)',
    minSampleSize: '50 tokenów na osobę',
    description: 'Podobieństwo użycia słów funkcyjnych między rozmówcami. Wyższy LSM = większa synchronia językowa.',
    limitations: 'Polski nie ma artykułów gramatycznych — kategoria zastępowana zaimkami wskazującymi.',
  },
  pronouns: {
    name: 'Analiza Zaimków',
    isExperimental: false,
    citation: 'Pennebaker (2011)',
    minSampleSize: '200 słów na osobę',
    description: 'Proporcje zaimków Ja/My/Ty — wskaźnik orientacji relacyjnej.',
  },
  bidResponse: {
    name: 'Bid-Response Ratio',
    isExperimental: true,
    citation: 'Driver & Gottman (2004)',
    minSampleSize: '10 bidów',
    description: 'Odsetek "bidów" (pytania, linki, ujawnienia) na które partner odpowiada. Benchmark: 86% (Gottman).',
    limitations: 'Detekcja bidów oparta na heurystykach (pytania, linki) — nie rozpoznaje subtelnych bidów emocjonalnych.',
  },
  capitalization: {
    name: 'Capitalization (ACR)',
    isExperimental: true,
    citation: 'Gable et al. (2004)',
    minSampleSize: '200 wiadomości',
    description: 'Active-Constructive Responding — jak partner reaguje na dobre wieści. Klasyfikacja AI: AC/PC/AD/PD.',
    limitations: 'Wymaga analizy AI — wyniki mogą się różnić między uruchomieniami.',
  },

  // ── Experimental (novel/heuristic) ────────────────────────
  integrativeComplexity: {
    name: 'Wskaźnik Złożoności Poznawczej',
    isExperimental: true,
    citation: 'Suedfeld & Tetlock (1977), Conway (2014)',
    minSampleSize: '30 wiadomości na osobę',
    description: 'Heurystyczny wskaźnik oparty na detekcji fraz dyferencjacji i integracji. Nie jest to walidowana metoda IC Suedfelda & Tetlocka (1977).',
    limitations: 'Uproszczona metoda frazowa — oryginalna IC wymaga oceny przez przeszkolonych koderów na skali 1-7. AutoIC Conway (2014) używa 3500+ fraz i osiąga r=.82.',
  },
  temporalFocus: {
    name: 'Orientacja Czasowa',
    isExperimental: true,
    citation: 'Pennebaker LIWC (2007)',
    minSampleSize: '500 słów na osobę',
    description: 'Proporcje markerów przeszłość/teraźniejszość/przyszłość. Inspirowane LIWC, ale progi PL są szacunkowe.',
    limitations: 'Progi 0.35/0.20 nie są kalibrowane na danych LIWC — empiryczne z obserwacji polskiego czatu.',
  },
  repairPatterns: {
    name: 'Wzorce Naprawy',
    isExperimental: true,
    citation: 'Schegloff et al. (1977)',
    minSampleSize: '100 wiadomości',
    description: 'Self-repair vs other-repair: autokorekty i naprawy partnera. Mutual Repair Index ×500.',
    limitations: 'Oparte na markerach tekstowych — nie rozpoznaje napraw kontekstowych.',
  },
  emotionalGranularity: {
    name: 'Różnorodność Słownictwa Emocjonalnego',
    isExperimental: true,
    citation: 'Kashdan (2015), Suvak (2011)',
    minSampleSize: '200 słów na osobę',
    description: 'Różnorodność kategorii emocji w słownictwie (12 kategorii Plutchik). Formuła: 70% diversity + 30% coverage. Nie jest to granularność emocjonalna w rozumieniu Barrett & Kashdan (2015).',
    limitations: 'Leksykon 12 kategorii — uproszczenie vs oryginalne narzędzia samoopisowe. Mierzy słownictwo, nie kowariancję emocji.',
  },
  shiftSupport: {
    name: 'Indeks Narcyzmu Konwersacyjnego (CNI)',
    isExperimental: true,
    citation: 'Derber (1979), Vangelisti et al. (1990)',
    minSampleSize: '10 odpowiedzi na osobę',
    description: 'Stosunek shift-response (zmiana tematu) vs support-response (podtrzymanie tematu).',
    limitations: 'Heurystyczna klasyfikacja per-wiadomość — ~40% odpowiedzi może być "ambiguous".',
  },
  chronotype: {
    name: 'Kompatybilność Chronotypu',
    isExperimental: true,
    citation: 'Aledavood (2018), Jarmolowicz (2022)',
    minSampleSize: '20 wiadomości na osobę',
    description: 'Chronotyp behawioralny z timestampów (okrągły punkt środkowy), kompatybilność 0-100.',
    limitations: 'Krzywa delta→score jest heurystyczna — brak opublikowanego mapowania godzin na wynik.',
  },
  pursuitWithdrawal: {
    name: 'Cykle Pursuit-Withdrawal',
    isExperimental: true,
    citation: 'Christensen & Heavey (1990)',
    minSampleSize: '50 wiadomości',
    description: 'Detekcja cyklicznych wzorców: seria wiadomości bez odpowiedzi → przedłużone milczenie.',
    limitations: 'Definicja cyklu oparta na progach czasowych (4h wycofanie, 4+ msgs). Filtr nocny 21:00-09:00.',
  },
  threatMeters: {
    name: 'Wskaźniki Dynamiki',
    isExperimental: true,
    description: 'Kompozytowe wskaźniki: Ghost Risk, Intensywność Przywiązania, Nierównowaga Wpływu, Zaufanie.',
    limitations: 'Formuły heurystyczne z ważonymi komponentami — brak walidacji klinicznej.',
  },
  damageReport: {
    name: 'Damage Report',
    isExperimental: true,
    description: 'Emotional Damage%, Communication Grade, Repair Potential, Korzyść z Konsultacji.',
    limitations: 'Formuła ważona (80% quant + 20% AI) — nie jest narzędziem diagnostycznym.',
  },
  rankingPercentiles: {
    name: 'Rankingi Percentylowe',
    isExperimental: true,
    description: 'Heurystyczne percentyle (TOP X%) dla kluczowych metryk.',
    limitations: 'Mediany szacunkowe (3000 msgs, 480s RT, 12h silence, 20 asymmetry) — nie oparte na danych empirycznych.',
  },
  gottmanHorsemen: {
    name: 'Wzorce Ryzyka Komunikacyjnego',
    isExperimental: true,
    citation: 'Gottman & Levenson (2000)',
    description: 'Heurystyczna analiza 4 obszarów ryzyka (Krytycyzm, Pogarda, Defensywność, Stonewalling) inspirowana badaniami Gottmana.',
    limitations: 'Derywowane z wyników CPS (AI) — oryginał wymaga obserwacji klinicznych (SPAFF).',
  },
  cognitiveFunctions: {
    name: 'Clash Funkcji Kognitywnych',
    isExperimental: true,
    citation: 'Jung (1921), Myers-Briggs',
    description: 'Porównanie funkcji kognitywnych MBTI między uczestnikami.',
    limitations: 'MBTI derywowane z AI Pass 3 — nie jest testem psychometrycznym.',
  },
  aiPredictions: {
    name: 'Prognozy AI',
    isExperimental: true,
    description: 'Prognozy trajektorii relacji z poziomem pewności. Generowane przez Gemini AI.',
    limitations: 'Prognozy AI capped na 75% pewności. Nie mogą przewidzieć wydarzeń zewnętrznych.',
  },
} as const;
