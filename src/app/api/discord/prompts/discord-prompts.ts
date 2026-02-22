/**
 * Shortened, roast-heavy prompts for Discord slash commands.
 * Discord embed limit = 4096 chars per description, so we cap AI output.
 */

import type { QuantitativeAnalysis } from '@/lib/parsers/types';

// ── /roast — Full channel roast ─────────────────────────────

export const DISCORD_CHANNEL_ROAST_SYSTEM = `Jesteś bezlitosnym komikiem-roasterem z polskiego stand-upu. Twoje zadanie: ZNISZCZYĆ cały kanał Discorda — każdego uczestnika i relacje między nimi. Jesteś wulgarny, sarkastyczny i przede wszystkim ZABAWNY.

ZASADY:
- Roastuj KAŻDEGO aktywnego uczestnika (2-3 linijki na osobę)
- Opisz DYNAMIKĘ między ludźmi: kto simpuje do kogo, kto ghostuje, kto dominuje, kto jest invisible
- Każdy roast oparty na KONKRETNYCH DANYCH: statystyki, cytaty, wzorce zachowań
- Styl: wulgarny stand-up comedy, polskie przekleństwa dozwolone (kurwa, pierdolenie, chuj, etc.)
- Wordplay, absurdalny humor, porównania, metafory
- NIE cyberbullying — to ma być ZABAWNE, nie okrutne
- Przydomki dla każdej osoby: kreatywne, trafne, śmieszne
- Obserwacje o relacjach muszą być KONKRETNE (kto do kogo pisze, czasy odpowiedzi, etc.)
- Pisz PO POLSKU

STRUKTURA ODPOWIEDZI — czysty JSON, zero markdown:

{
  "channel_title": "string — śmieszny tytuł dla kanału, np. 'Terapia Grupowa Dla Beznadziejnych'",
  "intro": "string — 2-3 zdania wprowadzenia, ostra charakterystyka ekosystemu kanału",
  "roasts": [
    {
      "name": "string — dokładna nazwa osoby z danych",
      "lines": ["string — 2-3 konkretne linie roastu oparte na danych tej osoby"],
      "tag": "string — krótki przydomek, np. 'Nocny Stalker', 'Królowa Ghostingu'"
    }
  ],
  "dynamics": [
    "string — obserwacja o relacji/dynamice między KONKRETNYMI osobami (names!). Np: 'Michał simpuje do Kasi — 67% jego odpowiedzi jest do niej, a ona odpowiada po 4 godzinach. To nie jest rozmowa, to jest petycja o atencję.'"
  ],
  "verdict": "string — finalne brutalne 2-3 zdania podsumowania całego kanału"
}`;

// ── /personality — MBTI + Big Five snapshot ─────────────────

export const DISCORD_PERSONALITY_SYSTEM = `Jesteś psychologiem-komikiem. Analizujesz styl komunikacji użytkownika Discorda na podstawie jego wiadomości i statystyk. Dajesz profil osobowości — ale z przymrużeniem oka.

ZASADY:
- Bazuj na REALNYCH wzorcach z wiadomości
- MBTI + Big Five + styl przywiązania
- Każda cecha poparta konkretnymi przykładami z danych
- Ton: ekspercki ale sarkastyczny, lekko roastowy
- Polskie opisy, klucze JSON po angielsku
- Bądź KONKRETNY — cytuj dane, nie zgaduj

FORMAT: Czysty JSON, zero markdown poza JSON.

{
  "mbti": {
    "type": "string — np. ENFP, INTJ",
    "confidence": 0-100,
    "evidence": "string — 2-3 zdania wyjaśnienia opartego na danych"
  },
  "big_five": {
    "openness": { "score": 1-100, "note": "string — krótki komentarz" },
    "conscientiousness": { "score": 1-100, "note": "string" },
    "extraversion": { "score": 1-100, "note": "string" },
    "agreeableness": { "score": 1-100, "note": "string" },
    "neuroticism": { "score": 1-100, "note": "string" }
  },
  "attachment_style": {
    "type": "secure | anxious | avoidant | disorganized",
    "evidence": "string — 1-2 zdania"
  },
  "communication_style": "string — 2-3 zdania opisujące jak ta osoba komunikuje się",
  "roast_summary": "string — jedno sarkastyczne zdanie podsumowujące osobowość"
}`;

// ── Message sampling for Discord ────────────────────────────

/**
 * Sample the last N messages from the entire channel (preserving conversation flow).
 * Keeps all senders, chronological order — this is a conversation, not isolated messages.
 */
export function sampleChannelMessages(
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  limit = 500,
): Array<{ sender: string; content: string; timestamp: number }> {
  // Filter out system messages and empty content
  const valid = messages.filter(
    (m) => m.type !== 'system' && m.content.trim().length > 0,
  );

  // Take the last `limit` messages (most recent conversation)
  if (valid.length <= limit) return valid;
  return valid.slice(-limit);
}

/**
 * Sample messages from a specific user for AI analysis.
 * Takes up to `limit` recent messages, weighted toward recent activity.
 */
export function sampleUserMessages(
  messages: Array<{ sender: string; content: string; timestamp: number; index: number }>,
  targetName: string,
  limit = 80,
): Array<{ sender: string; content: string; timestamp: number; index: number }> {
  const userMessages = messages.filter(
    (m) => m.sender === targetName && m.content.length > 0,
  );

  if (userMessages.length <= limit) return userMessages;

  // Weight recent messages: take 60% from last third, 30% middle, 10% first third
  const third = Math.floor(userMessages.length / 3);
  const recentCount = Math.floor(limit * 0.6);
  const middleCount = Math.floor(limit * 0.3);
  const oldCount = limit - recentCount - middleCount;

  const recent = userMessages.slice(-third);
  const middle = userMessages.slice(third, 2 * third);
  const old = userMessages.slice(0, third);

  const sampled = [
    ...pickRandom(old, oldCount),
    ...pickRandom(middle, middleCount),
    ...pickRandom(recent, recentCount),
  ];

  return sampled.sort((a, b) => a.timestamp - b.timestamp);
}

function pickRandom<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) return [...arr];
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Build a full-channel roast prompt with per-person stats + sampled conversation.
 */
export function buildChannelRoastPrompt(
  channelName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; type: string }>,
  quantitative: QuantitativeAnalysis,
  participantNames: string[],
  messageLimit = 500,
): string {
  const lines: string[] = [];

  // Channel metadata
  const totalMsgs = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalMessages, 0);
  const totalWords = Object.values(quantitative.perPerson).reduce((s, p) => s + p.totalWords, 0);

  lines.push(`KANAŁ: #${channelName}`);
  lines.push(`Uczestnicy: ${participantNames.length}`);
  lines.push(`Łącznie wiadomości: ${totalMsgs}`);
  lines.push(`Łącznie słów: ${totalWords}`);
  lines.push(`Sesje rozmów: ${quantitative.engagement.totalSessions}`);
  lines.push('');

  // Per-person stats (sorted by message count desc)
  const sorted = [...participantNames].sort((a, b) => {
    return (quantitative.perPerson[b]?.totalMessages ?? 0) - (quantitative.perPerson[a]?.totalMessages ?? 0);
  });

  // Top 10 for roast (or all if fewer)
  const toRoast = sorted.slice(0, 10);

  lines.push('═══ STATYSTYKI UCZESTNIKÓW ═══');
  for (const name of toRoast) {
    const pm = quantitative.perPerson[name];
    if (!pm) continue;

    lines.push('');
    lines.push(`▸ ${name}`);
    lines.push(`  Wiadomości: ${pm.totalMessages} (${((pm.totalMessages / Math.max(totalMsgs, 1)) * 100).toFixed(1)}% kanału)`);
    lines.push(`  Słowa: ${pm.totalWords}, śr. ${pm.averageMessageLength.toFixed(1)} słów/msg`);
    lines.push(`  Emoji: ${pm.emojiCount} (${pm.messagesWithEmoji} msg z emoji)`);
    lines.push(`  Pytania: ${pm.questionsAsked}`);

    if (pm.topEmojis.length > 0) {
      lines.push(`  Top emoji: ${pm.topEmojis.slice(0, 5).map((e) => `${e.emoji}(${e.count})`).join(' ')}`);
    }
    if (pm.topWords.length > 0) {
      lines.push(`  Top słowa: ${pm.topWords.slice(0, 6).map((w) => `${w.word}(${w.count})`).join(', ')}`);
    }

    // Engagement data
    const dt = quantitative.engagement.doubleTexts[name];
    if (dt) lines.push(`  Double texty: ${dt}`);

    const maxCons = quantitative.engagement.maxConsecutive[name];
    if (maxCons) lines.push(`  Max wiadomości z rzędu: ${maxCons}`);

    const nightMsgs = quantitative.timing.lateNightMessages[name];
    if (nightMsgs) lines.push(`  Nocne wiadomości (22-04): ${nightMsgs}`);

    const timing = quantitative.timing.perPerson[name];
    if (timing?.medianResponseTimeMs && timing.medianResponseTimeMs < Infinity) {
      const ms = timing.medianResponseTimeMs;
      const display = ms < 60_000 ? `${Math.round(ms / 1000)}s` : ms < 3_600_000 ? `${Math.round(ms / 60_000)}min` : `${(ms / 3_600_000).toFixed(1)}h`;
      lines.push(`  Mediana czasu odpowiedzi: ${display}`);
    }

    const initiations = quantitative.timing.conversationInitiations[name];
    if (initiations) lines.push(`  Inicjacje rozmów: ${initiations}`);

    const ghostRisk = quantitative.viralScores?.ghostRisk?.[name]?.score;
    if (ghostRisk !== undefined) lines.push(`  Ghost risk: ${ghostRisk}/100`);
  }

  if (sorted.length > 10) {
    lines.push('');
    lines.push(`(+ ${sorted.length - 10} mniej aktywnych osób pominiętych)`);
  }

  // Catchphrases if available
  if (quantitative.catchphrases) {
    lines.push('');
    lines.push('═══ ULUBIONE ZWROTY ═══');
    for (const name of toRoast) {
      const phrases = quantitative.catchphrases.perPerson[name];
      if (phrases && phrases.length > 0) {
        lines.push(`${name}: ${phrases.slice(0, 3).map((p) => `"${p.phrase}"(${p.count}x)`).join(', ')}`);
      }
    }
  }

  // Sampled conversation
  lines.push('');
  lines.push('═══ OSTATNIE WIADOMOŚCI (fragment konwersacji) ═══');

  const sampled = sampleChannelMessages(messages, messageLimit);
  for (const m of sampled) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    const time = new Date(m.timestamp).toTimeString().split(' ')[0].slice(0, 5);
    lines.push(`[${date} ${time}] ${m.sender}: ${m.content.slice(0, 200)}`);
  }

  return lines.join('\n');
}

/**
 * Format sampled messages + stats into a prompt for Gemini (single-user).
 */
export function buildDiscordUserPrompt(
  targetName: string,
  messages: Array<{ sender: string; content: string; timestamp: number; index: number }>,
  stats: {
    totalMessages: number;
    totalWords: number;
    avgLength: number;
    emojiCount: number;
    questionsAsked: number;
    topEmojis: Array<{ emoji: string; count: number }>;
    topWords: Array<{ word: string; count: number }>;
    messagesWithEmoji: number;
  },
  extras?: {
    doubleTexts?: number;
    lateNightMessages?: number;
    medianResponseTimeMs?: number;
    ghostRisk?: number;
  },
): string {
  const lines: string[] = [];

  lines.push(`TARGET: ${targetName}`);
  lines.push('');
  lines.push('STATYSTYKI:');
  lines.push(`- Wiadomości: ${stats.totalMessages}`);
  lines.push(`- Słowa: ${stats.totalWords}`);
  lines.push(`- Śr. długość: ${stats.avgLength.toFixed(1)} słów/wiadomość`);
  lines.push(`- Emoji: ${stats.emojiCount} (${stats.messagesWithEmoji} wiadomości z emoji)`);
  lines.push(`- Pytania zadane: ${stats.questionsAsked}`);

  if (stats.topEmojis.length > 0) {
    lines.push(`- Top emoji: ${stats.topEmojis.slice(0, 5).map((e) => `${e.emoji}(${e.count})`).join(' ')}`);
  }
  if (stats.topWords.length > 0) {
    lines.push(`- Top słowa: ${stats.topWords.slice(0, 8).map((w) => `${w.word}(${w.count})`).join(', ')}`);
  }

  if (extras) {
    if (extras.doubleTexts !== undefined) lines.push(`- Double texty: ${extras.doubleTexts}`);
    if (extras.lateNightMessages !== undefined) lines.push(`- Nocne wiadomości (22-04): ${extras.lateNightMessages}`);
    if (extras.medianResponseTimeMs !== undefined) {
      const ms = extras.medianResponseTimeMs;
      const display = ms < 60_000 ? `${Math.round(ms / 1000)}s` : ms < 3_600_000 ? `${Math.round(ms / 60_000)}min` : `${(ms / 3_600_000).toFixed(1)}h`;
      lines.push(`- Mediana czasu odpowiedzi: ${display}`);
    }
    if (extras.ghostRisk !== undefined) lines.push(`- Ghost risk: ${extras.ghostRisk}/100`);
  }

  lines.push('');
  lines.push('PRÓBKA WIADOMOŚCI:');

  const sampled = sampleUserMessages(messages, targetName);
  for (const m of sampled) {
    const date = new Date(m.timestamp).toISOString().split('T')[0];
    const time = new Date(m.timestamp).toTimeString().split(' ')[0].slice(0, 5);
    lines.push(`[${date} ${time}] ${m.sender}: ${m.content.slice(0, 300)}`);
  }

  return lines.join('\n');
}
