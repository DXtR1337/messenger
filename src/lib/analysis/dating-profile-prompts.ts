/**
 * Dating Profile prompt and runner for PodTeksT.
 * Generates brutally honest Tinder/Hinge-style profiles based on real conversation data.
 * Server-only — requires GEMINI_API_KEY.
 */

import 'server-only';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { AnalysisSamples } from './qualitative';
import { formatMessagesForAnalysis } from './prompts';

// ============================================================
// Types
// ============================================================

export interface DatingProfileStat {
  label: string;
  value: string;
  emoji: string;
}

export interface DatingProfilePrompt {
  prompt: string;
  answer: string;
}

export interface PersonDatingProfile {
  name: string;
  age_vibe: string;
  bio: string;
  stats: DatingProfileStat[];
  prompts: DatingProfilePrompt[];
  red_flags: string[];
  green_flags: string[];
  match_prediction: string;
  dealbreaker: string;
  overall_rating: string;
}

export interface DatingProfileResult {
  profiles: Record<string, PersonDatingProfile>;
}

// ============================================================
// Private: Gemini helpers (mirrors gemini.ts pattern)
// ============================================================

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');
  return new GoogleGenerativeAI(apiKey);
}

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
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
        safetySettings: SAFETY_SETTINGS,
      });

      const result = await model.generateContent(userContent);
      const response = result.response;

      if (response.promptFeedback?.blockReason) {
        throw new Error(`Prompt zablokowany przez filtr bezpieczenstwa: ${response.promptFeedback.blockReason}`);
      }

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('Odpowiedz zablokowana przez filtr bezpieczenstwa');
      }

      const text = response.text();
      if (!text) throw new Error('No text in Gemini response');
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message.toLowerCase();
      if (msg.includes('api key') || msg.includes('permission') || msg.includes('billing')) {
        throw new Error('Blad konfiguracji API — sprawdz klucz API');
      }
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error(`Blad analizy AI: ${lastError?.message ?? 'nieznany blad'}`);
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
    throw new Error('Blad parsowania odpowiedzi AI — odpowiedz nie jest poprawnym JSON');
  }
}

// ============================================================
// System prompt
// ============================================================

const DATING_PROFILE_SYSTEM = `Jestes brutalnie szczerym analitykiem danych, ktory tworzy profile randkowe. Na podstawie PRAWDZIWYCH danych komunikacyjnych tworzysz profil Tinder/Hinge — nie taki jaki BY CHCIELI miec, ale taki jaki DANE POKAZUJA.

WAZNE: Wszystkie wartosci tekstowe MUSZA byc po polsku (pl-PL). Klucze JSON po angielsku.

Otrzymujesz:
1. Probke wiadomosci z rozmowy
2. Dane ilosciowe (czasy odpowiedzi, liczba wiadomosci, wzorce)
3. Opcjonalnie: wyniki analizy psychologicznej (ton, profile osobowosci)

GLOS I TON:
- Jestes precyzyjny, pewny siebie, lekko zlosliwy. Nie wellness coach — detektyw z danymi.
- NIGDY nie uzywaj ogolnikow: "czesto", "duzo", "dlugo". ZAWSZE konkretne liczby: "47 minut", "73%", "14 wiadomosci z rzedu".
- Kazda obserwacja MUSI byc poparta konkretnymi danymi: cytatami, liczbami, wzorcami.
- Nie boj sie byc mean — ale celnie, nie generycznie.
- Przyklad dobrego tonu: "Czas odpowiedzi: 47 min. Ale jak temat to jedzenie: 14 sekund. Priorytety jasne."
- Przyklad zlego tonu: "Czasami odpowiada szybko, a czasami wolniej." (ZA OGOLNE)

ZASADY:
- Bio MUSI byc napisane W STYLU PISANIA danej osoby — ich slownictwem, interpunkcja, dlugoscia wiadomosci, emoji patterns. Jesli pisza krotko i bez wielkich liter — bio tez. Jesli pisza dlugimi zdaniami z emotkami — bio tez.
- Stats lacza PRAWDZIWE metryki z roast-style komentarzem. KAZDY stat musi zawierac konkretna liczbe z danych.
- Prompty w stylu Hinge ale brutally honest. Dla kazdej osoby WYBIERZ 3 z ponizszych:
  * "Moj love language to..."
  * "Nie dogadamy sie jesli..."
  * "W weekendy znajdziesz mnie..."
  * "Guilty pleasure w pisaniu to..."
  * "Moj typ to ktos kto..."
- Red/green flags oparte na DANYCH — ghosting patterns, response time, initiation balance, double texting. Kazdy flag z konkretna liczba.
- match_prediction bazowany na stylu komunikacji i potrzebach — precyzyjny, nie ogolnikowy
- dealbreaker to JEDEN konkretny pattern z danych z liczba
- overall_rating: gwiazdki (1-5) + krotki, celny komentarz
- Cytuj KONKRETNE wiadomosci i liczby
- Badz CELNY i OSTRY. Kazde zdanie niesie informacje.
- 5-6 stats per osobe
- age_vibe to nie prawdziwy wiek — to "energia wiekowa" — precyzyjna, sarkastyczna diagnoza

OUTPUT FORMAT: Valid JSON only.

{
  "profiles": {
    "[person_name]": {
      "name": "string",
      "age_vibe": "string — zabawny opis 'energii wiekowej'",
      "bio": "string — 2-3 zdania W STYLU PISANIA tej osoby",
      "stats": [
        { "label": "Czas odpowiedzi", "value": "47 min (ale przy jedzeniu: 14 sek)", "emoji": "clock emoji" },
        { "label": "Inicjatywa", "value": "73% rozmow zaczyna sam/a", "emoji": "relevant emoji" }
      ],
      "prompts": [
        { "prompt": "Moj love language to...", "answer": "...zostawianie na czytaniu na 3 godziny" }
      ],
      "red_flags": ["konkretny pattern z danych", "kolejny"],
      "green_flags": ["konkretny pozytywny pattern", "kolejny"],
      "match_prediction": "Pasuje do: osob ktore lubia czekac",
      "dealbreaker": "Nie odpisuje weekendami",
      "overall_rating": "stars 3/5 — Would Match But Mute"
    }
  }
}`;

// ============================================================
// Public: Run dating profile generation
// ============================================================

export async function runDatingProfile(
  samples: AnalysisSamples,
  participants: string[],
  quantitativeContext: string,
  existingAnalysis?: { pass1?: Record<string, unknown>; pass3?: Record<string, unknown> },
): Promise<DatingProfileResult> {
  let contextBlock = '';
  if (existingAnalysis?.pass1) {
    contextBlock += `\n=== ANALIZA TONU I DYNAMIKI (Pass 1) ===\n${JSON.stringify(existingAnalysis.pass1, null, 2)}\n`;
  }
  if (existingAnalysis?.pass3) {
    contextBlock += `\n=== PROFILE OSOBOWOSCI (Pass 3) ===\n${JSON.stringify(existingAnalysis.pass3, null, 2)}\n`;
  }

  const input = `PARTICIPANTS: ${participants.join(', ')}
${contextBlock}
QUANTITATIVE DATA:
${quantitativeContext}

MESSAGE SAMPLES:
${formatMessagesForAnalysis(samples.overview)}

MESSAGES PER PERSON:
${participants.map(name => {
  const personMsgs = samples.perPerson[name];
  if (!personMsgs || personMsgs.length === 0) return `${name}: brak wiadomosci`;
  return `--- ${name} ---\n${formatMessagesForAnalysis(personMsgs.slice(0, 50))}`;
}).join('\n\n')}`;

  const raw = await callGeminiWithRetry(DATING_PROFILE_SYSTEM, input, 3, 8192);
  const result = parseGeminiJSON<DatingProfileResult>(raw);

  // Validate structure
  if (!result.profiles || typeof result.profiles !== 'object') {
    throw new Error('Nieprawidlowa struktura odpowiedzi — brak profili');
  }

  for (const name of participants) {
    const profile = result.profiles[name];
    if (!profile) continue;

    // Ensure arrays exist
    if (!Array.isArray(profile.stats)) profile.stats = [];
    if (!Array.isArray(profile.prompts)) profile.prompts = [];
    if (!Array.isArray(profile.red_flags)) profile.red_flags = [];
    if (!Array.isArray(profile.green_flags)) profile.green_flags = [];

    // Ensure required strings
    if (!profile.name) profile.name = name;
    if (!profile.age_vibe) profile.age_vibe = '';
    if (!profile.bio) profile.bio = '';
    if (!profile.match_prediction) profile.match_prediction = '';
    if (!profile.dealbreaker) profile.dealbreaker = '';
    if (!profile.overall_rating) profile.overall_rating = '';
  }

  return result;
}
