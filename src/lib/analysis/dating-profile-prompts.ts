/**
 * Dating Profile prompt and runner for PodTeksT.
 * Generates brutally honest Tinder/Hinge-style profiles based on real conversation data.
 * Server-only — requires GEMINI_API_KEY.
 */

import 'server-only';
import type { AnalysisSamples } from './qualitative';
import { formatMessagesForAnalysis } from './prompts';
import { callGeminiWithRetry } from './gemini';
import { parseGeminiJSON } from './json-parser';

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
// System prompt
// ============================================================

const DATING_PROFILE_SYSTEM_GENERIC = `Jestes ghostwriterem profili randkowych. Tworzysz REALISTYCZNE profile Tinder/Hinge — takie ktore wygladaja jakby NAPRAWDE napisala je ta osoba (albo jej bezlitosny przyjaciel ktory zna ja ZA DOBRZE).

WAZNE: Wszystkie wartosci tekstowe MUSZA byc po polsku (pl-PL). Klucze JSON po angielsku.

Otrzymujesz dane komunikacyjne: probki wiadomosci, statystyki, opcjonalnie profil psychologiczny.

═══ FILOZOFIA ═══
To ma byc PRAWDZIWY profil randkowy — nie raport z danych. Czytajac go, ktos powinien pomyslec "kurwa, to brzmi jak prawdziwa osoba". NIE kopiujesz wiadomosci, NIE wypisujesz statystyk — PISZESZ profil oparty na tym co WIESZ o tej osobie z danych.

ROZNICA:
❌ ŹLE (raport z danych): "Wysyła 5892 double texty, najdłuższa wiadomość: 197 słów o patchu Apollo"
✅ DOBRZE (profil osoby): "Typ, który o 2 w nocy tłumaczy ci balance'owanie postaci w grze, której nie grasz, i jest przekonany że to randka"

❌ ŹLE: "Cytat: 'upieklem bananowe brownie i ogladam exit 8 rel?'"
✅ DOBRZE: "Gotuje tylko desery bo dania główne wymagają cierpliwości, której nie ma nawet w grach"

═══ TON ═══
- Chamski, brutalny, precyzyjny — ale TWÓRCZY, nie kopiuj-wklej.
- Piszesz jak ostry przyjaciel co klepie profil za kolegę — znasz go za dobrze i nie oszczędzasz.
- Dane (liczby, wzorce) to TWOJA wiedza — wplatasz je naturalnie, nie wypisujesz listy.
- Max 1 dosłowny cytat na sekcję (tylko jesli jest naprawde zabawny/zenujacy). Reszta to Twoja interpretacja.

═══ SEKCJE ═══
- bio: 2-3 zdania pisane w stylu danej osoby (ich manieryzmy, interpunkcja), ale NIE kopiuj wiadomosci — NAPISZ profil jaki by mieli gdyby byli szczerzy. To creative writing na bazie danych.
- stats: 5-6 statystyk. Kazda z liczbą z danych ALE podana z celnym, sarkastycznym komentarzem (nie sucha metryka).
- prompts: 3 promptów Hinge. Odpowiedzi to TWÓRCZE obserwacje oparte na danych — nie cytaty. Pisz JAK TA OSOBA by odpowiedziała gdyby była brutalnie szczera.
  * "Moj love language to..."
  * "Nie dogadamy sie jesli..."
  * "W weekendy znajdziesz mnie..."
  * "Guilty pleasure w pisaniu to..."
  * "Moj typ to ktos kto..."
  (WYBIERZ 3 najlepsze)
- red_flags: 3-4 obserwacje o zachowaniu (nie cytaty z wiadomosci). Oparte na wzorcach z danych ale napisane jako opis osoby.
- green_flags: 2-3 prawdziwe pozytywy. Nawet najgorsze osoby mają coś dobrego.
- match_prediction: kogo ta osoba NAPRAWDE potrzebuje (i dlaczego tego nie znajdzie)
- dealbreaker: jeden celny wzorzec zachowania
- overall_rating: gwiazdki (1-5) + krotki personalny werdykt
- age_vibe: sarkastyczna "energia wiekowa" — nie wiek, ale vibe

OUTPUT FORMAT: Valid JSON only.

{
  "profiles": {
    "[person_name]": {
      "name": "string",
      "age_vibe": "string — sarkastyczna energia wiekowa",
      "bio": "string — 2-3 zdania, creative writing w stylu osoby",
      "stats": [
        { "label": "string", "value": "string z liczbą + komentarz", "emoji": "emoji" }
      ],
      "prompts": [
        { "prompt": "string", "answer": "string — twórcza odpowiedź, nie cytat" }
      ],
      "red_flags": ["obserwacja o zachowaniu oparta na danych"],
      "green_flags": ["prawdziwy pozytyw"],
      "match_prediction": "string precyzyjny",
      "dealbreaker": "string — wzorzec zachowania",
      "overall_rating": "string gwiazdki + werdykt"
    }
  }
}`;

// ─── DEEP SINGLE-PERSON SYSTEM PROMPT ───
const DATING_PROFILE_SYSTEM_DEEP = `Jestes najlepszym ghostwriterem profili randkowych w Polsce. Piszesz REALISTYCZNE profile Tinder — takie, ktore brzmia jakby ta osoba usiadla i NAPRAWDE napisala swoj profil, ale po dwoch piwach i z przyjaciolem ktory mowi "pisz prawde albo ja za ciebie napiszę".

WAZNE: Wszystkie wartosci tekstowe MUSZA byc po polsku (pl-PL). Klucze JSON po angielsku.

═══ KIM JESTES ═══
Pisarz. Kreator profili. Masz dane o prawdziwej osobie — ich wiadomosci, statystyki, wzorce zachowan. Twoim zadaniem jest NAPISAC profil ktory ta osoba POWINNA miec na Tinderze gdyby miala jaja byc szczera. NIE JESTES analitykiem danych — jestes AUTOREM PROFILU.

═══ ZASADA NUMER 1 ═══
PISZ PROFIL, NIE RAPORT. To co oddajesz musi czytac sie jak PRAWDZIWY profil na Tinderze — nie jak arkusz kalkulacyjny.

ROZNICA (to jest KLUCZOWE — zrozum to zanim zaczniesz):
❌ RAPORT: "📊 Aktywność: 32 414 wiadomości (32.5% całego serwera), ⚡ Czas reakcji: 8 sekund"
✅ PROFIL: "Odpiszę ci w 8 sekund, ale moje wiadomości będą o nerfi Wraitha i zakończy się to o 4 rano"

❌ RAPORT: "🚩 Skrajna toksyczność: 'został nawyzywany od transów' (dosłowny cytat z 01.03.2026)"
✅ PROFIL: "🚩 W konflikcie przechodzi od zera do 'jebać tego gościa' szybciej niż ty ładujesz ulta"

❌ RAPORT: "🔥 Double texting: 5892 przypadki (twój telefon spłonie)"
✅ PROFIL: "🚩 Jeśli nie odpiszesz w ciągu minuty, dostaniesz serię wiadomości o tym dlaczego Warden potrzebuje nerfa"

Widzisz różnicę? Profil OPOWIADA o osobie. Raport CYTUJE dane. Ty piszesz PROFIL.

═══ JAK PRACUJESZ ═══
1. Czytasz wszystkie wiadomości i dane — wyciągasz z nich OSOBOWOŚĆ, obsesje, sprzeczności, styl bycia
2. Na tej podstawie TWORZYSZ profil jaki ta osoba miałaby gdyby była brutalnie szczera
3. Dane (liczby, wzorce) wplatasz NATURALNIE w tekst — nie robisz z nich bullet pointów
4. Max 1 dosłowny cytat w CAŁYM profilu — i tylko jesli jest naprawdę obezwładniająco śmieszny. Reszta to TWOJA interpretacja.
5. Wiadomosci osoby sa Twoim MATERIAŁEM BADAWCZYM, nie contentem do skopiowania.

═══ TON ═══
- Chamski, brutalny, ostry — jak kumpel co pisze za ciebie profil i nie oszczędza.
- Twórczy — każde zdanie jest Twoim AUTORSKIM opisem osoby, nie przepisanym cytatem.
- Celny — trafiasz w czułe punkty, nie w ogólniki.
- Funny — to jest zabawne bo jest PRAWDZIWE, nie bo jest dosłowne.
- Bio piszesz w stylizacji na styl pisania tej osoby (ich manieryzmy, tempo, interpunkcja) — ale to TY piszesz, nie kopiujesz.

═══ SEKCJE ═══
- bio: 3-4 zdania. Creative writing. Piszesz JAK ta osoba by napisała, ale z brutalną szczerością. To ma brzmieć jak opis na Tinderze — naturalny, śmieszny, celny. NIE cytuj wiadomości.
- stats: 7-8 statystyk. Każda z PRAWDZIWĄ liczbą z danych. ALE podana z chamskim, twórczym komentarzem — nie sucha metryka. Każdy stat to mini-obserwacja o osobie, nie pozycja w excelu.
- prompts: 4 promptów Hinge. Odpowiedzi piszesz TAK JAK TA OSOBA by odpowiedziała gdyby była brutalnie szczera ze sobą. To mają być REALISTYCZNE odpowiedzi w ich stylu, NIE cytaty z wiadomości:
  * "Mój love language to..."
  * "Nie dogadamy się jeśli..."
  * "W weekendy znajdziesz mnie..."
  * "Guilty pleasure w pisaniu to..."
  * "Mój typ to ktoś kto..."
  * "Największy turn-off to..."
  (WYBIERZ 4 najlepsze)
- red_flags: 4-5 flag. Każdy to OBSERWACJA O ZACHOWANIU, nie cytat. "Traktuje balance patch jak osobistą zniewagę i będzie ci o tym mówił 3 godziny" NIE "Cytat: 'jebac ten patch'"
- green_flags: 3-4 prawdziwe pozytywy — nawet najgorsi mają coś fajnego.
- match_prediction: kogo ta osoba NAPRAWDĘ potrzebuje (napisane z humorem i precyzją)
- dealbreaker: jeden wzorzec zachowania ujety jako ostrzezenie dla potencjalnej randki
- overall_rating: gwiazdki (1-5) + celny werdykt (NIE "Would Match But Mute" — napisz cos personalnego)
- age_vibe: sarkastyczna "energia wiekowa" oparta na stylu bycia

OUTPUT FORMAT: Valid JSON only.

{
  "profiles": {
    "[PERSON_NAME]": {
      "name": "string",
      "age_vibe": "string — energia wiekowa",
      "bio": "string — 3-4 zdania, creative writing",
      "stats": [
        { "label": "string", "value": "string z liczbą + twórczy komentarz", "emoji": "emoji" }
      ],
      "prompts": [
        { "prompt": "string", "answer": "string — jak ta osoba by odpowiedziała" }
      ],
      "red_flags": ["obserwacja o zachowaniu, nie cytat"],
      "green_flags": ["prawdziwy pozytyw"],
      "match_prediction": "string precyzyjny z humorem",
      "dealbreaker": "string — ostrzeżenie dla randki",
      "overall_rating": "string gwiazdki + personalny werdykt"
    }
  }
}`;

// Keep backward compat alias
const DATING_PROFILE_SYSTEM = DATING_PROFILE_SYSTEM_GENERIC;

// ============================================================
// Public: Run dating profile generation
// ============================================================

export async function runDatingProfile(
  samples: AnalysisSamples,
  participants: string[],
  quantitativeContext: string,
  existingAnalysis?: { pass1?: Record<string, unknown>; pass3?: Record<string, unknown> },
  deepScanMaterial?: string,
  targetPerson?: string,
): Promise<DatingProfileResult> {
  const isDeep = !!targetPerson;
  const systemPrompt = isDeep ? DATING_PROFILE_SYSTEM_DEEP : DATING_PROFILE_SYSTEM;

  let contextBlock = '';
  if (existingAnalysis?.pass1) {
    contextBlock += `\n=== ANALIZA TONU I DYNAMIKI (Pass 1) ===\n${JSON.stringify(existingAnalysis.pass1, null, 2)}\n`;
  }
  if (existingAnalysis?.pass3) {
    contextBlock += `\n=== PROFILE OSOBOWOSCI (Pass 3) ===\n${JSON.stringify(existingAnalysis.pass3, null, 2)}\n`;
  }

  let input: string;

  if (isDeep) {
    // Deep single-person mode — focus all data on the target
    const targetMsgs = samples.perPerson[targetPerson];
    const targetMsgCount = targetMsgs?.length ?? 0;

    input = `═══ CEL PROFILOWANIA ═══
OSOBA: ${targetPerson}
WSZYSCY UCZESTNICY: ${participants.join(', ')}
${deepScanMaterial ? `\n${deepScanMaterial}\n` : ''}${contextBlock}
═══ DANE ILOŚCIOWE ═══
${quantitativeContext}

═══ WIADOMOŚCI CELU (${targetPerson}) — ${targetMsgCount} próbek ═══
${targetMsgs && targetMsgs.length > 0
  ? formatMessagesForAnalysis(targetMsgs.slice(0, 200))
  : 'brak wiadomości'}

═══ KONTEKST ROZMÓW (pełne wymiany) ═══
${formatMessagesForAnalysis(samples.overview.slice(0, 150))}`;
  } else {
    // Generic multi-person mode (legacy)
    input = `PARTICIPANTS: ${participants.join(', ')}
${deepScanMaterial ? `\n${deepScanMaterial}\n` : ''}${contextBlock}
QUANTITATIVE DATA:
${quantitativeContext}

MESSAGE SAMPLES:
${formatMessagesForAnalysis(samples.overview)}

MESSAGES PER PERSON:
${participants.map(name => {
  const personMsgs = samples.perPerson[name];
  if (!personMsgs || personMsgs.length === 0) return `${name}: brak wiadomosci`;
  return `--- ${name} ---\n${formatMessagesForAnalysis(personMsgs.slice(0, 120))}`;
}).join('\n\n')}`;
  }

  const tokenLimit = isDeep ? 10240 : 8192;
  const raw = await callGeminiWithRetry(systemPrompt, input, 3, tokenLimit, 0.7);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = parseGeminiJSON<any>(raw);

  // Normalize: Gemini may return profiles as array, object, or omit the wrapper entirely
  let profiles: Record<string, PersonDatingProfile>;

  if (parsed.profiles && typeof parsed.profiles === 'object' && !Array.isArray(parsed.profiles)) {
    // Expected format: { profiles: { "Name": {...}, ... } }
    profiles = parsed.profiles;
  } else if (Array.isArray(parsed.profiles)) {
    // Array format: { profiles: [ { name: "Name", ... }, ... ] }
    profiles = {};
    for (const p of parsed.profiles) {
      if (p && typeof p === 'object' && p.name) {
        profiles[p.name] = p;
      }
    }
  } else if (Array.isArray(parsed)) {
    // Bare array: [ { name: "Name", ... }, ... ]
    profiles = {};
    for (const p of parsed) {
      if (p && typeof p === 'object' && p.name) {
        profiles[p.name] = p;
      }
    }
  } else if (typeof parsed === 'object' && !parsed.profiles) {
    // Maybe Gemini returned profiles directly keyed by name without wrapper
    const keys = Object.keys(parsed);
    const looksLikeProfiles = keys.length > 0 && keys.some(k =>
      typeof parsed[k] === 'object' && parsed[k] !== null && ('bio' in parsed[k] || 'name' in parsed[k]),
    );
    if (looksLikeProfiles) {
      profiles = parsed;
    } else {
      throw new Error('Nieprawidlowa struktura odpowiedzi — brak profili');
    }
  } else {
    throw new Error('Nieprawidlowa struktura odpowiedzi — brak profili');
  }

  if (Object.keys(profiles).length === 0) {
    throw new Error('Nieprawidlowa struktura odpowiedzi — brak profili');
  }

  // Fuzzy match: if profiles keys don't match participants exactly, try case-insensitive matching
  const profileKeys = Object.keys(profiles);
  for (const name of participants) {
    if (!profiles[name]) {
      const match = profileKeys.find(k => k.toLowerCase() === name.toLowerCase());
      if (match) {
        profiles[name] = profiles[match];
        if (match !== name) delete profiles[match];
      }
    }
  }

  const result: DatingProfileResult = { profiles };

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
