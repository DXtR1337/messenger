/**
 * Deep Message Scanner for PodTeksT.
 * Client-side module — extracts high-signal material from full conversation
 * for Enhanced Roast and Dating Profile pipelines.
 *
 * Scanning algorithms:
 * 1. Confession detector — longest emotional messages per person
 * 2. Embarrassing quote extractor — scored by word count × emotional density × time factor
 * 3. Contradiction finder — strong assertions followed by counter-evidence
 * 4. Topic obsession detector — recurring bigrams per person
 * 5. Power move detector — left-on-read, apology initiator, double-text chains
 * 6. Pet name extractor — PL/EN endearments
 * 7. Thread extractor — emotionally dense conversation exchanges
 *
 * Performance target: <500ms on 50K messages.
 */

import type { ParsedConversation, UnifiedMessage, QuantitativeAnalysis } from '../parsers/types';

// ============================================================
// Types
// ============================================================

export interface PersonDossier {
  confessions: ScoredQuote[];
  embarrassingQuotes: ScoredQuote[];
  contradictions: Contradiction[];
  topicObsessions: TopicObsession[];
  powerMoves: PowerMoves;
  petNames: string[];
}

export interface ScoredQuote {
  content: string;
  timestamp: number;
  wordCount: number;
  reason: string;
}

export interface Contradiction {
  assertion: string;
  assertionTimestamp: number;
  counterEvidence: string;
  counterTimestamp: number;
  label: string;
}

export interface TopicObsession {
  topic: string;
  count: number;
  examples: string[];
}

export interface PowerMoves {
  leftOnReadCount: number;
  leftOnReadWorst?: { gapHours: number; followUp: string };
  apologizesFirstCount: number;
  doubleTextChains: number;
  worstDoubleText?: { count: number; snippet: string };
}

export interface ConversationThread {
  topic: string;
  messages: Array<{ sender: string; content: string; timestamp: number }>;
  score: number;
}

export interface DeepScanResult {
  perPerson: Record<string, PersonDossier>;
  interestingThreads: ConversationThread[];
  formattedForPrompt: string;
}

// ============================================================
// Constants
// ============================================================

const EMOTIONAL_KEYWORDS_PL = new Set([
  'kocham', 'tęsknię', 'przepraszam', 'boję', 'nienawidzę', 'płaczę',
  'samotny', 'samotna', 'smutny', 'smutna', 'żałuję', 'złość',
  'wściekły', 'wściekła', 'boli', 'cierpię', 'potrzebuję', 'obiecuję',
  'wyznaję', 'czuję', 'przerażony', 'przerażona', 'bezradny', 'bezradna',
  'zraniony', 'zraniona', 'załamany', 'załamana', 'depresja', 'lęk',
  'wstyd', 'żal', 'gniew', 'rozpacz', 'nadzieja', 'zaufanie',
  'zdrada', 'kłamstwo', 'oszukać', 'krzywdzisz', 'ranisz',
]);

const EMOTIONAL_KEYWORDS_EN = new Set([
  'love', 'hate', 'miss', 'sorry', 'afraid', 'scared', 'cry',
  'lonely', 'sad', 'depressed', 'angry', 'hurt', 'pain',
  'need', 'promise', 'feel', 'trust', 'betray', 'lie',
  'forgive', 'regret', 'ashamed', 'desperate', 'heartbroken',
]);

const ASSERTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /nie obchodzi mnie/i, label: 'Powiedział(a) "nie obchodzi mnie"' },
  { pattern: /koniec/i, label: 'Ogłosił(a) "koniec"' },
  { pattern: /odchodzę/i, label: 'Powiedział(a) "odchodzę"' },
  { pattern: /nie chcę ci[eę]/i, label: 'Powiedział(a) "nie chcę cię"' },
  { pattern: /nie pisz do mnie/i, label: 'Powiedział(a) "nie pisz do mnie"' },
  { pattern: /blokuj[eę]/i, label: 'Powiedział(a) "blokuję"' },
  { pattern: /nigdy wi[eę]cej/i, label: 'Obiecał(a) "nigdy więcej"' },
  { pattern: /never again/i, label: 'Powiedział(a) "never again"' },
  { pattern: /mam dość/i, label: 'Powiedział(a) "mam dość"' },
  { pattern: /nie zależy mi/i, label: 'Powiedział(a) "nie zależy mi"' },
  { pattern: /rzucam ci[eę]/i, label: 'Powiedział(a) "rzucam cię"' },
];

const PET_NAME_PATTERNS = [
  /\bkotk[uao]\b/i, /\bmisi[uaeę]\b/i, /\bskarbiec?k?[uao]?\b/i, /\bskarbiu?\b/i,
  /\bkochani[eę]\b/i, /\bsłoneczk[oau]\b/i, /\bbabyu?\b/i, /\bbabe\b/i,
  /\bhoney\b/i, /\bsweetheart\b/i, /\bdarling\b/i, /\bsłodk[iae]\b/i,
  /\bmisiak[uae]?\b/i, /\bprzytulank[oaue]?\b/i, /\bkruszynk[oaue]?\b/i,
  /\bzłotko\b/i, /\bserduszk[oau]\b/i, /\bprincess\b/i, /\bprincessa?\b/i,
  /\bcudowny\b/i, /\bcudowna\b/i, /\bmy love\b/i, /\bmon amour\b/i,
];

const APOLOGY_PATTERNS = [
  /\bprzepraszam\b/i, /\bsorry\b/i, /\bmoja wina\b/i, /\bmy bad\b/i,
  /\bprzepro[sś]\b/i, /\bwyba[cć]z\b/i,
];

const POLISH_STOP_WORDS = new Set([
  'i', 'w', 'na', 'z', 'do', 'nie', 'to', 'się', 'że', 'o', 'jak', 'ale',
  'za', 'co', 'tak', 'jest', 'od', 'po', 'czy', 'już', 'mi', 'tu', 'ja',
  'ty', 'mnie', 'ci', 'go', 'są', 'te', 'ten', 'ta', 'tym', 'tego',
  'tej', 'było', 'był', 'być', 'będzie', 'je', 'bo', 'też', 'tylko',
  'może', 'no', 'ok', 'xd', 'haha', 'lol', 'a', 'the', 'is', 'it',
  'for', 'and', 'of', 'to', 'in', 'was', 'you', 'that', 'this',
  'my', 'me', 'we', 'he', 'she', 'they', 'them', 'his', 'her',
  'but', 'with', 'have', 'had', 'has', 'are', 'be', 'been',
  'would', 'will', 'can', 'just', 'what', 'when', 'where', 'how',
  'all', 'if', 'or', 'an', 'at', 'by', 'so', 'no', 'not',
  'jeszcze', 'jako', 'ze', 'juz', 'nad', 'przed', 'pod', 'przez',
  'sobie', 'tam', 'tutaj', 'kiedy', 'gdzie', 'ktory', 'która',
]);

// ============================================================
// Helpers
// ============================================================

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function emotionalDensity(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  if (words.length === 0) return 0;
  let hits = 0;
  for (const w of words) {
    if (EMOTIONAL_KEYWORDS_PL.has(w) || EMOTIONAL_KEYWORDS_EN.has(w)) hits++;
  }
  return hits / words.length;
}

function lateNightFactor(timestamp: number): number {
  const hour = new Date(timestamp).getHours();
  if (hour >= 3 && hour <= 5) return 3;
  if (hour >= 1 && hour <= 2) return 2;
  if (hour >= 0 || hour === 23) return 1.5;
  return 1;
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const date = d.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

// ============================================================
// 1. Confession Detector
// ============================================================

function detectConfessions(
  messages: UnifiedMessage[],
  personName: string,
): ScoredQuote[] {
  const personMsgs = messages.filter(m => m.sender === personName && m.content.length > 0);

  // Sort by word count (longest first), take top 15
  const sorted = personMsgs
    .map(m => ({ msg: m, wc: countWords(m.content) }))
    .filter(x => x.wc >= 30)
    .sort((a, b) => b.wc - a.wc)
    .slice(0, 15);

  return sorted.map(({ msg, wc }) => ({
    content: truncate(msg.content, 250),
    timestamp: msg.timestamp,
    wordCount: wc,
    reason: wc > 100 ? 'najdłuższa wiadomość' : 'długie wyznanie',
  }));
}

// ============================================================
// 2. Embarrassing Quote Extractor
// ============================================================

function extractEmbarrassingQuotes(
  messages: UnifiedMessage[],
  personName: string,
): ScoredQuote[] {
  const personMsgs = messages.filter(m => m.sender === personName && m.content.length > 5);

  const scored = personMsgs.map(msg => {
    const wc = countWords(msg.content);
    const emo = emotionalDensity(msg.content);
    const nightFactor = lateNightFactor(msg.timestamp);
    const score = wc * (0.3 + emo * 2) * nightFactor;

    let reason = '';
    if (nightFactor >= 2) reason = `nocna wiadomość o ${new Date(msg.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;
    else if (emo > 0.15) reason = 'emocjonalna eksplozja';
    else if (wc > 60) reason = 'ściana tekstu';
    else reason = 'żenujący moment';

    return { msg, score, wc, reason };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ msg, wc, reason }) => ({
      content: truncate(msg.content, 200),
      timestamp: msg.timestamp,
      wordCount: wc,
      reason,
    }));
}

// ============================================================
// 3. Contradiction Finder
// ============================================================

function findContradictions(
  messages: UnifiedMessage[],
  personName: string,
): Contradiction[] {
  const personMsgs = messages.filter(m => m.sender === personName && m.content.length > 0);
  const allMsgs = messages;
  const contradictions: Contradiction[] = [];

  for (const msg of personMsgs) {
    for (const { pattern, label } of ASSERTION_PATTERNS) {
      if (!pattern.test(msg.content)) continue;

      // Look forward 24-72h for counter-evidence
      const windowStart = msg.timestamp + 1;
      const windowEnd = msg.timestamp + 72 * 3600 * 1000;

      // Count messages from this person in the window
      let msgCountInWindow = 0;
      let hasAffection = false;
      let counterMsg: UnifiedMessage | null = null;

      for (const future of allMsgs) {
        if (future.timestamp < windowStart || future.timestamp > windowEnd) continue;
        if (future.sender !== personName) continue;
        if (!future.content) continue;

        msgCountInWindow++;

        // Check for affectionate language
        if (/kocham|tęsknię|miss|love|przepraszam|sorry|skarb|kotk|misi/i.test(future.content)) {
          hasAffection = true;
          if (!counterMsg) counterMsg = future;
        }
      }

      if (msgCountInWindow >= 8 || hasAffection) {
        const evidence = hasAffection && counterMsg
          ? `→ ${Math.round((counterMsg.timestamp - msg.timestamp) / 3600000)}h później: "${truncate(counterMsg.content, 100)}"`
          : `→ wysłał(a) ${msgCountInWindow} wiadomości w ciągu ${Math.round((windowEnd - windowStart) / 3600000)}h`;

        contradictions.push({
          assertion: truncate(msg.content, 150),
          assertionTimestamp: msg.timestamp,
          counterEvidence: evidence,
          counterTimestamp: counterMsg?.timestamp ?? msg.timestamp + 24 * 3600000,
          label,
        });
      }

      break; // one match per message
    }
  }

  return contradictions.slice(0, 8);
}

// ============================================================
// 4. Topic Obsession Detector
// ============================================================

function detectTopicObsessions(
  messages: UnifiedMessage[],
  personName: string,
): TopicObsession[] {
  const bigramCounts = new Map<string, { count: number; examples: string[] }>();
  const personMsgs = messages.filter(m => m.sender === personName && m.content.length > 3);

  for (const msg of personMsgs) {
    const words = msg.content.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !POLISH_STOP_WORDS.has(w));

    const seenBigrams = new Set<string>();
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (seenBigrams.has(bigram)) continue;
      seenBigrams.add(bigram);

      const entry = bigramCounts.get(bigram) ?? { count: 0, examples: [] };
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push(truncate(msg.content, 100));
      }
      bigramCounts.set(bigram, entry);
    }
  }

  // Also track single-word obsessions (high frequency)
  const wordCounts = new Map<string, { count: number; examples: string[] }>();
  for (const msg of personMsgs) {
    const words = msg.content.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !POLISH_STOP_WORDS.has(w));

    const seen = new Set<string>();
    for (const w of words) {
      if (seen.has(w)) continue;
      seen.add(w);
      const entry = wordCounts.get(w) ?? { count: 0, examples: [] };
      entry.count++;
      if (entry.examples.length < 3) {
        entry.examples.push(truncate(msg.content, 100));
      }
      wordCounts.set(w, entry);
    }
  }

  // Merge bigrams and high-freq words
  const results: TopicObsession[] = [];

  for (const [bigram, data] of bigramCounts) {
    if (data.count >= 5) {
      results.push({ topic: bigram, count: data.count, examples: data.examples });
    }
  }

  for (const [word, data] of wordCounts) {
    if (data.count >= 15) {
      // Don't duplicate if already covered by a bigram
      const coveredByBigram = results.some(r => r.topic.includes(word));
      if (!coveredByBigram) {
        results.push({ topic: word, count: data.count, examples: data.examples });
      }
    }
  }

  return results.sort((a, b) => b.count - a.count).slice(0, 7);
}

// ============================================================
// 5. Power Move Detector
// ============================================================

function detectPowerMoves(
  messages: UnifiedMessage[],
  personName: string,
): PowerMoves {
  const result: PowerMoves = {
    leftOnReadCount: 0,
    apologizesFirstCount: 0,
    doubleTextChains: 0,
  };

  // Left on read: person sends msg → gap >4h → SAME person messages again
  let lastSender = '';
  let lastTimestamp = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.content) continue;

    if (msg.sender === personName && lastSender === personName) {
      const gapMs = msg.timestamp - lastTimestamp;
      const gapHours = gapMs / 3600000;
      if (gapHours >= 4) {
        result.leftOnReadCount++;
        if (!result.leftOnReadWorst || gapHours > result.leftOnReadWorst.gapHours) {
          result.leftOnReadWorst = {
            gapHours: Math.round(gapHours * 10) / 10,
            followUp: truncate(msg.content, 80),
          };
        }
      }
    }

    lastSender = msg.sender;
    lastTimestamp = msg.timestamp;
  }

  // Apology initiator: who says sorry first in conflict windows
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.sender !== personName) continue;

    for (const pat of APOLOGY_PATTERNS) {
      if (pat.test(msg.content)) {
        // Check if this is the first apology in a 6h window
        const windowStart = msg.timestamp - 6 * 3600000;
        let otherApologizedFirst = false;
        for (let j = i - 1; j >= 0 && messages[j].timestamp > windowStart; j--) {
          if (messages[j].sender !== personName) {
            for (const aPat of APOLOGY_PATTERNS) {
              if (aPat.test(messages[j].content)) {
                otherApologizedFirst = true;
                break;
              }
            }
          }
          if (otherApologizedFirst) break;
        }
        if (!otherApologizedFirst) {
          result.apologizesFirstCount++;
        }
        break;
      }
    }
  }

  // Double-text chains: 3+ consecutive from same person
  let consecutiveCount = 0;
  let worstChainCount = 0;
  let worstChainSnippet = '';

  for (const msg of messages) {
    if (msg.sender === personName && msg.content) {
      consecutiveCount++;
      if (consecutiveCount >= 3) {
        if (consecutiveCount === 3) result.doubleTextChains++;
        if (consecutiveCount > worstChainCount) {
          worstChainCount = consecutiveCount;
          worstChainSnippet = truncate(msg.content, 80);
        }
      }
    } else {
      consecutiveCount = 0;
    }
  }

  if (worstChainCount >= 3) {
    result.worstDoubleText = { count: worstChainCount, snippet: worstChainSnippet };
  }

  return result;
}

// ============================================================
// 6. Pet Name Extractor
// ============================================================

function extractPetNames(
  messages: UnifiedMessage[],
  personName: string,
): string[] {
  const found = new Set<string>();
  const personMsgs = messages.filter(m => m.sender === personName);

  for (const msg of personMsgs) {
    for (const pattern of PET_NAME_PATTERNS) {
      const match = msg.content.match(pattern);
      if (match) {
        found.add(match[0].toLowerCase());
      }
    }
  }

  return Array.from(found);
}

// ============================================================
// 7. Thread Extractor
// ============================================================

function extractInterestingThreads(
  messages: UnifiedMessage[],
): ConversationThread[] {
  // Group consecutive messages where gap < 30min into exchanges
  const exchanges: Array<{ msgs: UnifiedMessage[]; score: number }> = [];
  let currentExchange: UnifiedMessage[] = [];

  for (const msg of messages) {
    if (!msg.content) continue;

    if (currentExchange.length === 0) {
      currentExchange.push(msg);
      continue;
    }

    const gap = msg.timestamp - currentExchange[currentExchange.length - 1].timestamp;
    if (gap < 30 * 60 * 1000) {
      currentExchange.push(msg);
    } else {
      if (currentExchange.length >= 5) {
        exchanges.push({ msgs: [...currentExchange], score: 0 });
      }
      currentExchange = [msg];
    }
  }
  if (currentExchange.length >= 5) {
    exchanges.push({ msgs: [...currentExchange], score: 0 });
  }

  // Score exchanges
  for (const exchange of exchanges) {
    const text = exchange.msgs.map(m => m.content).join(' ');
    const emo = emotionalDensity(text);
    const avgLen = exchange.msgs.reduce((s, m) => s + m.content.length, 0) / exchange.msgs.length;
    const lengthVariance = Math.sqrt(
      exchange.msgs.reduce((s, m) => s + (m.content.length - avgLen) ** 2, 0) / exchange.msgs.length,
    );
    const nightBonus = exchange.msgs.some(m => lateNightFactor(m.timestamp) >= 2) ? 1.5 : 1;

    exchange.score = (emo * 10 + lengthVariance * 0.01 + exchange.msgs.length * 0.1) * nightBonus;
  }

  return exchanges
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(exchange => {
      // Take 5-15 messages
      const msgs = exchange.msgs.slice(0, 15);
      const firstWords = msgs.map(m => m.content.split(/\s+/).slice(0, 5).join(' ')).join(', ');

      return {
        topic: truncate(firstWords, 60),
        messages: msgs.map(m => ({
          sender: m.sender,
          content: truncate(m.content, 150),
          timestamp: m.timestamp,
        })),
        score: exchange.score,
      };
    });
}

// ============================================================
// Formatter — produce ~4-5KB prompt text
// ============================================================

function formatForPrompt(
  perPerson: Record<string, PersonDossier>,
  threads: ConversationThread[],
): string {
  const MAX_SIZE = 5000;
  const sections: string[] = ['=== DEEP MESSAGE RESEARCH ==='];
  let currentSize = sections[0].length;

  for (const [name, dossier] of Object.entries(perPerson)) {
    const personSection: string[] = [`\n--- ${name} ---`];

    // Confessions (top 5)
    if (dossier.confessions.length > 0) {
      personSection.push('WYZNANIA (najdłuższe wiadomości):');
      for (const c of dossier.confessions.slice(0, 5)) {
        personSection.push(`  [${formatTime(c.timestamp)}] "${c.content}" (${c.wordCount} słów)`);
      }
    }

    // Embarrassing quotes (top 5)
    if (dossier.embarrassingQuotes.length > 0) {
      personSection.push('ŻENUJĄCE CYTATY:');
      for (const q of dossier.embarrassingQuotes.slice(0, 5)) {
        personSection.push(`  [${formatTime(q.timestamp)}] "${q.content}" — ${q.reason}`);
      }
    }

    // Contradictions (top 3)
    if (dossier.contradictions.length > 0) {
      personSection.push('SPRZECZNOŚCI (powiedziane vs zrobione):');
      for (const c of dossier.contradictions.slice(0, 3)) {
        personSection.push(`  ${c.label}: "${truncate(c.assertion, 80)}" ${c.counterEvidence}`);
      }
    }

    // Topic obsessions (top 3)
    if (dossier.topicObsessions.length > 0) {
      personSection.push('OBSESJE TEMATYCZNE:');
      for (const t of dossier.topicObsessions.slice(0, 3)) {
        const examples = t.examples.slice(0, 2).map(e => `"${e}"`).join(', ');
        personSection.push(`  ${t.topic} (${t.count}x): ${examples}`);
      }
    }

    // Pet names
    if (dossier.petNames.length > 0) {
      personSection.push(`KSYWKI: ${dossier.petNames.join(', ')}`);
    }

    // Power moves
    const pm = dossier.powerMoves;
    const powerLines: string[] = [];
    if (pm.leftOnReadCount > 0) {
      powerLines.push(`Left-on-read: ${pm.leftOnReadCount}x${pm.leftOnReadWorst ? ` (rekord: ${pm.leftOnReadWorst.gapHours}h, potem: "${pm.leftOnReadWorst.followUp}")` : ''}`);
    }
    if (pm.apologizesFirstCount > 0) {
      powerLines.push(`Przeprasza pierwszy/a: ${pm.apologizesFirstCount}x`);
    }
    if (pm.doubleTextChains > 0) {
      powerLines.push(`Double-text chains (3+): ${pm.doubleTextChains}x${pm.worstDoubleText ? ` (rekord: ${pm.worstDoubleText.count} z rzędu)` : ''}`);
    }
    if (powerLines.length > 0) {
      personSection.push('POWER MOVES:');
      for (const line of powerLines) {
        personSection.push(`  ${line}`);
      }
    }

    const sectionText = personSection.join('\n');
    if (currentSize + sectionText.length > MAX_SIZE) break;
    sections.push(sectionText);
    currentSize += sectionText.length;
  }

  // Interesting threads (top 3)
  if (threads.length > 0 && currentSize < MAX_SIZE - 500) {
    const threadSection: string[] = ['\nCIEKAWE WĄTKI:'];
    for (const thread of threads.slice(0, 3)) {
      threadSection.push(`[Wątek: "${thread.topic}"] (${thread.messages.length} wiadomości)`);
      for (const m of thread.messages.slice(0, 5)) {
        const time = new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        threadSection.push(`  [${time}] ${m.sender}: "${m.content}"`);
      }
    }
    const threadText = threadSection.join('\n');
    if (currentSize + threadText.length <= MAX_SIZE) {
      sections.push(threadText);
    }
  }

  return sections.join('\n');
}

// ============================================================
// Public: Main scanner entry point
// ============================================================

export function runDeepScan(
  conversation: ParsedConversation,
  _quantitative?: QuantitativeAnalysis,
): DeepScanResult {
  const { messages } = conversation;
  const participants = conversation.participants.map(p => p.name);
  const perPerson: Record<string, PersonDossier> = {};

  for (const name of participants) {
    perPerson[name] = {
      confessions: detectConfessions(messages, name),
      embarrassingQuotes: extractEmbarrassingQuotes(messages, name),
      contradictions: findContradictions(messages, name),
      topicObsessions: detectTopicObsessions(messages, name),
      powerMoves: detectPowerMoves(messages, name),
      petNames: extractPetNames(messages, name),
    };
  }

  const interestingThreads = extractInterestingThreads(messages);
  const formattedForPrompt = formatForPrompt(perPerson, interestingThreads);

  return { perPerson, interestingThreads, formattedForPrompt };
}
