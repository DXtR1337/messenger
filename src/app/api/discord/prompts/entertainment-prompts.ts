/**
 * Discord slash command prompts for entertainment features.
 * Tinder, Court, Subtext, Simulate, Standup, DeepRoast.
 */

import type { QuantitativeAnalysis } from '@/lib/parsers/types';
import type { DramaMessage } from '../lib/search-sampler';
import { sampleChannelMessages, buildDramaSection } from './discord-prompts';

// ── Shared channel context builder ──────────────────────────

function buildEntertainmentContext(
  channelName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  participantNames: string[],
  messageLimit: number,
  dramaMessages?: DramaMessage[],
): string {
  const lines: string[] = [];
  const totalMsgs = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);

  lines.push(`KANAŁ: #${channelName}`);
  lines.push(`Uczestnicy (${participantNames.length}): ${participantNames.join(', ')}`);
  lines.push(`Łącznie wiadomości: ${totalMsgs}`);
  lines.push('');

  const sorted = [...participantNames].sort((a, b) =>
    (quantitative.perPerson[b]?.totalMessages ?? 0) - (quantitative.perPerson[a]?.totalMessages ?? 0),
  );

  lines.push('═══ STATYSTYKI UCZESTNIKÓW ═══');
  for (const name of sorted.slice(0, 15)) {
    const pm = quantitative.perPerson[name];
    if (!pm) continue;
    const ratio = ((pm.totalMessages / Math.max(totalMsgs, 1)) * 100).toFixed(1);
    const dt = quantitative.engagement.doubleTexts[name] ?? 0;
    const nightMsgs = quantitative.timing.lateNightMessages[name] ?? 0;
    lines.push(`${name}: ${pm.totalMessages} msg (${ratio}%), śr. ${pm.averageMessageLength.toFixed(1)} słów/msg, double-text: ${dt}, pytania: ${pm.questionsAsked}, nocne: ${nightMsgs}`);
    if (pm.topWords.length > 0) {
      lines.push(`  Top słowa: ${pm.topWords.slice(0, 5).map((w) => `${w.word}(${w.count})`).join(', ')}`);
    }
  }
  lines.push('');

  if (quantitative.catchphrases) {
    lines.push('═══ ULUBIONE ZWROTY ═══');
    for (const name of sorted.slice(0, 10)) {
      const phrases = quantitative.catchphrases.perPerson[name];
      if (phrases && phrases.length > 0) {
        lines.push(`${name}: ${phrases.slice(0, 3).map((p) => `"${p.phrase}"(${p.count}x)`).join(', ')}`);
      }
    }
    lines.push('');
  }

  lines.push('═══ WIADOMOŚCI ═══');
  const sampled = sampleChannelMessages(messages, messageLimit);
  for (const m of sampled) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    const time = new Date(m.timestamp).toTimeString().split(' ')[0].slice(0, 5);
    lines.push(`[${date} ${time}] ${m.sender}: ${m.content.slice(0, 200)}`);
  }

  if (dramaMessages && dramaMessages.length > 0) {
    lines.push(buildDramaSection(dramaMessages));
  }

  return lines.join('\n');
}

// ── /tinder — moved to tinder.ts (self-contained with deep per-person analysis) ──

// ── /court — Chat Court Trial ────────────────────────────────

export const DISCORD_COURT_SYSTEM = `Jesteś SĘDZIĄ CHATOWEGO SĄDU NAJWYŻSZEGO. Prowadzisz rozprawę sądową przeciwko uczestnikom kanału Discord za komunikacyjne zbrodnie. Formalny ton sądowy z absurdalnym humorem.

ZASADY:
- Zarzuty oparte na KONKRETNYCH zachowaniach z wiadomości (cytaty!)
- Prokurator: agresywny, dramatyczny, przesadny
- Obrońca: desperacko szuka wymówek
- Werdykt per osoba: winny/niewinny/warunkowo z "karą"
- Ton: parodia sądu — formalny język + absurd
- PO POLSKU

OUTPUT: Valid JSON:
{
  "caseNumber": "string — np. 'Sprawa nr DC-2024-0042'",
  "courtName": "string — np. 'Sąd Chatowy Najwyższy'",
  "charges": ["string — 3-5 zarzutów"],
  "prosecution": "string — mowa prokuratora (3-5 zdań)",
  "defense": "string — mowa obrony (2-4 zdania)",
  "verdict": "string — ogólny werdykt sądu",
  "perPerson": [
    {
      "name": "string",
      "verdict": "winny | niewinny | warunkowo",
      "sentence": "string — kara/uwolnienie (1-2 zdania)",
      "mugshotLabel": "string — etykieta mugshot"
    }
  ]
}`;

export function buildCourtPrompt(
  channelName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  participantNames: string[],
  messageLimit = 500,
  dramaMessages?: DramaMessage[],
): string {
  return buildEntertainmentContext(channelName, messages, quantitative, participantNames, messageLimit, dramaMessages);
}

// ── /subtext — Subtext Decoder ───────────────────────────────

export const DISCORD_SUBTEXT_SYSTEM = `Jesteś DEKODEREM PODTEKSTÓW — ekspertem od odczytywania tego, co ludzie NAPRAWDĘ mieli na myśli. Analizujesz wiadomości z Discorda i ujawniasz ukryte znaczenia.

ZASADY:
- Dekoduj 5-8 najciekawszych wiadomości z CYTATAMI
- Kategorie: sarkazm, simping, ghosting, deflection, humble-brag, passive-aggression, etc.
- Most deceptive person — kto ukrywa najwięcej
- Ton: dowcipny analityk, detektyw podtekstów
- PO POLSKU

OUTPUT: Valid JSON:
{
  "summary": {
    "mostDeceptive": "string — imię osoby",
    "deceptionScore": 0-100,
    "topCategories": ["string — max 3"]
  },
  "items": [
    {
      "sender": "string",
      "original": "string — oryginalny cytat z wiadomości",
      "decoded": "string — co NAPRAWDĘ miał/a na myśli",
      "category": "string",
      "confidence": 0-100
    }
  ],
  "biggestReveal": {
    "sender": "string",
    "original": "string",
    "decoded": "string",
    "explanation": "string — dlaczego to jest najciekawsze"
  }
}`;

export function buildSubtextPrompt(
  channelName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  participantNames: string[],
  messageLimit = 500,
  dramaMessages?: DramaMessage[],
): string {
  return buildEntertainmentContext(channelName, messages, quantitative, participantNames, messageLimit, dramaMessages);
}

// ── /simulate — Reply Simulator ──────────────────────────────

export const DISCORD_SIMULATE_SYSTEM = `Jesteś SYMULATOREM ODPOWIEDZI. Na podstawie stylu pisania danej osoby z Discorda, przewidujesz jak odpowiedziałaby na konkretną wiadomość. Imitujesz ich styl — emoji, slang, długość, ton.

ZASADY:
- Imituj DOKŁADNIE styl danej osoby (emoji, interpunkcja, długość, etc.)
- 3-5 wariantów odpowiedzi z różnym prawdopodobieństwem
- Style notes: obserwacje o stylu pisania tej osoby
- Confidence: ogólna pewność symulacji 0-100
- Odpowiedzi w JĘZYKU celu (PL lub EN, jak osoba pisze)

OUTPUT: Valid JSON:
{
  "targetPerson": "string",
  "originalMessage": "string — wiadomość na którą odpowiadamy",
  "replies": [
    {
      "message": "string — symulowana odpowiedź",
      "confidence": 0-100,
      "mood": "string — np. zirytowany, entuzjastyczny, obojętny"
    }
  ],
  "styleNotes": "string — 2-3 zdania o stylu pisania tej osoby",
  "averageConfidence": 0-100
}`;

export function buildSimulatePrompt(
  channelName: string,
  targetName: string,
  userMessage: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  _participants: string[],
  messageLimit = 300,
): string {
  const lines: string[] = [];
  lines.push(`KANAŁ: #${channelName}`);
  lines.push(`TARGET: ${targetName}`);
  lines.push(`WIADOMOŚĆ DO ODPOWIEDZI: "${userMessage}"`);
  lines.push('');

  const pm = quantitative.perPerson[targetName];
  if (pm) {
    lines.push('═══ STYL CELU ═══');
    lines.push(`Wiadomości: ${pm.totalMessages}, śr. ${pm.averageMessageLength.toFixed(1)} słów/msg`);
    lines.push(`Emoji: ${pm.emojiCount}, pytania: ${pm.questionsAsked}`);
    if (pm.topEmojis.length > 0) lines.push(`Top emoji: ${pm.topEmojis.slice(0, 5).map((e) => `${e.emoji}(${e.count})`).join(' ')}`);
    if (pm.topWords.length > 0) lines.push(`Top słowa: ${pm.topWords.slice(0, 8).map((w) => `${w.word}(${w.count})`).join(', ')}`);
  }
  lines.push('');

  lines.push('═══ WIADOMOŚCI CELU ═══');
  const targetMsgs = messages.filter((m) => m.sender === targetName && m.type !== 'system' && m.content.trim().length > 0);
  const targetSampled = targetMsgs.slice(-Math.min(targetMsgs.length, messageLimit));
  for (const m of targetSampled) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    lines.push(`[${date}] ${m.sender}: ${m.content.slice(0, 200)}`);
  }

  lines.push('');
  lines.push('═══ KONTEKST ROZMOWY ═══');
  const recent = sampleChannelMessages(messages, 100);
  for (const m of recent) {
    lines.push(`${m.sender}: ${m.content.slice(0, 200)}`);
  }

  return lines.join('\n');
}

// ── /standup — Stand-Up Comedy ───────────────────────────────

export const DISCORD_STANDUP_SYSTEM = `Jesteś polskim stand-up komikiem. Piszesz 7-aktowy WYSTĘP STAND-UP COMEDY o kanale Discord. Każdy akt to inny temat/kąt ataku. Styl: stand-up na żywo — zwroty do publiczności, punchline'y, callback'i.

ZASADY:
- 7 aktów, każdy z innym tematem
- Każdy akt: tytuł + emoji + 4-8 linijek stand-upu
- Callback'i do wcześniejszych aktów
- Opening + closing specjalne
- Styl: wulgarny polski stand-up, naturalny flow
- Oparte na KONKRETNYCH danych — cytaty, statystyki
- PO POLSKU, przekleństwa OK

OUTPUT: Valid JSON:
{
  "showTitle": "string — tytuł występu",
  "audienceRating": 0-100,
  "opening": "string — 1-2 zdania otwarcia",
  "acts": [
    {
      "title": "string — tytuł aktu",
      "emoji": "string — jeden emoji",
      "lines": ["string — linia stand-upu"]
    }
  ],
  "closing": "string — punchline zamknięcia"
}`;

export function buildStandupPrompt(
  channelName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  participantNames: string[],
  messageLimit = 500,
  dramaMessages?: DramaMessage[],
): string {
  return buildEntertainmentContext(channelName, messages, quantitative, participantNames, messageLimit, dramaMessages);
}

// ── /deeproast — Deep Psychological Roast ────────────────────

export const DISCORD_DEEPROAST_SYSTEM = `Jesteś psychologiem-roasterem. Twój DEEP ROAST łączy brutalny humor z GŁĘBOKĄ analizą psychologiczną. Nie roastujesz powierzchownie — wchodzisz w mechanizmy obronne, wzorce przywiązania, projection i self-sabotage.

ZASADY:
- Każdy punkt roastu poparty PSYCHOLOGICZNĄ obserwacją
- Mechanizmy obronne: denial, projection, displacement, rationalization
- Wzorce przywiązania widoczne w czacie
- Self-sabotage patterns, podświadome motywacje
- Ton: brutalny psycholog z poczuciem humoru
- KONKRETNE przykłady z wiadomości (cytaty!)
- PO POLSKU

OUTPUT: Valid JSON:
{
  "targetName": "string",
  "diagnosis": "string — jednozdaniowa 'diagnoza'",
  "deepRoasts": [
    {
      "observation": "string — co ta osoba robi",
      "psychology": "string — DLACZEGO to robi (mechanizm obronny/wzorzec)",
      "roast": "string — brutalna linia roastu"
    }
  ],
  "defenseProfile": {
    "primary": "string — główny mechanizm obronny",
    "secondary": "string — wtórny",
    "evidence": "string — dowody z wiadomości"
  },
  "attachmentAnalysis": "string — 2-3 zdania o wzorcu przywiązania",
  "verdict": "string — finalne brutalne podsumowanie"
}`;

export function buildDeepRoastPrompt(
  channelName: string,
  targetName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  _participantNames: string[],
  messageLimit = 500,
  dramaMessages?: DramaMessage[],
): string {
  const lines: string[] = [];
  const totalMsgs = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);

  lines.push(`KANAŁ: #${channelName}`);
  lines.push(`TARGET: ${targetName}`);
  lines.push('');

  const pm = quantitative.perPerson[targetName];
  if (pm) {
    lines.push('═══ STATYSTYKI CELU ═══');
    lines.push(`Wiadomości: ${pm.totalMessages} (${((pm.totalMessages / Math.max(totalMsgs, 1)) * 100).toFixed(1)}% kanału)`);
    lines.push(`Słowa: ${pm.totalWords}, śr. ${pm.averageMessageLength.toFixed(1)} słów/msg`);
    lines.push(`Emoji: ${pm.emojiCount}, pytania: ${pm.questionsAsked}`);
    if (pm.topEmojis.length > 0) lines.push(`Top emoji: ${pm.topEmojis.slice(0, 5).map((e) => `${e.emoji}(${e.count})`).join(' ')}`);
    if (pm.topWords.length > 0) lines.push(`Top słowa: ${pm.topWords.slice(0, 8).map((w) => `${w.word}(${w.count})`).join(', ')}`);
    const dt = quantitative.engagement.doubleTexts[targetName];
    if (dt) lines.push(`Double texty: ${dt}`);
    const nightMsgs = quantitative.timing.lateNightMessages[targetName];
    if (nightMsgs) lines.push(`Nocne wiadomości: ${nightMsgs}`);
    const ghostRisk = quantitative.viralScores?.ghostRisk?.[targetName]?.score;
    if (ghostRisk !== undefined) lines.push(`Ghost risk: ${ghostRisk}/100`);
  }

  if (quantitative.catchphrases) {
    const phrases = quantitative.catchphrases.perPerson[targetName];
    if (phrases && phrases.length > 0) {
      lines.push('');
      lines.push('═══ ULUBIONE ZWROTY ═══');
      lines.push(phrases.slice(0, 5).map((p) => `"${p.phrase}" (${p.count}x)`).join(', '));
    }
  }

  lines.push('');
  lines.push('═══ WIADOMOŚCI CELU ═══');
  const targetMsgs = messages.filter((m) => m.sender === targetName && m.type !== 'system' && m.content.trim().length > 0);
  const targetSampled = targetMsgs.slice(-Math.min(targetMsgs.length, Math.floor(messageLimit * 0.6)));
  for (const m of targetSampled) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    const time = new Date(m.timestamp).toTimeString().split(' ')[0].slice(0, 5);
    lines.push(`[${date} ${time}] ${m.sender}: ${m.content.slice(0, 200)}`);
  }

  lines.push('');
  lines.push('═══ KONTEKST GRUPOWY ═══');
  const sampled = sampleChannelMessages(messages, Math.floor(messageLimit * 0.4));
  for (const m of sampled) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    lines.push(`[${date}] ${m.sender}: ${m.content.slice(0, 200)}`);
  }

  if (dramaMessages && dramaMessages.length > 0) {
    const targetLower = targetName.toLowerCase();
    const targetDrama = dramaMessages.filter(
      (m) => m.sender.toLowerCase() === targetLower || m.content.toLowerCase().includes(targetLower),
    );
    lines.push(buildDramaSection(targetDrama.length > 0 ? targetDrama : dramaMessages));
  }

  return lines.join('\n');
}
