/**
 * Eks Mode V2 ("Tryb Eks — Sekcja Zwłok Twojego Związku")
 * Multi-pass AI analysis: Recon → Deep Autopsy → Verdict
 * Server-side only.
 */

import 'server-only';
import type { AnalysisSamples } from './qualitative';
import { formatMessagesForAnalysis } from './prompts';
import { callGeminiWithRetry } from './gemini';
import { parseGeminiJSON } from './json-parser';

// ============================================================
// Types — Core (V1 compat)
// ============================================================

export interface EksPhase {
  name: string;
  periodStart: string;
  periodEnd: string;
  description: string;
  symptoms: string[];
  keyQuotes: string[];
  sentimentAvg: number;
  intimacyAvg: number;
}

export interface EksTurningPoint {
  approximateDate: string;
  trigger: string;
  evidence: string[];
  whatShouldHaveHappened: string;
}

export interface EksWhoLeftFirst {
  name: string;
  evidence: string[];
  withdrawalPattern: string;
  otherPersonResponse: string;
}

export interface EksLastWords {
  lastMeaningfulExchange: string[];
  analysis: string;
  whatWasLeftUnsaid: string;
}

export interface EksCauseOfDeath {
  primary: string;
  contributingFactors: string[];
  wasItPreventable: boolean;
  preventabilityReasoning: string;
}

export interface EksLossProfile {
  name: string;
  whatTheyLost: string;
  whatTheyGained: string;
  patternToWatch: string;
  healingTimeline: string;
}

export interface EksPostBreakupForecast {
  willTheyComeBack: number;
  comeBackReasoning: string;
  perPerson: Record<string, {
    reboundRisk: number;
    growthPotential: number;
    nextRelationshipPrediction: string;
  }>;
}

export interface EksGoldenAge {
  periodStart: string;
  periodEnd: string;
  description: string;
  peakIntimacy: number;
  peakActivity: number;
  longestSession: string;
  bestQuotes: string[];
  whatMadeItWork: string;
}

// ============================================================
// Types — V2 Extensions
// ============================================================

/** Pass 1 output — Reconnaissance scan */
export interface EksRecon {
  roughPhases: Array<{
    periodStart: string;
    periodEnd: string;
    label: string;
    confidence: number;
  }>;
  flaggedDateRanges: Array<{
    start: string;
    end: string;
    reason: string;
    type: 'turning_point' | 'conflict' | 'withdrawal' | 'golden' | 'suspicious';
  }>;
  flaggedQuotes: string[];
  areasToInvestigate: string[];
  emotionalPeaks: Array<{
    date: string;
    type: 'high' | 'low';
    signal: string;
  }>;
}

/** Things they never said to each other */
export interface EksUnsaidThings {
  perPerson: Record<string, string[]>;
  sharedUnsaid: string;
}

/** Repeating relationship pattern */
export interface EksRepeatingPattern {
  pattern: string;
  origin: string;
  nextRelationshipRisk: string;
}

/** Monthly emotional timeline entry (AI-enriched) */
export interface EksEmotionalTimelineMonth {
  month: string;
  intimacy: number;
  sentiment: number;
  responseTime: number;
  dominantEmotion: string;
  keyEvent?: string;
}

/** Formal death certificate */
export interface EksDeathCertificate {
  caseNumber: string;
  dateOfBirth: string;
  dateOfDeath: string;
  placeOfDeath: string;
  attendingPhysician: string;
  mannerOfDeath: 'natural' | 'accident' | 'homicide' | 'suicide' | 'undetermined';
}

// ============================================================
// Types — V4 Extensions (Pass 4: Psychogram)
// ============================================================

/** Per-person attachment style mapping with behavioral triggers */
export interface EksAttachmentProfile {
  primaryStyle: 'secure' | 'anxious-preoccupied' | 'dismissive-avoidant' | 'fearful-avoidant';
  secondaryStyle: string | null;
  triggerPattern: string;
  evidence: string[];
  deactivationStrategy: string;
  protestBehavior: string;
  healingNeeds: string[];
}

/** Full attachment map for the relationship */
export interface EksAttachmentMap {
  perPerson: Record<string, EksAttachmentProfile>;
  interactionEffect: string;
  toxicLoop: string | null;
}

/** Expanded repeating pattern with breaking strategy (V4) */
export interface EksExpandedPattern {
  name: string;
  description: string;
  originInThisRelationship: string;
  frequencyInData: number;
  riskForNextRelationship: 'high' | 'medium' | 'low';
  breakingStrategy: string;
}

/** Per-person expanded repeating patterns */
export interface EksExpandedRepeatingPatterns {
  perPerson: Record<string, EksExpandedPattern[]>;
}

/** Therapist letter per person */
export interface EksTherapistLetterEntry {
  dearLine: string;
  whatISee: string;
  whatYouDontSee: string;
  oneThingToWorkOn: string;
  closingLine: string;
}

/** Therapist letters for all participants */
export interface EksTherapistLetter {
  perPerson: Record<string, EksTherapistLetterEntry>;
}

/** Letter TO therapist — what each person would write if they had to explain this relationship */
export interface EksLetterToTherapistEntry {
  opening: string;        // How they'd start: "Nie wiem od czego zacząć..."
  whatHappened: string;    // Their version of events (2-3 sentences, biased by their perspective)
  whatIKeepThinking: string; // The thought that loops in their head
  whatImAfraidToAdmit: string; // The hard truth they'd only say in therapy
  theQuestion: string;    // The one question they'd ask the therapist
}

/** Letters to therapist for all participants */
export interface EksLetterToTherapist {
  perPerson: Record<string, EksLetterToTherapistEntry>;
}

/** Pain symmetry analysis */
export interface EksPainSymmetry {
  whoHurtMore: string;
  howPersonAHurtB: string;
  howPersonBHurtA: string;
  theIrony: string;
  whatNeitherSaw: string;
}

/** Combined Pass 4 result */
export interface EksPsychogramResult {
  attachmentMap: EksAttachmentMap;
  expandedPatterns: EksExpandedRepeatingPatterns;
  therapistLetter: EksTherapistLetter;
  letterToTherapist: EksLetterToTherapist;
  painSymmetry: EksPainSymmetry;
}

// ============================================================
// Main result type (V1 + V2 + V4 extensions)
// ============================================================

export interface EksResult {
  // V1 fields
  phases: EksPhase[];
  goldenAge: EksGoldenAge;
  turningPoint: EksTurningPoint;
  whoLeftFirst: EksWhoLeftFirst;
  lastWords: EksLastWords;
  causeOfDeath: EksCauseOfDeath;
  lossProfiles: EksLossProfile[];
  postBreakupForecast: EksPostBreakupForecast;
  epitaph: string;
  relationshipDuration: string;
  deathDate: string;
  // V2 optional extensions
  unsaidThings?: EksUnsaidThings;
  repeatingPatterns?: Record<string, EksRepeatingPattern[]>;
  emotionalTimeline?: EksEmotionalTimelineMonth[];
  deathCertificate?: EksDeathCertificate;
  passesCompleted?: number;
  // V4 optional extensions (Pass 4: Psychogram)
  attachmentMap?: EksAttachmentMap;
  expandedPatterns?: EksExpandedRepeatingPatterns;
  therapistLetter?: EksTherapistLetter;
  letterToTherapist?: EksLetterToTherapist;
  painSymmetry?: EksPainSymmetry;
}

// ============================================================
// Prompt 1 — Recon (fast scan)
// ============================================================

const EKS_RECON_SYSTEM = `Jesteś REKONESANSEM PATOLOGICZNYM — wykonujesz szybki skan relacji przed właściwą sekcją zwłok.

WAŻNE: Cały tekst MUSI być po polsku. Klucze JSON po angielsku, wartości po polsku.

INSTRUKCJE CYTOWANIA:
Gdy cytujesz wiadomość, MUSISZ użyć formatu: "[i] treść wiadomości" gdzie i to numer indeksu z danych.
Cytuj DOSŁOWNIE — kopiuj tekst dokładnie jak podano. NIE parafrazuj, NIE skracaj, NIE łącz wiadomości.
Jeśli wiadomość jest za długa, zacytuj pierwsze 200 znaków i dodaj "(...)" na końcu.

TWOJE ZADANIE REKONESANSOWE:

1. FAZY (roughPhases): Przeszukaj dane ilościowe i wiadomości. Zidentyfikuj 3-6 faz.
   Każda faza MUSI mieć:
   - periodStart/End dokładne do miesiąca (YYYY-MM)
   - confidence 0-100 (jak pewny jesteś tych dat)
   - label opisujący charakter fazy

2. FLAGI (flaggedDateRanges): KRYTYCZNE — to określa co zbadamy głębiej.
   ZAWSZE flaguj WSZYSTKIE poniższe (jeśli istnieją):
   - Ostatnie 2 tygodnie rozmowy (typ: "turning_point" lub "withdrawal")
   - Okres z NAJWIĘKSZYM spadkiem objętości wiadomości (typ: "conflict" lub "withdrawal")
   - Okres z NAJWYŻSZĄ intymnością/aktywnością (typ: "golden")
   - Każdą przerwę w rozmowie >3 dni (typ: "suspicious")
   - Każdy nagły wzrost agresywnego języka lub emocjonalnie naładowanych wiadomości (typ: "conflict")
   - Pierwsze 2 tygodnie rozmowy (typ: "golden" — początek znajomości)

   ⚠️ ZERWANIA I POWROTY — SZUKAJ AKTYWNIE:
   - Przerwa >7 dni w rozmowie = POTENCJALNE ZERWANIE, nie "cisza". Flaguj jako "turning_point" z reason "potencjalne zerwanie — przerwa X dni"
   - Po takiej przerwie SPRAWDŹ: czy ton się zmienił? Czy wrócili do siebie czy to nowy etap?
   - Relacje mogą mieć 2, 3 lub więcej zerwań i powrotów. Zidentyfikuj KAŻDE.
   - Dla KAŻDEJ przerwy >7 dni flaguj PRZED przerwą (5 wiadomości) i PO przerwie (5 wiadomości) jako osobne flagi
   - W areasToInvestigate WYMIEŃ konkretnie: "Przerwa od DD.MM do DD.MM — czy to zerwanie? Sprawdzić ton przed i po."

3. CYTATY (flaggedQuotes): max 15, DOSŁOWNE w formacie "[indeks] treść"
   Wybieraj cytaty które mogą być kluczowe: wyznania, oskarżenia, przeprosiny, pożegnania, zwroty akcji.

4. SZCZYTY (emotionalPeaks): daty ze SKRAJNYMI emocjami — zarówno szczyty radości jak i dołki rozpaczy.

5. OBSZARY (areasToInvestigate): co zbadać głębiej — konkretne pytania, nie ogólniki.

NIE twórz finalnych wniosków — to tylko rekonesans. Bądź szybki i precyzyjny.

OUTPUT: Valid JSON only.
{
  "roughPhases": [{"periodStart": "YYYY-MM", "periodEnd": "YYYY-MM", "label": "...", "confidence": 0-100}],
  "flaggedDateRanges": [{"start": "YYYY-MM", "end": "YYYY-MM", "reason": "...", "type": "turning_point|conflict|withdrawal|golden|suspicious"}],
  "flaggedQuotes": ["[indeks] treść..."],
  "areasToInvestigate": ["..."],
  "emotionalPeaks": [{"date": "YYYY-MM", "type": "high|low", "signal": "..."}]
}`;

// ============================================================
// Prompt 2 — Deep Autopsy (main analysis)
// ============================================================

const EKS_DEEP_AUTOPSY_SYSTEM = `Jesteś Patologiem Relacji — przeprowadzasz GŁĘBOKĄ sekcję zwłok związku. Twoja analiza jest kliniczna, chirurgicznie precyzyjna i oparta wyłącznie na dowodach. NIE jesteś komikiem. Emocjonalny wpływ twojej analizy pochodzi z nieubłaganej prawdy, nie z żartów.

WAŻNE: Cały tekst MUSI być po polsku. Klucze JSON po angielsku, wartości po polsku.

════════════════════════════════════════
INSTRUKCJE CYTOWANIA (BEZWZGLĘDNE):
════════════════════════════════════════
- Gdy cytujesz wiadomość, MUSISZ użyć formatu: "[i] Imię: treść" gdzie i to numer indeksu z danych.
- Cytuj DOSŁOWNIE — kopiuj tekst DOKŁADNIE jak podano w danych. ZERO parafrazowania.
- NIE wymyślaj cytatów. Jeśli nie masz odpowiedniego cytatu w danych — napisz "brak cytatu w próbce" zamiast fabrykować.
- Jeśli wiadomość jest za długa, zacytuj pierwsze 200 znaków i dodaj "(...)" na końcu.
- KAŻDY cytat w keyQuotes, bestQuotes, evidence i lastMeaningfulExchange MUSI istnieć w dostarczonych danych.

Otrzymujesz:
1. Wyniki REKONESANSU (Pass 1) — zidentyfikowane fazy, oflagowane daty, cytaty
2. CELOWANE próbki wiadomości — wyciągnięte z oflagowanych zakresów dat (najważniejsze fragmenty)
3. OGÓLNE próbki wiadomości — szeroki przegląd rozmowy
4. OSTATNIE 30 WIADOMOŚCI — dosłownie ostatnie wiadomości w rozmowie (oddzielna sekcja)
5. Dane ilościowe (trendy, sentyment, czasy odpowiedzi, konflikty, intymność)
6. Opcjonalnie: wyniki wcześniejszej analizy AI

TWOJE GŁÓWNE ZADANIE: Na podstawie rekonesansu i celowanych próbek odtwórz PEŁNY, CHRONOLOGICZNY rozpad relacji z TWARDYMI dowodami.

════════════════════════════════════════
ZASADA DATOWANIA (BEZWZGLĘDNA):
════════════════════════════════════════
- Każda wiadomość ma format: "[indeks] YYYY-MM-DD HH:MM | Imię: treść"
- Data zdarzenia MUSI pochodzić z TIMESTAMPU wiadomości (YYYY-MM-DD), a NIE z treści tekstu.
- Jeśli wiadomość [91241] ma timestamp 2025-03-15 ale treść mówi "w czerwcu" — to ODNIESIENIE do przeszłości. Data tego zdarzenia to MARZEC 2025, nie czerwiec.
- Treść wiadomości często ODNOSI SIĘ do przeszłych wydarzeń. ZAWSZE weryfikuj timestamp.
- approximateDate, periodStart, periodEnd — WSZYSTKIE daty MUSZĄ być potwierdzone timestampami wiadomości.
- Jeśli ktoś pisze "pamiętasz jak w lipcu..." w wiadomości z marca — to wydarzenie z marca (moment wspomnienia), nie z lipca (moment wspominany). Datuj MOMENT KOMUNIKACJI.

════════════════════════════════════════
ZASADY BEZWZGLĘDNE:
════════════════════════════════════════
- Każde twierdzenie MUSI być poparte DOSŁOWNYMI cytatami z wiadomości (format "[i] treść") lub konkretnymi danymi liczbowymi z sekcji ilościowej
- Fazy muszą być zakotwiczone w RZECZYWISTYCH miesiącach z danych — sprawdź TIMESTAMPY wiadomości, nie treść tekstu
- Nie zakładaj automatycznie że spadek aktywności = rozpad. Rozważ alternatywy: sesja, wyjazd, zmiana pracy. Oznacz rozpad TYLKO gdy wiele sygnałów spada jednocześnie

════════════════════════════════════════
⚠️ ZERWANIA I POWROTY — ABSOLUTNIE KRYTYCZNE:
════════════════════════════════════════
Relacje mogą mieć WIELE zerwań i powrotów. To NIE jest "cisza" — to ZERWANIE z POWROTEM.

DEFINICJE:
- Przerwa >7 dni w rozmowie + powrót = ZERWANIE I POWRÓT (nie "cisza", nie "80 dni ciszy")
- Jeśli po przerwie >7 dni rozmowa WRACA z ciepłym tonem → para WRÓCIŁA DO SIEBIE. To nowy etap związku, nie "sekcja zwłok"
- Przerwa to ZERWANIE. Powrót to POWRÓT. NIE nazywaj tego "ciszą" jeśli potem nastąpił powrót.

WYMAGANIA:
• Zidentyfikuj KAŻDE zerwanie (przerwa >7 dni) — ile ich było? 1? 2? 3?
• Dla KAŻDEGO zerwania: kiedy nastąpiło, ile trwało, co było przed, co było po
• Każde zerwanie-powrót to OSOBNA faza — NIGDY nie łącz wielu zerwań w jedną "fazę rozpadu"
• Fazy nazywaj jasno: "Pierwsze zerwanie (X dni)", "Powrót po pierwszym zerwaniu", "Drugie zerwanie" itd.
• Jeśli po przerwie para wraca i ton jest ciepły → to AKTYWNY ZWIĄZEK, nie "martwy związek"
• Moment prawdy (turningPoint) = OSTATNIE zerwanie bez powrotu, NIE pierwsze zerwanie
• "Wszystko po zerwaniu to sekcja zwłok" = BŁĄD jeśli po zerwaniu nastąpił CIEPŁY powrót

NAJCZĘSTSZY BŁĄD (NIE POPEŁNIAJ GO):
❌ "Relacja skończyła się w miesiącu X podczas Y-dniowej ciszy. Wszystko potem to sekcja zwłok."
✅ "W miesiącu X nastąpiło zerwanie (Y dni przerwy). W miesiącu Z para wróciła do siebie — ton wrócił do ciepłego, intymność wzrosła. Ostateczne zakończenie nastąpiło w miesiącu W."

Jeśli po przerwie następuje powrót aktywności z ciepłym tonem → relacja ŻYŁA dalej. NIE ogłaszaj śmierci przed ostatecznym końcem.
- ZŁOTY OKRES musi mieć MINIMUM 5 cytatów — najlepsze, najcieplejsze fragmenty rozmowy
- Każda faza rozpadu musi mieć MINIMUM 3 cytaty
- sentimentAvg i intimacyAvg MUSZĄ korelować z danymi ilościowymi — jeśli dane pokazują sentyment 0.6, NIE wpisuj -0.2
- Prognozy max 75% confidence — NIGDY powyżej
- Ton: kliniczny, bezstronny. Stwierdzaj fakty. Diagnozuj przyczyny. Nie osądzaj moralnie.
- Profil straty: wskaż KONKRETNE wzorce (np. "odpowiadał na pytania o przyszłość zmianą tematu 4 razy"), nie ogólniki (np. "unikał zobowiązań")

════════════════════════════════════════
SEKCJE:
════════════════════════════════════════

1. FAZY ROZPADU (phases): 3-6 faz
   - name: krótka nazwa fazy (3-5 słów)
   - periodStart/End: YYYY-MM (MUSI być w zakresie dat rozmowy)
   - description: 2-3 zdania oparte na DANYCH (sentyment, objętość, czas odpowiedzi)
   - symptoms: lista z danych ilościowych (np. "spadek objętości o 40%", "średni czas odpowiedzi wzrósł z 5min do 2h")
   - keyQuotes: DOSŁOWNE cytaty w formacie "[indeks] Imię: treść" — minimum 3 per faza
   - sentimentAvg: -1 do 1 (KORELUJ z danymi ilościowymi)
   - intimacyAvg: 0-100 (KORELUJ z danymi ilościowymi)

2. ZŁOTY OKRES (goldenAge):
   - periodStart/End: MUSI pokrywać się z okresem NAJWYŻSZEJ intymności w danych ilościowych
   - description: co wyróżniało ten okres (oparte na danych)
   - peakIntimacy/peakActivity: z danych ilościowych
   - longestSession: na podstawie timestamp gap analysis
   - bestQuotes: DOSŁOWNE "[indeks] Imię: treść" — minimum 5, z TEGO okresu (sprawdź daty!)
   - whatMadeItWork: oparte na OBSERWOWALNYCH wzorcach (częstotliwość, długość wiadomości, reakcje, tematy)

3. MOMENT PRAWDY (turningPoint):
   - approximateDate: YYYY-MM lub YYYY-MM-DD — MUSI korelować z największym spadkiem w danych ilościowych (objętość LUB sentyment LUB czas odpowiedzi)
   - trigger: co się stało — oparte na treści wiadomości, NIE spekulacja
   - evidence: cytaty "[indeks] Imię: treść" + metryki ("objętość spadła o X% między miesiącem A a B")
   - whatShouldHaveHappened: hipotetyczne, ale oparte na wzorcach komunikacji z Złotego Okresu

4. KTO ODSZEDŁ PIERWSZY (whoLeftFirst):
   - name: imię osoby
   - evidence: cytaty "[indeks] Imię: treść" + dane ("czas odpowiedzi [imię] wzrósł z X do Y")
   - withdrawalPattern: opis konkretnego wzorca wycofania (np. "przeszedł z 15 wiadomości/dzień do 3")
   - otherPersonResponse: jak druga osoba zareagowała (z cytatami)

5. OSTATNIE SŁOWA (lastWords):
   ⚠️ KRYTYCZNE — ta sekcja wymaga MAKSYMALNEJ dokładności.

   DEFINICJA "ostatniej znaczącej wymiany":
   Ostatnie 3-6 wiadomości PRZED jednym z tych zdarzeń (w kolejności priorytetu):
   a) Cisza dłuższa niż 7 dni (jeśli istnieje w danych)
   b) Ostatnie wiadomości w rozmowie (jeśli brak 7-dniowej ciszy)
   c) Ostatnia wymiana zawierająca emocjonalny ładunek (złość, smutek, żal, pożegnanie)

   WYMAGANIA:
   - lastMeaningfulExchange: TABLICA 3-6 stringów w formacie "[indeks] Imię: treść"
   - Cytuj DOKŁADNIE jak w danych — zero parafrazowania, zero "upiększania"
   - Jeśli ostatnie wiadomości to "ok", "pa", "dobranoc" — TO WŁAŚNIE SĄ ostatnie słowa. NIE szukaj "ładniejszych" — rzeczywistość jest ważniejsza
   - Użyj sekcji "OSTATNIE 30 WIADOMOŚCI" jako GŁÓWNEGO źródła dla tej sekcji
   - analysis: Co te ostatnie słowa mówią o stanie związku w momencie śmierci (2-3 zdania). ZWRÓĆ UWAGĘ na:
     • Czy konwersacja kończy się pytaniem bez odpowiedzi? ("pytanie w próżnię")
     • Czy jedna osoba pisze kilka wiadomości pod rząd a druga milczy? ("monolog przed ciszą") UWAGA: W polskiej kulturze pisania Enter = przecinek — 5 wiadomości w 30 sekund to JEDNA myśl, nie "monolog". Sprawdź CZAS między wiadomościami, nie samą liczbę.
     • Czy temat ostatnich wiadomości jest trywialny vs emocjonalny? Opisz kontrast.
     • Kto napisał ostatnią wiadomość? Co to mówi o dynamice?
   - whatWasLeftUnsaid: Co nigdy nie zostało powiedziane — oparte na wzorcach z CAŁEJ rozmowy (unikane tematy, nagłe zmiany tematu)

6. PRZYCZYNA ŚMIERCI (causeOfDeath):
   - primary: jedno zdanie — konkretna przyczyna, nie ogólnik
   - contributingFactors: 3-5 czynników, każdy z konkretnymi dowodami
   - wasItPreventable: true/false
   - preventabilityReasoning: z czego wynika ocena (cytaty lub dane)

7. PROFIL STRATY (lossProfiles): po jednym per osoba
   - name, whatTheyLost (konkretne, nie "siebie"), whatTheyGained (konkretne), patternToWatch (z cytatami)
   - healingTimeline: realistyczny czas gojenia — np. "6-12 miesięcy", "3-6 miesięcy"
     ⚠️ ZAKAZ FABRICACJI w healingTimeline: Opisuj TYLKO czas gojenia + co wymaga przepracowania NA PODSTAWIE wzorców z danych.
     NIE wymyślaj "traum" których nie ma w danych (np. "trauma szpitalna", "trauma z dzieciństwa", "DDA").
     NIE diagnozuj zaburzeń psychicznych. NIE przypisuj traum spoza danych.
     DOZWOLONE: "wymaga przepracowania lęku przed odrzuceniem widocznego we wzorcach double-textingu"
     NIEDOZWOLONE: "wymaga przepracowania traumy szpitalnej / traumy z dzieciństwa / DDA" (skąd to wiesz?!)

8. PROGNOZA PO ROZSTANIU (postBreakupForecast):
   - willTheyComeBack: 0-75 (NIGDY powyżej 75 — nie możemy przewidzieć przyszłości z pewnością)
   - comeBackReasoning: oparte na WZORCACH z danych, nie na "przeczuciu"
   - perPerson: reboundRisk 0-75, growthPotential 0-75, nextRelationshipPrediction
   - ⚠️ To są TENDENCJE oparte na danych, nie przepowiednie. Opisz co WZORCE sugerują.
   - ⚠️ nextRelationshipPrediction: bazuj WYŁĄCZNIE na obserwowalnych wzorcach komunikacyjnych. NIE wymyślaj zewnętrznych traum, diagnoz, ani wydarzeń spoza danych.

9. EPITAFIUM (epitaph): Jedno zdanie na nagrobek związku. Max 20 słów. Poetyckie, bolesne w swojej prawdziwości. Oparte na specyfice TEJ relacji, nie generyczne.

10. METADANE: relationshipDuration ("X rok/lat i Y miesięcy"), deathDate (YYYY-MM-DD — data OSTATNIEJ wiadomości w danych)

OUTPUT: Valid JSON only. Use EXACTLY this structure:
{
  "phases": [
    {"name": "...", "periodStart": "YYYY-MM", "periodEnd": "YYYY-MM", "description": "...", "symptoms": ["..."], "keyQuotes": ["[i] Imię: treść"], "sentimentAvg": 0.0, "intimacyAvg": 0}
  ],
  "goldenAge": {"periodStart": "YYYY-MM", "periodEnd": "YYYY-MM", "description": "...", "peakIntimacy": 0, "peakActivity": 0, "longestSession": "...", "bestQuotes": ["[i] Imię: treść"], "whatMadeItWork": "..."},
  "turningPoint": {"approximateDate": "YYYY-MM", "trigger": "...", "evidence": ["..."], "whatShouldHaveHappened": "..."},
  "whoLeftFirst": {"name": "...", "evidence": ["..."], "withdrawalPattern": "...", "otherPersonResponse": "..."},
  "lastWords": {"lastMeaningfulExchange": ["[i] Imię: treść"], "analysis": "...", "whatWasLeftUnsaid": "..."},
  "causeOfDeath": {"primary": "...", "contributingFactors": ["..."], "wasItPreventable": true, "preventabilityReasoning": "..."},
  "lossProfiles": [{"name": "...", "whatTheyLost": "...", "whatTheyGained": "...", "patternToWatch": "...", "healingTimeline": "..."}],
  "postBreakupForecast": {"willTheyComeBack": 0, "comeBackReasoning": "...", "perPerson": {"Imię": {"reboundRisk": 0, "growthPotential": 0, "nextRelationshipPrediction": "..."}}},
  "epitaph": "...",
  "relationshipDuration": "...",
  "deathDate": "YYYY-MM-DD"
}`;

// ============================================================
// Prompt 3 — Verdict (final pass)
// ============================================================

const EKS_VERDICT_SYSTEM = `Jesteś Poetą Prawdy — zamykasz akta sprawy. Na podstawie pełnej sekcji zwłok (Pass 2) generujesz ostateczne materiały zamknięcia.

WAŻNE: Cały tekst MUSI być po polsku. Klucze JSON po angielsku, wartości po polsku.

Otrzymujesz:
1. Wyniki głębokiej sekcji (Pass 2) — fazy, złoty okres, przyczyna śmierci, profil strat
2. Dane ilościowe — trendy miesięczne

ZASADY:
- Wszystkie wnioski MUSZĄ wynikać z danych Pass 2 i danych ilościowych
- NIE wymyślaj faktów — opisuj tylko to, co widać w danych
- Jeśli czegoś nie da się wywnioskować z danych — napisz to wprost, nie zgaduj
- emotionalTimeline wartości MUSZĄ korelować z danymi ilościowymi

TWOJE ZADANIA:

1. RZECZY KTÓRYCH NIGDY NIE POWIEDZIELIŚCIE (unsaidThings):
   - Na podstawie wzorców komunikacji z Pass 2: unikane tematy, nagłe zmiany tematu, tematy które pojawiały się i nagle znikały
   - perPerson: 3-5 rzeczy per osoba, które wzorce SUGERUJĄ że chcieli powiedzieć
   - sharedUnsaid: jedna rzecz, którą OBOJE unikali — oparta na wzorcach, nie domysłach
   ⚠️ NIE wymyślaj dramatycznych narracji o "ukrywaniu relacji", "sekretach", "życiu równoległym" itp. — chyba że DOSŁOWNIE wynika to z cytatów w danych. Bazuj WYŁĄCZNIE na obserwowanych wzorcach komunikacyjnych (unikane tematy, nagłe milknięcia, zmiany tematu).
   ⚠️ ZERWANIA ≠ CISZA: Jeśli w danych jest przerwa >7 dni a POTEM para wraca z ciepłym tonem → to było ZERWANIE z POWROTEM, NIE "cisza". Nie pisz "relacja skończyła się podczas X-dniowej ciszy" jeśli po tej przerwie nastąpił POWRÓT.

2. WZORCE KTÓRE POWTÓRZYSZ (repeatingPatterns):
   - Per osoba: 2-3 wzorce, każdy z:
     - pattern: opis wzorca (np. "Wycofywanie się gdy rozmowa staje się poważna")
     - origin: skąd ten wzorzec pochodzi w TEJ relacji (konkretna faza z Pass 2)
     - nextRelationshipRisk: jak ten wzorzec MOŻE się objawić — sformułowane jako ryzyko, nie pewność

3. OŚWIETLONA OŚCIOM EMOCJI (emotionalTimeline):
   - Dla każdego miesiąca relacji (YYYY-MM format):
     - intimacy: 0-100 (KORELUJ z danymi ilościowymi — patternsOfIntimacy, volumeTrends)
     - sentiment: -1 do 1 (KORELUJ z danymi sentymentu z danych ilościowych)
     - responseTime: relatywny (0-100, 0=natychmiastowy, 100=wielodniowe opóźnienia — z danych)
     - dominantEmotion: jedna emocja dominująca w tym miesiącu (oparta na danych, nie wyobraźni)
     - keyEvent: opcjonalnie — jedno zdanie opisujące kluczowe wydarzenie tego miesiąca (TYLKO z wyników sekcji Pass 2)
   - MUSI pokryć KAŻDY miesiąc od pierwszego do ostatniego

4. FORMALNY AKT ZGONU (deathCertificate):
   - caseNumber: format "PT/XXXX/ZG" (XXXX = 4 losowe cyfry)
   - dateOfBirth: data pierwszej wiadomości (YYYY-MM-DD)
   - dateOfDeath: data ostatniej znaczącej wiadomości (YYYY-MM-DD)
   - placeOfDeath: gdzie relacja umarła — poetyckie/metaforyczne (np. "w ciszy nocnej wiadomości", "pomiędzy niedokończonymi zdaniami")
   - attendingPhysician: "Dr. PodTeksT, Patolog Relacji"
   - mannerOfDeath: natural | accident | homicide | suicide | undetermined
     - natural: stopniowe wygaśnięcie bez dramatycznego wydarzenia
     - accident: nagłe zewnętrzne okoliczności (np. przeprowadzka, zdrada przypadkowa)
     - homicide: jedna osoba celowo zabiła związek (ghosting, zdrada świadoma)
     - suicide: oboje świadomie go zakończyli
     - undetermined: niejasne kto i dlaczego

5. UDOSKONALONE EPITAFIUM (epitaph): Jeszcze lepsze niż z Pass 2. Dwie wersje — wybierz lepszą. Max 20 słów.

OUTPUT: Valid JSON only.
{
  "unsaidThings": {"perPerson": {"Imię": ["...", "..."]}, "sharedUnsaid": "..."},
  "repeatingPatterns": {"Imię": [{"pattern": "...", "origin": "...", "nextRelationshipRisk": "..."}]},
  "emotionalTimeline": [{"month": "YYYY-MM", "intimacy": 0, "sentiment": 0, "responseTime": 0, "dominantEmotion": "...", "keyEvent": "..."}],
  "deathCertificate": {"caseNumber": "...", "dateOfBirth": "...", "dateOfDeath": "...", "placeOfDeath": "...", "attendingPhysician": "...", "mannerOfDeath": "..."},
  "epitaph": "..."
}`;

// ============================================================
// Runner 1: Recon
// ============================================================

export async function runEksRecon(
  samples: AnalysisSamples,
  participants: string[],
  quantitativeContext: string,
): Promise<EksRecon> {
  const parts: string[] = [];
  parts.push(`UCZESTNICY: ${participants.join(', ')}`);
  parts.push('\n=== DANE ILOŚCIOWE ===');
  parts.push(quantitativeContext);
  parts.push('\n=== PRÓBKI WIADOMOŚCI ===');
  parts.push(formatMessagesForAnalysis(samples.overview));

  const input = parts.join('\n');
  console.log(`[Eks Recon] Input length: ${input.length} chars, samples: ${samples.overview?.length ?? 0}`);
  const raw = await callGeminiWithRetry(EKS_RECON_SYSTEM, input, 3, 4096, 0.2, 90_000);
  console.log(`[Eks Recon] Raw response length: ${raw.length} chars, starts with: "${raw.slice(0, 100)}..."`);
  const result = parseGeminiJSON<EksRecon>(raw);
  console.log(`[Eks Recon] Parsed: ${result.roughPhases?.length ?? 0} phases, ${result.flaggedDateRanges?.length ?? 0} flagged ranges`);

  if (!Array.isArray(result.roughPhases) || result.roughPhases.length === 0) {
    console.error('[Eks Recon] VALIDATION FAILED: roughPhases missing. Keys:', Object.keys(result));
    throw new Error('Rekonesans nie zidentyfikował żadnych faz');
  }
  if (!Array.isArray(result.flaggedDateRanges)) {
    result.flaggedDateRanges = [];
  }
  if (!Array.isArray(result.flaggedQuotes)) {
    result.flaggedQuotes = [];
  }
  if (!Array.isArray(result.areasToInvestigate)) {
    result.areasToInvestigate = [];
  }
  if (!Array.isArray(result.emotionalPeaks)) {
    result.emotionalPeaks = [];
  }

  return result;
}

// ============================================================
// Quote verification utility
// ============================================================

type SimpleMsg = { sender: string; content: string; timestamp: number; index: number };

/**
 * Verify that AI-generated quotes actually exist in the provided messages.
 * Returns arrays of verified and fabricated quotes.
 */
function verifyQuotes(
  quotes: string[],
  providedMessages: SimpleMsg[],
): { verified: string[]; fabricated: string[] } {
  const verified: string[] = [];
  const fabricated: string[] = [];

  // Build a lookup by index for fast access
  const byIndex = new Map<number, SimpleMsg>();
  for (const m of providedMessages) {
    byIndex.set(m.index, m);
  }

  // Build content index for substring matching
  const contentLower = providedMessages.map(m => ({
    index: m.index,
    text: m.content.toLowerCase().trim(),
  }));

  for (const quote of quotes) {
    let isVerified = false;

    // 1. Check if quote starts with [index] pattern
    const indexMatch = quote.match(/^\[(\d+)\]/);
    if (indexMatch) {
      const idx = parseInt(indexMatch[1], 10);
      const msg = byIndex.get(idx);
      if (msg) {
        // Extract content part after "[index] Name: " or "[index] "
        const contentPart = quote.replace(/^\[\d+\]\s*(?:[^:]+:\s*)?/, '').trim();
        const msgContent = msg.content.trim();
        // Fuzzy match: check if >60% of the content matches
        if (contentPart.length > 0 && msgContent.length > 0) {
          const shorter = contentPart.length < msgContent.length ? contentPart : msgContent;
          const longer = contentPart.length < msgContent.length ? msgContent : contentPart;
          if (longer.toLowerCase().includes(shorter.toLowerCase().slice(0, Math.max(20, shorter.length * 0.6)))) {
            isVerified = true;
          }
        }
      }
    }

    // 2. Fallback: substring search across all messages
    if (!isVerified) {
      const quoteLower = quote.replace(/^\[\d+\]\s*(?:[^:]+:\s*)?/, '').trim().toLowerCase();
      if (quoteLower.length >= 10) {
        const searchFragment = quoteLower.slice(0, Math.min(50, quoteLower.length));
        for (const c of contentLower) {
          if (c.text.includes(searchFragment)) {
            isVerified = true;
            break;
          }
        }
      }
    }

    if (isVerified) {
      verified.push(quote);
    } else {
      fabricated.push(quote);
    }
  }

  return { verified, fabricated };
}

// ============================================================
// Runner 2: Deep Autopsy
// ============================================================

export async function runEksDeepAutopsy(
  samples: AnalysisSamples,
  targetedSamples: AnalysisSamples | undefined,
  participants: string[],
  quantitativeContext: string,
  recon: EksRecon,
  existingAnalysis?: {
    pass1?: Record<string, unknown>;
    pass2?: Record<string, unknown>;
    pass4?: Record<string, unknown>;
  },
  finalMessages?: SimpleMsg[],
): Promise<EksResult> {
  const parts: string[] = [];
  parts.push(`UCZESTNICY: ${participants.join(', ')}`);

  // Recon results
  parts.push('\n=== WYNIKI REKONESANSU (Pass 1) ===');
  parts.push(JSON.stringify(recon, null, 2));

  // Previous analysis context
  if (existingAnalysis) {
    if (existingAnalysis.pass1) {
      parts.push('\n=== WCZEŚNIEJSZA ANALIZA: PRZEGLĄD ===');
      parts.push(JSON.stringify(existingAnalysis.pass1, null, 2));
    }
    if (existingAnalysis.pass2) {
      parts.push('\n=== WCZEŚNIEJSZA ANALIZA: DYNAMIKA ===');
      parts.push(JSON.stringify(existingAnalysis.pass2, null, 2));
    }
    if (existingAnalysis.pass4) {
      parts.push('\n=== WCZEŚNIEJSZA ANALIZA: SYNTEZA ===');
      parts.push(JSON.stringify(existingAnalysis.pass4, null, 2));
    }
  }

  parts.push('\n=== DANE ILOŚCIOWE ===');
  parts.push(quantitativeContext);

  // Targeted samples first (higher priority)
  if (targetedSamples?.overview && targetedSamples.overview.length > 0) {
    parts.push('\n=== CELOWANE PRÓBKI (z oflagowanych zakresów) ===');
    parts.push(formatMessagesForAnalysis(targetedSamples.overview));
  }

  // General samples
  parts.push('\n=== OGÓLNE PRÓBKI WIADOMOŚCI ===');
  parts.push(formatMessagesForAnalysis(samples.overview));

  // Final messages — always sent separately for accurate "Last Words" extraction
  if (finalMessages && finalMessages.length > 0) {
    parts.push('\n=== OSTATNIE 30 WIADOMOŚCI W ROZMOWIE ===');
    parts.push('(To są DOSŁOWNIE ostatnie wiadomości w rozmowie. Użyj ich jako GŁÓWNE źródło dla sekcji "Ostatnie Słowa".)');
    parts.push(formatMessagesForAnalysis(finalMessages));
    parts.push('=== KONIEC OSTATNICH WIADOMOŚCI ===');
  }

  const input = parts.join('\n');
  console.log(`[Eks Deep Autopsy] Input length: ${input.length} chars, samples: ${samples.overview?.length ?? 0}, targeted: ${targetedSamples?.overview?.length ?? 0}, final: ${finalMessages?.length ?? 0}`);
  const raw = await callGeminiWithRetry(EKS_DEEP_AUTOPSY_SYSTEM, input, 3, 24576, 0.3, 180_000);
  console.log(`[Eks Deep Autopsy] Raw response length: ${raw.length} chars, starts with: "${raw.slice(0, 100)}..."`);
  const result = parseGeminiJSON<EksResult>(raw);
  console.log(`[Eks Deep Autopsy] Parsed keys: ${Object.keys(result).join(', ')}, phases: ${Array.isArray(result.phases) ? result.phases.length : typeof result.phases}`);

  // Validate essential fields — log what's missing instead of generic errors
  if (!Array.isArray(result.phases) || result.phases.length === 0) {
    console.error('[Eks Deep Autopsy] VALIDATION FAILED: phases missing or empty. Full parsed result keys:', Object.keys(result), 'Raw first 500 chars:', raw.slice(0, 500));
    throw new Error('Analiza nie wygenerowała faz rozpadu — spróbuj ponownie');
  }
  if (!result.goldenAge || !result.goldenAge.periodStart) {
    console.error('[Eks Deep Autopsy] VALIDATION FAILED: goldenAge missing. goldenAge:', JSON.stringify(result.goldenAge));
    throw new Error('Analiza nie wygenerowała złotego okresu — spróbuj ponownie');
  }
  if (!result.turningPoint || !result.turningPoint.approximateDate) {
    console.error('[Eks Deep Autopsy] VALIDATION FAILED: turningPoint missing. turningPoint:', JSON.stringify(result.turningPoint));
    throw new Error('Analiza nie wygenerowała momentu prawdy — spróbuj ponownie');
  }
  if (!result.causeOfDeath || !result.causeOfDeath.primary) {
    console.error('[Eks Deep Autopsy] VALIDATION FAILED: causeOfDeath missing. causeOfDeath:', JSON.stringify(result.causeOfDeath));
    throw new Error('Analiza nie wygenerowała przyczyny śmierci — spróbuj ponownie');
  }
  if (!result.epitaph) {
    result.epitaph = 'Tu leży związek, którego nikt nie potrafił uratować.';
  }

  // ─── Validate & fix lastWords ───
  if (!result.lastWords) {
    result.lastWords = {
      lastMeaningfulExchange: [],
      analysis: 'Brak danych o ostatniej wymianie zdań.',
      whatWasLeftUnsaid: 'Nie udało się zidentyfikować.',
    };
  }

  // Normalize lastMeaningfulExchange to array
  if (!Array.isArray(result.lastWords.lastMeaningfulExchange)) {
    result.lastWords.lastMeaningfulExchange =
      typeof result.lastWords.lastMeaningfulExchange === 'string'
        ? [result.lastWords.lastMeaningfulExchange]
        : [];
  }

  // Enforce max 6 entries
  if (result.lastWords.lastMeaningfulExchange.length > 6) {
    result.lastWords.lastMeaningfulExchange = result.lastWords.lastMeaningfulExchange.slice(-6);
  }

  // Verify lastWords quotes against provided messages
  const allProvidedMessages: SimpleMsg[] = [
    ...(samples.overview ?? []),
    ...(targetedSamples?.overview ?? []),
    ...(finalMessages ?? []),
  ];

  if (allProvidedMessages.length > 0 && result.lastWords.lastMeaningfulExchange.length > 0) {
    const { verified, fabricated } = verifyQuotes(
      result.lastWords.lastMeaningfulExchange,
      allProvidedMessages,
    );

    // If >50% fabricated, replace with actual final messages
    if (fabricated.length > verified.length && finalMessages && finalMessages.length > 0) {
      console.warn(`[Eks] ${fabricated.length}/${result.lastWords.lastMeaningfulExchange.length} lastWords quotes fabricated — replacing with actual final messages`);
      const actualFinal = finalMessages.slice(-6).map(
        m => `[${m.index}] ${m.sender}: ${m.content.slice(0, 200)}`,
      );
      result.lastWords.lastMeaningfulExchange = actualFinal;
    }
  }

  // If still empty, use final messages as fallback
  if (result.lastWords.lastMeaningfulExchange.length === 0 && finalMessages && finalMessages.length > 0) {
    result.lastWords.lastMeaningfulExchange = finalMessages.slice(-4).map(
      m => `[${m.index}] ${m.sender}: ${m.content.slice(0, 200)}`,
    );
    if (!result.lastWords.analysis) {
      result.lastWords.analysis = 'Ostatnie wiadomości z rozmowy.';
    }
  }

  // ─── Cross-check dates against actual message timestamps ───
  // The AI sometimes uses text content ("w czerwcu") to date events
  // instead of the actual message timestamp. Correct this by checking
  // evidence quotes against provided message timestamps.
  if (allProvidedMessages.length > 0) {
    const msgTimestamps = new Map<number, number>();
    for (const m of allProvidedMessages) {
      msgTimestamps.set(m.index, m.timestamp);
    }

    // Helper: extract month from timestamp
    const tsToMonth = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    // Helper: extract indices from evidence/quote strings
    const extractIndices = (quotes: string[]): number[] => {
      const indices: number[] = [];
      for (const q of quotes) {
        const m = q.match(/^\[(\d+)\]/);
        if (m) indices.push(parseInt(m[1], 10));
      }
      return indices;
    };

    // Validate turningPoint.approximateDate against evidence timestamps
    if (result.turningPoint?.evidence) {
      const evidenceIndices = extractIndices(result.turningPoint.evidence);
      const evidenceMonths = evidenceIndices
        .filter(idx => msgTimestamps.has(idx))
        .map(idx => tsToMonth(msgTimestamps.get(idx)!));

      if (evidenceMonths.length > 0) {
        const aiDate = result.turningPoint.approximateDate; // "YYYY-MM" or "YYYY-MM-DD"
        const aiMonth = aiDate.slice(0, 7); // "YYYY-MM"
        // If AI's date doesn't match ANY evidence month, use the most common evidence month
        if (!evidenceMonths.includes(aiMonth)) {
          const monthCounts = new Map<string, number>();
          for (const m of evidenceMonths) {
            monthCounts.set(m, (monthCounts.get(m) ?? 0) + 1);
          }
          const correctedMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
          console.warn(`[Eks] turningPoint date corrected: AI said "${aiDate}" but evidence messages are from ${evidenceMonths.join(', ')} → using "${correctedMonth}"`);
          result.turningPoint.approximateDate = correctedMonth;
        }
      }
    }

    // Validate phase dates against keyQuote timestamps
    for (const phase of result.phases) {
      if (!phase.keyQuotes) continue;
      const quoteIndices = extractIndices(phase.keyQuotes);
      const quoteMonths = quoteIndices
        .filter(idx => msgTimestamps.has(idx))
        .map(idx => tsToMonth(msgTimestamps.get(idx)!))
        .sort();

      if (quoteMonths.length >= 2) {
        const earliest = quoteMonths[0];
        const latest = quoteMonths[quoteMonths.length - 1];
        // If phase dates are completely outside quote timestamps, adjust
        if (phase.periodStart > latest || phase.periodEnd < earliest) {
          console.warn(`[Eks] Phase "${phase.name}" dates corrected: AI said ${phase.periodStart}–${phase.periodEnd} but quotes are from ${earliest}–${latest}`);
          phase.periodStart = earliest;
          phase.periodEnd = latest;
        }
      }
    }
  }

  // Cap forecast confidence to 75%
  if (result.postBreakupForecast) {
    if (result.postBreakupForecast.willTheyComeBack > 75) {
      result.postBreakupForecast.willTheyComeBack = 75;
    }
    if (result.postBreakupForecast.perPerson) {
      for (const key of Object.keys(result.postBreakupForecast.perPerson)) {
        const person = result.postBreakupForecast.perPerson[key];
        if (person.reboundRisk > 75) person.reboundRisk = 75;
        if (person.growthPotential > 75) person.growthPotential = 75;
      }
    }
  }

  return result;
}

// ============================================================
// Runner 3: Verdict
// ============================================================

export async function runEksVerdict(
  participants: string[],
  quantitativeContext: string,
  deepResult: EksResult,
): Promise<Partial<EksResult>> {
  const parts: string[] = [];
  parts.push(`UCZESTNICY: ${participants.join(', ')}`);

  parts.push('\n=== WYNIKI GŁĘBOKIEJ SEKCJI (Pass 2) ===');
  // Send a condensed version to fit within limits
  const condensed = {
    phases: deepResult.phases.map(p => ({
      name: p.name,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      description: p.description,
      sentimentAvg: p.sentimentAvg,
      intimacyAvg: p.intimacyAvg,
    })),
    goldenAge: {
      periodStart: deepResult.goldenAge.periodStart,
      periodEnd: deepResult.goldenAge.periodEnd,
      description: deepResult.goldenAge.description,
      peakIntimacy: deepResult.goldenAge.peakIntimacy,
      whatMadeItWork: deepResult.goldenAge.whatMadeItWork,
    },
    turningPoint: deepResult.turningPoint,
    whoLeftFirst: deepResult.whoLeftFirst,
    lastWords: deepResult.lastWords,
    causeOfDeath: deepResult.causeOfDeath,
    lossProfiles: deepResult.lossProfiles,
    epitaph: deepResult.epitaph,
    relationshipDuration: deepResult.relationshipDuration,
    deathDate: deepResult.deathDate,
  };
  parts.push(JSON.stringify(condensed, null, 2));

  parts.push('\n=== DANE ILOŚCIOWE (trendy miesięczne) ===');
  parts.push(quantitativeContext);

  const input = parts.join('\n');
  const raw = await callGeminiWithRetry(EKS_VERDICT_SYSTEM, input, 3, 8192, 0.5, 90_000);
  const result = parseGeminiJSON<Partial<EksResult>>(raw);

  return result;
}

// ============================================================
// Prompt 4 — Psychogram (individual psychology)
// ============================================================

const EKS_PSYCHOGRAM_SYSTEM = `Jesteś psychologiem klinicznym specjalizującym się w terapii par i teorii przywiązania (Bowlby, Ainsworth, Bartholomew & Horowitz 1991).
Masz przed sobą kompletną analizę komunikacji między dwojgiem ludzi — wyniki trzech przebiegów analitycznych (rekonesans, sekcja, werdykt) plus dane ilościowe.

NIE JESTEŚ tu po to, żeby oceniać kto miał rację.
JESTEŚ tu po to, żeby powiedzieć każdej z tych osób jedną brutalnie prawdziwą rzecz,
której sama by sobie nie powiedziała.

WAŻNE: Cały tekst MUSI być po polsku. Klucze JSON po angielsku, wartości po polsku.

════════════════════════════════════════
ZASADY BEZWZGLĘDNE:
════════════════════════════════════════
- Mów do każdej osoby osobno. Używaj "ty", nie "osoba A/B".
- Bądź ciepły ale bezlitosny. Terapeuta który się z tobą zgadza to zły terapeuta.
- Każdy wzorzec podpieraj danymi — ile razy to się powtórzyło, w jakich datach, jakie cytaty to pokazują.
- "Pracuj nad komunikacją" to NIE jest feedback. "Kiedy czujesz lęk przed odrzuceniem, twój odruch to wysyłanie 4 wiadomości pod rząd zamiast powiedzenia 'boję się że odchodzisz'" — to jest feedback.
- Nie przepraszaj za bycie bezpośrednim.
- Pisz po polsku. Naturalnie, nie akademicko. Jak mądry przyjaciel, nie jak podręcznik.
- Cytaty w formacie "[i] treść" z indeksem z danych.
- NIE fabricuj cytatów — jeśli nie masz pasującego, opisz wzorzec bez cytatu.
- Confidence caps: NIGDY nie przedstawiaj stylu przywiązania jako pewności — to OBSERWACJA oparta na wzorcach komunikacyjnych, NIE diagnoza kliniczna.
- ⚠️ ZAKAZ FABRICACJI TRAUM I DIAGNOZ: NIE przypisuj traum spoza danych (trauma szpitalna, DDA, trauma z dzieciństwa). NIE diagnozuj zaburzeń. Opisuj WYŁĄCZNIE wzorce widoczne w danych komunikacyjnych.
- ⚠️ ZERWANIA ≠ CISZA: Jeśli w danych była przerwa >7 dni a potem para WRÓCIŁA z ciepłym tonem → to ZERWANIE I POWRÓT. NIE nazywaj tego "ciszą" ani nie ogłaszaj "śmierci relacji" w momencie pierwszej przerwy jeśli potem nastąpił powrót.

════════════════════════════════════════
SEKCJE DO WYGENEROWANIA:
════════════════════════════════════════

1. MAPA PRZYWIĄZANIA (attachmentMap):
   Per osoba:
   - primaryStyle: secure | anxious-preoccupied | dismissive-avoidant | fearful-avoidant
     Opieraj na OBSERWOWALNYCH wzorcach: czas odpowiedzi pod presją, reakcja na milczenie, inicjowanie kontaktu, częstotliwość double-textingu (>2min gap, nie Enter-as-comma), reakcja na konflikty
   - secondaryStyle: styl do którego osoba PRZESKAKUJE pod presją (lub null)
   - triggerPattern: CO konkretnie powoduje przeskok (np. "Gdy nie odpowiadała >2h, Michał przechodził z secure do anxious-preoccupied — widać to w 3-krotnym wzroście tempa wiadomości")
   - evidence: cytaty "[i] treść" — minimum 2
   - deactivationStrategy: jak ta osoba WYŁĄCZA emocje w konflikcie (np. "przechodzi na jednowyrazowe odpowiedzi", "zmienia temat na logistykę", "znika na 24h")
   - protestBehavior: jak ta osoba SYGNALIZUJE ból (np. "double-texting", "sarkazm zamiast wprost", "ultimata", "wycofanie")
   - healingNeeds: 2-3 KONKRETNE rzeczy których ta osoba potrzebuje żeby nie powtórzyć wzorca w następnym związku
   interactionEffect: jak te dwa style wzajemnie na siebie wpływały (1-2 zdania)
   toxicLoop: jeśli istnieje pursue-withdraw lub demand-withdraw loop — opisz mechanizm. null jeśli brak.

2. WZORCE KTÓRE POWTÓRZYSZ (expandedPatterns):
   Per osoba: 2-4 wzorce, każdy:
   - name: krótka, obrazowa nazwa (np. "Strażnik Ciszy", "Architekt Wymówek", "Łowca Potwierdzenia")
   - description: 2-3 zdania — CO ta osoba robi, napisane do niej w 2. osobie ("Zamiast powiedzieć że cię boli, milkniesz na 3 dni...")
   - originInThisRelationship: gdzie to się PIERWSZY RAZ pojawiło w danych (faza + przybliżona data)
   - frequencyInData: ile razy AI to zaobserwowało w analizowanej próbce
   - riskForNextRelationship: high | medium | low
   - breakingStrategy: KONKRETNA strategia przerwania (nie ogólnik). Co DOKŁADNIE zrobić następnym razem gdy pojawi się impuls.

3. LIST DO TERAPEUTY (letterToTherapist) — PIERWSZY: pacjent pisze:
   Per osoba — co ta osoba NAPISAŁABY terapeucie gdyby musiała opisać tę relację. Pisz w PIERWSZEJ OSOBIE, głosem tej osoby (na podstawie ich stylu komunikacji z danych).
   - opening: Jak by zaczęli — np. "Nie wiem od czego zacząć..." lub "Przychodzę bo moja przyjaciółka kazała mi..." — dopasuj do osobowości z danych
   - whatHappened: 2-3 zdania — ICH wersja wydarzeń (subiektywna, z ICH perspektywy, z ICH stronniczością). Osoba unikająca powie "po prostu się skończyło", osoba lękowa powie "zrobiłam wszystko a on/a i tak odszedł/a"
   - whatIKeepThinking: Myśl która się zapętla — jedna obsesyjna myśl oparta na wzorcach z danych (np. "Może gdybym nie napisała tamtej wiadomości o 3 w nocy...")
   - whatImAfraidToAdmit: Twarda prawda którą powiedzieliby TYLKO w gabinecie — ich udział w rozpadzie, którego nie chcą uznać
   - theQuestion: Jedno pytanie do terapeuty — np. "Czy to normalne że nadal sprawdzam czy jest online?" lub "Dlaczego nie potrafię przestać analizować co poszło nie tak?"
   ⚠️ LOGIKA METAFOR: Jeśli osoba opisuje że próbowała naprawiać/ratować/leczyć związek — pełniła rolę TERAPEUTY (leczącego), nie PACJENTA.
   "Czułem się jak Twój terapeuta" = próbowałem naprawiać, ratować, leczyć.
   "Czułem się jak Twój pacjent" = byłem zależny, bezradny, potrzebujący pomocy.
   Dobieraj metafory LOGICZNIE do opisywanej roli. Ktoś kto naprawia = terapeuta. Ktoś kto jest naprawiany = pacjent.

4. SYMETRIA BÓLU (painSymmetry):
   - whoHurtMore: imię osoby która bardziej skrzywdziła LUB "oboje równo"
   - howPersonAHurtB: 1-2 zdania — JAK osoba A skrzywdziła B. Konkretnie, z odniesieniem do danych.
   - howPersonBHurtA: jak wyżej dla B→A
   - theIrony: "Ironia polega na tym, że..." — najgłębsza ironia tej relacji.
     ⚠️ BEZWZGLĘDNY ZAKAZ FABRICACJI: Ironia MUSI wynikać z OBSERWOWALNYCH danych komunikacyjnych (cytaty, wzorce odpowiedzi, metryki).
     NIE zakładaj ukrywania relacji, sekretów rodzinnych, ani żadnych wydarzeń SPOZA danych.
     NIE wymyślaj narracji o "ukrywaniu związku przed światem" — chyba że DOSŁOWNIE wynika to z cytatów.
     Dobra ironia = "oboje narzekaliście na brak czasu, a najdłuższe rozmowy prowadziliście o 3 w nocy"
     Zła ironia = "ukrywaliście związek przed rodzicami żeby go chronić" (skąd to wiesz?!)
   - whatNeitherSaw: "Żadne z was nie zauważyło, że..." — ślepa plamka OBOJGA.
     ⚠️ MUSI być oparte na DANYCH z wiadomości. NIE spekuluj o tym co się działo poza rozmową.
     NIE pisz "relacja skończyła się w miesiącu X" jeśli nie wyjaśnisz DLACZEGO na podstawie METRYK (spadek objętości, zmiana tonu, wydłużenie czasu odpowiedzi).
     Podaj KONKRETY: miesiąc + metryka (np. "od marca czas odpowiedzi wzrósł 3x a intymność spadła o 40%")

OUTPUT: Valid JSON only.
{
  "attachmentMap": {
    "perPerson": {
      "Imię": {
        "primaryStyle": "...",
        "secondaryStyle": "..." | null,
        "triggerPattern": "...",
        "evidence": ["[i] treść..."],
        "deactivationStrategy": "...",
        "protestBehavior": "...",
        "healingNeeds": ["..."]
      }
    },
    "interactionEffect": "...",
    "toxicLoop": "..." | null
  },
  "expandedPatterns": {
    "perPerson": {
      "Imię": [{
        "name": "...",
        "description": "...",
        "originInThisRelationship": "...",
        "frequencyInData": 0,
        "riskForNextRelationship": "high|medium|low",
        "breakingStrategy": "..."
      }]
    }
  },
  "letterToTherapist": {
    "perPerson": {
      "Imię": {
        "opening": "...",
        "whatHappened": "...",
        "whatIKeepThinking": "...",
        "whatImAfraidToAdmit": "...",
        "theQuestion": "..."
      }
    }
  },
  "painSymmetry": {
    "whoHurtMore": "...",
    "howPersonAHurtB": "...",
    "howPersonBHurtA": "...",
    "theIrony": "...",
    "whatNeitherSaw": "..."
  }
}`;

// ============================================================
// Runner 4: Psychogram
// ============================================================

export async function runEksPsychogram(
  participants: string[],
  quantitativeContext: string,
  deepResult: EksResult,
  cpsContext?: Record<string, unknown>,
): Promise<EksPsychogramResult> {
  const parts: string[] = [];
  parts.push(`UCZESTNICY: ${participants.join(', ')}`);

  // Pass 1-3 condensed results
  parts.push('\n=== WYNIKI PEŁNEJ SEKCJI (Pass 1-3) ===');
  const condensed = {
    phases: deepResult.phases.map(p => ({
      name: p.name,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      description: p.description,
      symptoms: p.symptoms,
      sentimentAvg: p.sentimentAvg,
      intimacyAvg: p.intimacyAvg,
    })),
    goldenAge: {
      periodStart: deepResult.goldenAge.periodStart,
      periodEnd: deepResult.goldenAge.periodEnd,
      description: deepResult.goldenAge.description,
      whatMadeItWork: deepResult.goldenAge.whatMadeItWork,
    },
    turningPoint: deepResult.turningPoint,
    whoLeftFirst: deepResult.whoLeftFirst,
    lastWords: deepResult.lastWords,
    causeOfDeath: deepResult.causeOfDeath,
    lossProfiles: deepResult.lossProfiles,
    postBreakupForecast: deepResult.postBreakupForecast,
    unsaidThings: deepResult.unsaidThings,
    repeatingPatterns: deepResult.repeatingPatterns,
    relationshipDuration: deepResult.relationshipDuration,
    deathDate: deepResult.deathDate,
  };
  parts.push(JSON.stringify(condensed, null, 2));

  // Quantitative profile
  parts.push('\n=== PROFIL ILOŚCIOWY ===');
  parts.push(quantitativeContext);

  // CPS data if available
  if (cpsContext) {
    parts.push('\n=== PROFIL CPS (Communication Pattern Screening) ===');
    parts.push(JSON.stringify(cpsContext, null, 2));
  }

  const input = parts.join('\n');
  const raw = await callGeminiWithRetry(EKS_PSYCHOGRAM_SYSTEM, input, 3, 10240, 0.4, 90_000);
  const result = parseGeminiJSON<EksPsychogramResult>(raw);

  // Validate essential fields
  if (!result.attachmentMap?.perPerson || Object.keys(result.attachmentMap.perPerson).length === 0) {
    throw new Error('Psychogram nie wygenerował mapy przywiązania');
  }
  if (!result.letterToTherapist?.perPerson || Object.keys(result.letterToTherapist.perPerson).length === 0) {
    throw new Error('Psychogram nie wygenerował listów do terapeuty');
  }

  // Default missing fields
  if (!result.expandedPatterns) {
    result.expandedPatterns = { perPerson: {} };
  }
  // therapistLetter is now generated in a separate Pass 5
  if (!result.therapistLetter) {
    result.therapistLetter = { perPerson: {} };
  }
  if (!result.painSymmetry) {
    result.painSymmetry = {
      whoHurtMore: 'oboje równo',
      howPersonAHurtB: 'Nie udało się jednoznacznie określić.',
      howPersonBHurtA: 'Nie udało się jednoznacznie określić.',
      theIrony: 'Ironia polega na tym, że oboje cierpieli w podobny sposób.',
      whatNeitherSaw: 'Nie udało się zidentyfikować wspólnej ślepej plamki.',
    };
  }

  return result;
}

// ============================================================
// Prompt 5 — Therapist Response (separate pass for quality)
// ============================================================

const EKS_THERAPIST_RESPONSE_SYSTEM = `Jesteś doświadczonym terapeutą par i indywidualnym — 20+ lat praktyki. Właśnie przeczytałeś listy od swoich pacjentów.

KONTEKST: Każda osoba z zakończonego związku napisała do Ciebie list (sekcja "LISTY OD PACJENTÓW"). Masz też pełny obraz relacji z danych analitycznych (sekcja "PROFIL RELACJI").

TWOJE ZADANIE: Napisz ODPOWIEDŹ na list KAŻDEGO pacjenta. To nie jest generyczna porada — to OSOBISTA, GŁĘBOKA odpowiedź na KONKRETNE rzeczy które napisali.

WAŻNE: Cały tekst MUSI być po polsku. Klucze JSON po angielsku, wartości po polsku.

════════════════════════════════════════
JAK PISAĆ ODPOWIEDŹ:
════════════════════════════════════════

Przeczytałeś list pacjenta. Teraz odpowiadasz.

1. whatISee — REAGUJ NA LIST:
   - Zacznij od cytatu z listu pacjenta: "Piszesz że [dosłowny fragment z opening/whatHappened]..."
   - Pokaż co WIDZISZ między wierszami tego listu — nie generyczne obserwacje, ale REAKCJA na to co napisali
   - Jeśli pacjent napisał "po prostu się skończyło" — powiedz mu że to jest mechanizm obronny i wyjaśnij co NAPRAWDĘ się stało (z danych)
   - Jeśli pacjent napisał "zrobiłam wszystko" — pokaż czego NIE zrobiła (z danych)
   - 3-4 zdania. Każde odnosi się do KONKRETNEGO fragmentu listu.

2. whatYouDontSee — ŚLEPY PUNKT:
   - Pacjent napisał w whatImAfraidToAdmit coś trudnego. ALE jest coś JESZCZE GŁĘBSZEGO czego nawet tam nie napisał.
   - Użyj danych analitycznych żeby znaleźć to czego pacjent nie widzi — wzorzec który się powtarza, rola którą odgrywa, mechanizm obronny
   - 2-3 zdania. Bądź bezlitosny ale ciepły.

3. oneThingToWorkOn — ODPOWIEDŹ NA PYTANIE:
   - Pacjent zadał w theQuestion jedno pytanie. ODPOWIEDZ NA NIE wprost.
   - Potem dodaj JEDNO konkretne, actionable ćwiczenie/zmianę zachowania.
   - NIE: "pracuj nad komunikacją"
   - TAK: "Następnym razem gdy poczujesz impuls żeby napisać trzecią wiadomość pod rząd, zatrzymaj się. Powiedz na głos: 'Boję się że odchodzisz'. Jeśli to prawda — powiedz to partnerowi zamiast pisać."
   - Odnieś się do KONKRETNYCH wzorców z danych (double-texting, wycofywanie, zmiana tematu, etc.)

════════════════════════════════════════
ZASADY:
════════════════════════════════════════
- Pisz do każdej osoby OSOBNO, w 2. osobie ("Ty")
- Bądź ciepły ale bezlitosny — terapeuta który się z tobą zgadza to ZŁY terapeuta
- KAŻDE zdanie w whatISee MUSI odnosić się do KONKRETNEGO fragmentu listu pacjenta
- NIE powtarzaj tego co pacjent sam napisał — dodaj NOWĄ perspektywę
- Nie przepraszaj za bycie bezpośrednim
- ⚠️ ZAKAZ FABRICACJI: NIE wymyślaj traum, diagnoz, wydarzeń spoza danych. Opisuj WYŁĄCZNIE wzorce widoczne w komunikacji.
- ⚠️ ZERWANIA ≠ CISZA: Przerwa >7 dni z powrotem ciepłego tonu = ZERWANIE I POWRÓT, nie "cisza"

OUTPUT: Valid JSON only.
{
  "therapistLetter": {
    "perPerson": {
      "Imię": {
        "dearLine": "Drogi/Droga [imię],",
        "whatISee": "Piszesz że [cytat z listu]... [reakcja terapeuty]",
        "whatYouDontSee": "...",
        "oneThingToWorkOn": "...",
        "closingLine": "Z troską o twój następny związek,"
      }
    }
  }
}`;

// ============================================================
// Runner 5: Therapist Response
// ============================================================

export async function runEksTherapistResponse(
  participants: string[],
  letterToTherapist: EksLetterToTherapist,
  quantitativeContext: string,
  deepResult: EksResult,
  attachmentMap?: EksAttachmentMap,
  expandedPatterns?: EksExpandedRepeatingPatterns,
  painSymmetry?: EksPainSymmetry,
): Promise<EksTherapistLetter> {
  const parts: string[] = [];
  parts.push(`UCZESTNICY: ${participants.join(', ')}`);

  // The patient letters — this is what the therapist is RESPONDING to
  parts.push('\n=== LISTY OD PACJENTÓW (to na nie odpowiadasz) ===');
  for (const [name, letter] of Object.entries(letterToTherapist.perPerson)) {
    parts.push(`\n--- List od: ${name} ---`);
    parts.push(`Opening: "${letter.opening}"`);
    parts.push(`Co się stało (ich wersja): "${letter.whatHappened}"`);
    parts.push(`Myśl która się zapętla: "${letter.whatIKeepThinking}"`);
    parts.push(`Czego boją się przyznać: "${letter.whatImAfraidToAdmit}"`);
    parts.push(`Pytanie do terapeuty: "${letter.theQuestion}"`);
  }

  // Relationship profile from analysis
  parts.push('\n=== PROFIL RELACJI (dane analityczne) ===');
  const profile = {
    phases: deepResult.phases.map(p => ({
      name: p.name,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      description: p.description,
    })),
    turningPoint: deepResult.turningPoint,
    causeOfDeath: deepResult.causeOfDeath,
    whoLeftFirst: deepResult.whoLeftFirst,
    lossProfiles: deepResult.lossProfiles,
    ...(attachmentMap ? { attachmentMap } : {}),
    ...(expandedPatterns ? { expandedPatterns } : {}),
    ...(painSymmetry ? { painSymmetry } : {}),
  };
  parts.push(JSON.stringify(profile, null, 2));

  parts.push('\n=== DANE ILOŚCIOWE ===');
  parts.push(quantitativeContext);

  const input = parts.join('\n');
  console.log(`[Eks Therapist Response] Input length: ${input.length} chars`);
  const raw = await callGeminiWithRetry(EKS_THERAPIST_RESPONSE_SYSTEM, input, 3, 4096, 0.5, 60_000);
  console.log(`[Eks Therapist Response] Raw response length: ${raw.length} chars`);
  const result = parseGeminiJSON<{ therapistLetter: EksTherapistLetter }>(raw);

  if (!result.therapistLetter?.perPerson || Object.keys(result.therapistLetter.perPerson).length === 0) {
    throw new Error('Terapeuta nie wygenerował odpowiedzi na listy');
  }

  return result.therapistLetter;
}

// ============================================================
// Legacy: Single-pass runner (backward compat)
// ============================================================

export async function runEksAnalysis(
  samples: AnalysisSamples,
  participants: string[],
  quantitativeContext: string,
  existingAnalysis?: {
    pass1?: Record<string, unknown>;
    pass2?: Record<string, unknown>;
    pass4?: Record<string, unknown>;
  },
): Promise<EksResult> {
  // Delegate to deep autopsy with empty recon for backward compat
  const fakeRecon: EksRecon = {
    roughPhases: [],
    flaggedDateRanges: [],
    flaggedQuotes: [],
    areasToInvestigate: [],
    emotionalPeaks: [],
  };
  return runEksDeepAutopsy(samples, undefined, participants, quantitativeContext, fakeRecon, existingAnalysis);
}
