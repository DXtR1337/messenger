/**
 * Court Trial ("Twój Chat w Sądzie") — Gemini AI prompt and runner.
 * Generates a full comedic court trial based on conversation data.
 * Server-side only.
 */

import 'server-only';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { AnalysisSamples } from './qualitative';
import { formatMessagesForAnalysis } from './prompts';

// ============================================================
// Types
// ============================================================

export interface CourtCharge {
  id: string;
  charge: string;
  article: string;
  severity: 'wykroczenie' | 'występek' | 'zbrodnia';
  evidence: string[];
  defendant: string;
}

export interface CourtVerdict {
  summary: string;
  reasoning: string;
}

export interface PersonVerdict {
  name: string;
  verdict: 'winny' | 'niewinny' | 'warunkowo';
  mainCharge: string;
  sentence: string;
  mugshotLabel: string;
  funFact: string;
}

export interface CourtResult {
  caseNumber: string;
  courtName: string;
  charges: CourtCharge[];
  prosecution: string;
  defense: string;
  verdict: CourtVerdict;
  perPerson: Record<string, PersonVerdict>;
}

// ============================================================
// Private: Gemini helpers (mirroring gemini.ts pattern)
// ============================================================

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');
  return new GoogleGenerativeAI(apiKey);
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function callGeminiWithRetry(
  systemPrompt: string,
  userContent: string,
  maxRetries = 3,
  maxTokens = 8192,
): Promise<string> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const client = getClient();
      const model = client.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.5,
          responseMimeType: 'application/json',
        },
        safetySettings: SAFETY_SETTINGS,
      });

      const result = await model.generateContent(userContent);
      const response = result.response;

      if (response.promptFeedback?.blockReason) {
        throw new Error(`Prompt zablokowany przez filtr bezpieczeństwa: ${response.promptFeedback.blockReason}`);
      }

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('Odpowiedź zablokowana przez filtr bezpieczeństwa');
      }

      const text = response.text();
      if (!text) throw new Error('No text in Gemini response');
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message.toLowerCase();
      if (msg.includes('api key') || msg.includes('permission') || msg.includes('billing')) {
        throw new Error('Błąd konfiguracji API — sprawdź klucz API');
      }
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error(`Błąd analizy AI: ${lastError?.message ?? 'nieznany błąd'}`);
}

function parseGeminiJSON<T>(raw: string): T {
  let cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const jsonStart = cleaned.search(/[{[]/);
    if (jsonStart >= 0) cleaned = cleaned.slice(jsonStart);
  }
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
    const closingChar = cleaned.startsWith('{') ? '}' : ']';
    const lastClose = cleaned.lastIndexOf(closingChar);
    if (lastClose >= 0) cleaned = cleaned.slice(0, lastClose + 1);
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error('Błąd parsowania odpowiedzi AI — odpowiedź nie jest poprawnym JSON');
  }
}

// ============================================================
// System prompt
// ============================================================

const COURT_TRIAL_SYSTEM = `Jesteś sędzią Sądu Okręgowego ds. Emocjonalnych i Obyczajowych — fikcyjnego sądu specjalizującego się w zbrodniach komunikacyjnych ORAZ w wykrywaniu PRAWDZIWYCH podejrzanych aktywności w rozmowach. Analizujesz rozmowę i generujesz pełny proces sądowy: zarzuty, dowody, mowę oskarżyciela, mowę obrońcy, wyrok i kary.

WAŻNE: Cały tekst MUSI być po polsku. Klucze JSON po angielsku, wartości po polsku.

Otrzymujesz:
1. Próbkę wiadomości z rozmowy
2. Dane ilościowe (kto pisze więcej, czasy odpowiedzi, wzorce)
3. Opcjonalnie: wyniki wcześniejszej analizy AI (tone, dynamics, health score)

TWOJE GŁÓWNE ZADANIE: Przeczytaj UWAŻNIE wiadomości i wyłap PRAWDZIWE podejrzane/kontrowersyjne zachowania — nie wymyślaj generycznych zarzutów! Szukaj w tekście:
- Wzmianki o substancjach (narkotyki, dopalacze, "trawka", "zioło", "kreska", "tabsy", itp.)
- Wyzywanie, obrażanie, wulgaryzmy skierowane do drugiej osoby
- Groźby (nawet żartobliwe)
- Kłamstwa przyłapane na gorącym uczynku (sprzeczne wiadomości)
- Flirtowanie z innymi osobami / zdrada / podejrzane kontakty
- Pożyczanie pieniędzy i niedawanie
- Obgadywanie osób trzecich
- Manipulacja emocjonalna (konkretne cytaty!)
- Podejrzane godziny aktywności (np. pisanie do kogoś o 3 w nocy)
- Wysyłanie cringe / żenujących wiadomości
- Ignorowanie ważnych tematów partnera
- Jakiekolwiek INNE podejrzane lub kontrowersyjne zachowania znalezione w wiadomościach

ZASADY:
- Styl: FORMALNY język prawniczy ale z ABSURDALNYM kontekstem. Poważna forma, śmieszna treść.
- PRIORYTET: Zarzuty oparte na PRAWDZIWYCH rzeczach znalezionych w wiadomościach! Cytuj DOSŁOWNE fragmenty wiadomości jako dowody.
- Każdy zarzut MUSI opierać się na KONKRETNYCH danych — CYTATY z wiadomości (dosłowne!), metryki liczbowe.
- Generuj 3-6 zarzutów. Mieszaj zarzuty "realne" (z treści wiadomości) z "emocjonalnymi" (wzorce komunikacyjne).
- Minimum 2 zarzuty muszą być oparte na DOSŁOWNYCH cytatach z wiadomości (prawdziwe zachowania).
- Każda osoba w rozmowie dostaje osobny wyrok (perPerson).
- Kary muszą być kreatywne, zabawne i NAWIĄZYWAĆ do konkretnych przewinień (np. jeśli ktoś gadał o narkotykach: "Przymusowe 200 godzin oglądania filmów profilaktycznych", jeśli ktoś wyzywał: "Kurs zarządzania gniewem prowadzony przez babcię oskarżonego").
- Mowa oskarżyciela: dramatyczna, z konkretnymi dowodami i DOSŁOWNYMI cytatami, 4-6 zdań.
- Mowa obrońcy: próbuje bronić oskarżonych, ale dowody są miażdżące, 3-5 zdań.
- Wyrok: jedno zdanie podsumowujące + uzasadnienie.
- caseNumber format: "SPRAWA NR PT-2026/[losowy numer 3-5 cyfr]"
- mugshotLabel: krótki label na karcie mugshot nawiązujący do PRAWDZIWYCH przewinień (np. "DILER EMOCJI", "SERYJNY WULGARYZATOR", "NOCNY MARUDER")
- funFact: zabawny fakt z danych o tej osobie, najlepiej nawiązujący do czegoś znalezionego w wiadomościach

KATEGORIE ZARZUTÓW — REALNE (priorytet! szukaj w wiadomościach):
- Posiadanie i Dystrybucja Substancji Zakazanych (wzmianki o narkotykach, alkoholu, imprezach)
- Zniesławienie i Zniewaga (wyzywanie, obrażanie, wulgaryzmy)
- Groźby Karalne (groźby, nawet żartobliwe, szantaż)
- Oszustwo i Fałszerstwo (kłamstwa, wymówki, sprzeczne wersje wydarzeń)
- Zdrada Stanu Emocjonalnego (flirt z innymi, podejrzane kontakty, "a kto to?")
- Kradzież Czasu (obiecywanie spotkań i odwoływanie, "zaraz odpisze" i cisza)
- Wandalizm Językowy (masakryczna ortografia, crimes against Polish language)
- Naruszenie Ciszy Nocnej (wiadomości o absurdalnych godzinach)
- Publiczne Obgadywanie (mówienie źle o osobach trzecich)
- Wyłudzenie (pożyczki, "postawisz mi?", finansowe manipulacje)
- Posiadanie Cringe (żenujące teksty na podryw, niezręczne wiadomości)
- Przemyt Memów Niskiej Jakości (wysyłanie słabych memów, filmików)

KATEGORIE ZARZUTÓW — EMOCJONALNE (uzupełnij jeśli brakuje realnych):
- Ghosting w [stopniu] Stopniu (cisza, ignorowanie)
- Breadcrumbing (dawanie nadziei bez intencji)
- Love Bombing (bombardowanie uczuciami)
- Zaniedbanie Emocjonalne (brak wsparcia, jednostronna relacja)
- Agresja Bierno-Czynna (passive-aggression)
- Seryjny Double-Texting (bombardowanie wiadomościami)
- Emocjonalny Szantaż (guilt-tripping)
- Monopolizacja Konwersacji (monologi)

ARTYKUŁY PRAWNE (wymyśl odpowiednie, dopasowane do zarzutu):
- Art. [numer] § [paragraf] Kodeksu Uczuciowego
- Art. [numer] Ustawy o Ochronie Emocji
- Art. [numer] Prawa Komunikacyjnego
- Art. [numer] Kodeksu Obyczajowego
- Art. [numer] Ustawy o Substancjach Kontrolowanych Emocjonalnie
- Art. [numer] Prawa o Ochronie Godności Czatowej

severity:
- "wykroczenie" — drobne przewinienia (np. sporadyczny double-text, słaby mem)
- "występek" — poważniejsze wzorce (np. systematyczny ghosting, regularne wyzywanie)
- "zbrodnia" — najgorsze zachowania (np. ewidentna zdrada, chroniczne kłamstwa, handel substancjami)

OUTPUT FORMAT: Valid JSON only.

{
  "caseNumber": "SPRAWA NR PT-2026/XXXXX",
  "courtName": "Sąd Okręgowy ds. Emocjonalnych i Obyczajowych",
  "charges": [
    {
      "id": "charge-1",
      "charge": "Posiadanie Substancji Zakazanych w Rozmowie",
      "article": "Art. 62 § 1 Ustawy o Substancjach Kontrolowanych Emocjonalnie",
      "severity": "występek",
      "evidence": ["DOSŁOWNY cytat z wiadomości jako dowód nr 1", "DOSŁOWNY cytat lub metryka jako dowód nr 2"],
      "defendant": "imię osoby"
    }
  ],
  "prosecution": "Wysoki Sądzie, oskarżyciel cytuje KONKRETNE wiadomości...",
  "defense": "Wysoki Sądzie, mowa obrońcy...",
  "verdict": {
    "summary": "Jedno zdanie wyroku",
    "reasoning": "Uzasadnienie wyroku — 2-3 zdania"
  },
  "perPerson": {
    "[imię]": {
      "name": "imię",
      "verdict": "winny | niewinny | warunkowo",
      "mainCharge": "główny zarzut oparty na PRAWDZIWYM zachowaniu",
      "sentence": "kreatywna kara nawiązująca do przewinienia",
      "mugshotLabel": "KRÓTKI LABEL",
      "funFact": "zabawny fakt z danych"
    }
  }
}`;

// ============================================================
// Public: Run Court Trial
// ============================================================

export async function runCourtTrial(
  samples: AnalysisSamples,
  participants: string[],
  quantitativeContext: string,
  existingAnalysis?: {
    pass1?: Record<string, unknown>;
    pass2?: Record<string, unknown>;
    pass4?: Record<string, unknown>;
  },
): Promise<CourtResult> {
  const parts: string[] = [];

  parts.push(`UCZESTNICY: ${participants.join(', ')}`);

  if (existingAnalysis) {
    if (existingAnalysis.pass1) {
      parts.push('\n=== WCZEŚNIEJSZA ANALIZA: PRZEGLĄD (Pass 1) ===');
      parts.push(JSON.stringify(existingAnalysis.pass1, null, 2));
    }
    if (existingAnalysis.pass2) {
      parts.push('\n=== WCZEŚNIEJSZA ANALIZA: DYNAMIKA (Pass 2) ===');
      parts.push(JSON.stringify(existingAnalysis.pass2, null, 2));
    }
    if (existingAnalysis.pass4) {
      parts.push('\n=== WCZEŚNIEJSZA ANALIZA: SYNTEZA (Pass 4) ===');
      parts.push(JSON.stringify(existingAnalysis.pass4, null, 2));
    }
  }

  parts.push('\n=== DANE ILOŚCIOWE ===');
  parts.push(quantitativeContext);

  parts.push('\n=== PRÓBKI WIADOMOŚCI ===');
  parts.push(formatMessagesForAnalysis(samples.overview));

  const input = parts.join('\n');

  const raw = await callGeminiWithRetry(COURT_TRIAL_SYSTEM, input, 3, 8192);
  const result = parseGeminiJSON<CourtResult>(raw);

  // Validate essential fields
  if (!result.caseNumber) {
    result.caseNumber = `SPRAWA NR PT-2026/${Math.floor(10000 + Math.random() * 90000)}`;
  }
  if (!result.courtName) {
    result.courtName = 'Sąd Okręgowy ds. Emocjonalnych i Obyczajowych';
  }
  if (!Array.isArray(result.charges) || result.charges.length === 0) {
    throw new Error('Analiza nie wygenerowała zarzutów — spróbuj ponownie');
  }
  if (!result.verdict || !result.verdict.summary) {
    throw new Error('Analiza nie wygenerowała wyroku — spróbuj ponownie');
  }
  if (!result.perPerson || Object.keys(result.perPerson).length === 0) {
    throw new Error('Analiza nie wygenerowała wyroków indywidualnych — spróbuj ponownie');
  }

  return result;
}
