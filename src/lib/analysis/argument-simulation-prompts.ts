/**
 * Argument Simulation — Gemini AI prompt module.
 *
 * Two prompts:
 * A) Enrichment — deepens conflict fingerprint with sarcasm, triggers, topics
 * B) Generation — produces a full realistic argument script with timing metadata
 *
 * Server-side only.
 */

import 'server-only';
import { callGeminiWithRetry } from './gemini';

import type {
  PersonProfile,
  Pass1Result,
  Pass2Result,
  ArgumentSimulationMessage,
  ArgumentSummary,
  ArgumentTopic,
  EnrichedFingerprintData,
} from './types';
import type { ConflictFingerprintResult } from './quant/conflict-fingerprint';

// ============================================================
// Types
// ============================================================

export interface EnrichmentParams {
  participants: string[];
  conflictFingerprint?: ConflictFingerprintResult;
  /** Sampled messages from around conflict windows */
  conflictSamples: string[];
  /** Per-person personality profiles from Pass 3 */
  personalityProfiles?: Record<string, PersonProfile>;
  /** Tone & relationship from Pass 1 */
  toneAnalysis?: Pass1Result;
  /** Dynamics from Pass 2 */
  dynamicsAnalysis?: Pass2Result;
  quantitativeContext: string;
}

export interface EnrichmentResult {
  topics: ArgumentTopic[];
  perPerson: Record<string, {
    sarcasmPatterns: string[];
    emotionalTriggers: string[];
    deepEscalationStyle: string;
    deepDeescalationStyle: string;
  }>;
}

export interface GenerationParams {
  topic: string;
  participants: string[];
  enrichedFingerprint: EnrichedFingerprintData;
  conflictFingerprint?: ConflictFingerprintResult;
  /** Per-person example messages (30 each) for voice cloning */
  exampleMessages: Record<string, string[]>;
  /** Per-person top words */
  topWords: Record<string, Array<{ word: string; count: number }>>;
  /** Per-person top phrases */
  topPhrases: Record<string, Array<{ phrase: string; count: number }>>;
  /** Per-person avg message length in words */
  avgMessageLength: Record<string, number>;
  /** Per-person emoji frequency 0-1 */
  emojiFrequency: Record<string, number>;
  /** Per-person top emojis */
  topEmojis: Record<string, Array<{ emoji: string; count: number }>>;
  /** Per-person median response time in ms */
  medianResponseTimes: Record<string, number>;
  personalityProfiles?: Record<string, PersonProfile>;
  toneAnalysis?: Pass1Result;
  dynamicsAnalysis?: Pass2Result;
  quantitativeContext: string;
}

export interface GenerationResult {
  messages: ArgumentSimulationMessage[];
  summary: ArgumentSummary;
}

// ============================================================
// Prompt A: Enrichment + Topic Extraction
// ============================================================

function buildEnrichmentPrompt(params: EnrichmentParams): string {
  const { participants, conflictFingerprint, conflictSamples, personalityProfiles, toneAnalysis, dynamicsAnalysis } = params;

  const fingerprintBlock = conflictFingerprint
    ? `\nCONFLICT FINGERPRINT (quantitative analysis):\n${JSON.stringify(conflictFingerprint, null, 2)}`
    : '\nNo quantitative conflict fingerprint available — extrapolate from communication style.';

  const samplesBlock = conflictSamples.length > 0
    ? `\nREAL MESSAGES FROM CONFLICT WINDOWS (study these carefully):\n${conflictSamples.map((m, i) => `[${i + 1}] ${m}`).join('\n')}`
    : '\nNo conflict messages available — extrapolate from personality and communication patterns.';

  // Personality context
  const personalityParts: string[] = [];
  for (const name of participants) {
    const profile = personalityProfiles?.[name];
    if (!profile) continue;
    const parts: string[] = [`\n${name}:`];
    if (profile.mbti) parts.push(`  MBTI: ${profile.mbti.type}`);
    if (profile.communication_profile) {
      parts.push(`  Style: ${profile.communication_profile.style}, assertiveness: ${profile.communication_profile.assertiveness}/10`);
      if (profile.communication_profile.verbal_tics.length > 0) {
        parts.push(`  Verbal tics: ${profile.communication_profile.verbal_tics.join(', ')}`);
      }
    }
    if (profile.conflict_resolution) {
      parts.push(`  Conflict style: ${profile.conflict_resolution.primary_style}, recovery: ${profile.conflict_resolution.recovery_speed}`);
    }
    if (profile.attachment_indicators) {
      parts.push(`  Attachment: ${profile.attachment_indicators.primary_style}`);
    }
    personalityParts.push(parts.join('\n'));
  }

  const dynamicsBlock = dynamicsAnalysis?.conflict_patterns
    ? `\nCONFLICT PATTERNS FROM AI ANALYSIS:\n- Frequency: ${dynamicsAnalysis.conflict_patterns.conflict_frequency}\n- Typical trigger: ${dynamicsAnalysis.conflict_patterns.typical_trigger ?? 'unknown'}\n- Resolution styles: ${JSON.stringify(dynamicsAnalysis.conflict_patterns.resolution_style)}\n- Unresolved tensions: ${dynamicsAnalysis.conflict_patterns.unresolved_tensions.join('; ')}`
    : '';

  return `You are a conflict behavior analyst. Analyze the conversation data to extract:
1. Hot topics that cause conflicts between these people (5-8 topics)
2. Deep behavioral patterns per person during conflicts

PARTICIPANTS: ${participants.join(', ')}
${fingerprintBlock}
${samplesBlock}
${personalityParts.length > 0 ? '\nPERSONALITY PROFILES:' + personalityParts.join('') : ''}
${dynamicsBlock}

INSTRUCTIONS:
- Extract 5-8 topics that cause or would cause arguments between these people
- For each topic, determine each person's typical STANCE (position/attitude)
- Rate topic volatility: low (mild disagreement), medium (heated discussion), high (explosive)
- For each person, identify:
  - Sarcasm patterns (how they deploy sarcasm when angry)
  - Emotional triggers (what sets them off)
  - Deep escalation style (beyond basic classification — describe their specific escalation behavior)
  - Deep de-escalation style (how they specifically try to end conflicts)
- If data is insufficient, extrapolate from personality profiles and communication style
- All text output in Polish (pl-PL). JSON keys in English.
- Be specific and behavioral — not generic.

${participants.length === 2
    ? `Use "${participants[0]}" and "${participants[1]}" as the person names in stanceA and stanceB respectively.`
    : `Use the first two participants for stanceA and stanceB.`}

OUTPUT: Valid JSON only, no markdown:
{
  "topics": [
    {
      "topic": "string — topic name in Polish",
      "frequency": number — estimated frequency (1-10 scale),
      "stanceA": "string — ${participants[0]}'s position in Polish",
      "stanceB": "string — ${participants[1] ?? 'Person B'}'s position in Polish",
      "volatility": "low" | "medium" | "high"
    }
  ],
  "perPerson": {
    "${participants[0]}": {
      "sarcasmPatterns": ["string — specific sarcasm pattern in Polish"],
      "emotionalTriggers": ["string — what triggers them"],
      "deepEscalationStyle": "string — detailed description of how they escalate",
      "deepDeescalationStyle": "string — how they de-escalate"
    },
    "${participants[1] ?? 'Person B'}": { ... same structure }
  }
}`;
}

// ============================================================
// Prompt B: Argument Script Generation
// ============================================================

function buildGenerationPrompt(params: GenerationParams): string {
  const {
    topic,
    participants,
    enrichedFingerprint,
    conflictFingerprint,
    exampleMessages,
    topWords,
    topPhrases,
    avgMessageLength,
    emojiFrequency,
    topEmojis,
    medianResponseTimes,
    personalityProfiles,
    toneAnalysis,
  } = params;

  // Build per-person voice profiles
  const voiceBlocks: string[] = [];
  for (const name of participants) {
    const examples = (exampleMessages[name] ?? []).slice(0, 30);
    const words = (topWords[name] ?? []).slice(0, 30).map(w => `${w.word} (${w.count}x)`).join(', ');
    const phrases = (topPhrases[name] ?? []).slice(0, 15).map(p => `"${p.phrase}" (${p.count}x)`).join(', ');
    const avgLen = avgMessageLength[name] ?? 10;
    const emojiRate = emojiFrequency[name] ?? 0;
    const emojis = (topEmojis[name] ?? []).slice(0, 8).map(e => `${e.emoji} (${e.count}x)`).join(', ');
    const medianRT = medianResponseTimes[name] ?? 60000;
    const fp = conflictFingerprint?.perPerson[name];
    const enriched = enrichedFingerprint.perPerson[name];
    const profile = personalityProfiles?.[name];
    const tone = toneAnalysis?.tone_per_person?.[name];

    const examplesStr = examples.map((m, i) => `  [${i + 1}] ${m}`).join('\n');

    voiceBlocks.push(`
═══ ${name.toUpperCase()} ═══
REAL MESSAGES (study the STYLE, not the words):
${examplesStr}

WRITING STYLE:
- Avg message length: ${Math.round(avgLen)} words (${avgLen < 5 ? 'very short/terse' : avgLen < 12 ? 'medium' : 'elaborate'})
- Emoji: ${emojiRate > 0.5 ? 'heavy' : emojiRate > 0.15 ? 'moderate' : 'rare'} (${emojis || 'none'})
- Common phrases: ${phrases || 'none extracted'}
- Vocabulary: ${words || 'none extracted'}
- Median response time: ${Math.round(medianRT / 1000)}s
${tone ? `- Tone: ${tone.primary_tone}, formality: ${tone.formality_level}/10, humor: ${tone.humor_presence}/10 (${tone.humor_style})` : ''}
${profile?.communication_profile ? `- Verbal tics: ${profile.communication_profile.verbal_tics.join(', ') || 'none'}` : ''}

CONFLICT BEHAVIOR:
${fp ? `- Escalation: ${fp.escalationStyle} (burst length: ${fp.avgBurstLengthInConflict} msgs, msg length ratio: ${fp.msgLengthRatioConflictVsNormal}x)` : '- No conflict data available'}
${fp ? `- De-escalation: ${fp.deescalationStyle}` : ''}
${fp ? `- Double-text rate in conflict: ${fp.doubleTextRateInConflict}/100 msgs` : ''}
${fp ? `- Conflict vocabulary: ${fp.conflictVocabulary.slice(0, 10).join(', ') || 'none detected'}` : ''}
${enriched ? `- Sarcasm patterns: ${enriched.sarcasmPatterns.join('; ')}` : ''}
${enriched ? `- Emotional triggers: ${enriched.emotionalTriggers.join('; ')}` : ''}
${enriched ? `- Deep escalation: ${enriched.deepEscalationStyle}` : ''}
${enriched ? `- Deep de-escalation: ${enriched.deepDeescalationStyle}` : ''}

TOPIC STANCE: ${enrichedFingerprint.topics.find(t => t.topic === topic)
      ? `${enrichedFingerprint.topics.find(t => t.topic === topic)![participants.indexOf(name) === 0 ? 'stanceA' : 'stanceB']}`
      : 'No specific stance data — infer from personality'}
`);
  }

  const conflictArcDesc = conflictFingerprint?.hasEnoughData
    ? `Based on real data: avg conflict lasts ${conflictFingerprint.avgConflictDurationMs > 0 ? Math.round(conflictFingerprint.avgConflictDurationMs / 60000) + ' minutes' : 'unknown duration'} and involves ${conflictFingerprint.totalConflictWindows} detected conflict windows.`
    : 'Limited conflict data — create a realistic but not extreme argument.';

  return `You are a conversation simulation engine. Generate a realistic argument between two people on a specific topic. The argument must feel REAL — like reading actual chat messages.

TOPIC OF ARGUMENT: "${topic}"
PARTICIPANTS: ${participants.join(' vs ')}
${conflictArcDesc}

${voiceBlocks.join('\n')}

═══ GENERATION RULES ═══

CRITICAL — CONTINUITY IS EVERYTHING:
This must read as ONE CONTINUOUS CONVERSATION from start to finish. NOT separate chunks.
Imagine reading a real Messenger thread — you'd never see "blocks" or "acts". It flows naturally.
The "phase" field is a METADATA TAG for the UI, NOT a structural separator in the conversation.
Phases should blend into each other organically. There is no visible boundary between them.
A message can have escalation vibes while still being a direct reply to the previous message.

1. CONVERSATION FLOW — Generate 50-60 messages as ONE unbroken chat thread:
   - Start with a normal message that happens to touch the topic — no dramatic "setup"
   - Tension builds GRADUALLY over multiple exchanges — not all at once
   - The conversation drifts naturally: small talk → topic appears → mild disagreement →
     someone gets defensive → emotional hooks pull them deeper → peak →
     attempts to change subject or reconcile → aftermath
   - EVERY message must be a natural reply to the previous message(s)
   - Phase transitions should be INVISIBLE — a reader should not be able to tell where
     "escalation" ends and "peak" begins without looking at the metadata
   - Include moments that feel like real texting: someone changes subject briefly
     then the other drags it back, someone sends "?" after a silence, etc.

2. PHASE TAGGING (for metadata only — NOT for structuring the conversation):
   - "trigger": the first few messages where the topic comes up naturally
   - "escalation": tension is rising, accusations appear, tone shifts
   - "peak": maximum emotional intensity — can be 8-15 messages, not just a few
   - "deescalation": someone tries to lower the temperature
   - "aftermath": final exchanges — cold peace, reconciliation, or unresolved silence
   - Tag each message with the phase that BEST DESCRIBES its emotional energy
   - Phases can overlap: a message can be defensive (deescalation attempt) while
     the other person is still at peak intensity

3. WRITING STYLE — Each person must write EXACTLY like their real messages:
   - Match their slang, abbreviations, spelling patterns, capitalization
   - Match their emoji usage (or lack thereof)
   - If they write "xd" after sentences — do it in conflict too
   - If they write without Polish characters (ą→a, ś→s) — match that
   - If they're vulgar when angry — include appropriate language
   - Match message LENGTH patterns: if someone writes short 2-3 word messages, keep that
   - This is NOT "AI writes dialogue". This is HOW THESE PEOPLE ACTUALLY TEXT.

4. TEMPORAL PATTERNS — Set delayMs realistically:
   - Same person burst (consecutive msgs): 800-2500ms
   - Cross-person response in hot conflict: 2000-5000ms
   - Cross-person response in cold moment: 10000-30000ms
   - Stonewalling/silence moment: 45000-90000ms
   - Burst messages should share the same burstGroup number

5. BURST PATTERNS:
   - Match each person's real burst length from their conflict fingerprint
   - ${participants[0]}: ${conflictFingerprint?.perPerson[participants[0]]?.avgBurstLengthInConflict ?? 2} msgs per burst typically
   - ${participants[1] ?? 'Person B'}: ${conflictFingerprint?.perPerson[participants[1] ?? '']?.avgBurstLengthInConflict ?? 2} msgs per burst typically
   - Include interruptions where one person breaks into the other's burst
   - Include realistic micro-behaviors: "???", "no co", "halo", single emoji reactions

6. RESOLUTION — Must match real patterns:
   - Do NOT force a happy ending
   - Match their de-escalation styles: ${participants.map(n => `${n}: ${conflictFingerprint?.perPerson[n]?.deescalationStyle ?? 'unknown'}`).join(', ')}
   - Realistic endings: one person caves, topic change, cold peace, someone ghosts, or genuine reconciliation
   - The aftermath should feel like a real conversation trailing off, not a neat conclusion

7. GOTTMAN HORSEMEN — Naturally include these conflict patterns:
   - Criticism (attacking character, not behavior)
   - Contempt (sarcasm, eye-rolling, moral superiority)
   - Defensiveness (deflecting blame, making excuses)
   - Stonewalling (withdrawing, not responding)
   Weight these based on the personality profiles.

8. ALL TEXT IN POLISH (pl-PL). Match the natural language mix of the participants.

OUTPUT: Valid JSON only, no markdown:
{
  "messages": [
    {
      "sender": "person name",
      "text": "message text in Polish",
      "delayMs": number,
      "burstGroup": number (increment for new burst),
      "phase": "trigger" | "escalation" | "peak" | "deescalation" | "aftermath",
      "isTypingVisible": true | false (true for first msg in new burst or cross-person response)
    }
  ],
  "summary": {
    "escalator": "who escalated more",
    "firstDeescalator": "who tried to calm down first",
    "escalationMessageCount": number (messages until peak),
    "totalMessages": number,
    "dominantHorseman": "criticism" | "contempt" | "defensiveness" | "stonewalling",
    "horsemanScores": {
      "criticism": 0-100,
      "contempt": 0-100,
      "defensiveness": 0-100,
      "stonewalling": 0-100
    },
    "comparisonWithReal": "Polish text comparing this simulation with their real conflict patterns (2-3 sentences)",
    "patternDescription": "Polish text describing the conflict arc and dynamics (2-3 sentences)",
    "personBreakdown": {
      "person_name": {
        "messagesCount": number,
        "avgLength": number (words),
        "escalationContribution": 0-100,
        "dominantPhase": "trigger" | "escalation" | "peak" | "deescalation" | "aftermath"
      }
    }
  }
}`;
}

// ============================================================
// Public API
// ============================================================

/**
 * Run AI enrichment: deepen conflict fingerprint + extract hot topics.
 */
export async function runArgumentEnrichment(params: EnrichmentParams): Promise<EnrichmentResult> {
  const systemPrompt = buildEnrichmentPrompt(params);
  const userContent = `Analyze the conflict patterns and extract topics for: ${params.participants.join(' and ')}.\n\nQUANTITATIVE CONTEXT:\n${params.quantitativeContext.slice(0, 3000)}`;

  const rawText = await callGeminiWithRetry(systemPrompt, userContent, 3, 4096, 0.3);
  return parseEnrichmentJSON(rawText);
}

/**
 * Generate a full argument script with timing metadata and summary.
 */
export async function runArgumentGeneration(params: GenerationParams): Promise<GenerationResult> {
  const systemPrompt = buildGenerationPrompt(params);
  const userContent = `Generate a realistic argument about "${params.topic}" between ${params.participants.join(' and ')}.\n\nQUANTITATIVE CONTEXT:\n${params.quantitativeContext.slice(0, 2000)}`;

  const rawText = await callGeminiWithRetry(systemPrompt, userContent, 3, 20480, 0.6);
  return parseGenerationJSON(rawText, params.participants);
}

// ============================================================
// JSON parsers
// ============================================================

function cleanJSON(raw: string): string {
  let cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  if (!cleaned.startsWith('{')) {
    const jsonStart = cleaned.indexOf('{');
    if (jsonStart >= 0) cleaned = cleaned.slice(jsonStart);
  }
  if (cleaned.startsWith('{')) {
    const lastClose = cleaned.lastIndexOf('}');
    if (lastClose >= 0) cleaned = cleaned.slice(0, lastClose + 1);
  }
  return cleaned;
}

function parseEnrichmentJSON(raw: string): EnrichmentResult {
  try {
    const parsed = JSON.parse(cleanJSON(raw)) as Record<string, unknown>;

    const topics = Array.isArray(parsed.topics) ? parsed.topics.map((t: Record<string, unknown>) => ({
      topic: String(t.topic ?? ''),
      frequency: typeof t.frequency === 'number' ? t.frequency : 5,
      stanceA: String(t.stanceA ?? ''),
      stanceB: String(t.stanceB ?? ''),
      volatility: (['low', 'medium', 'high'].includes(String(t.volatility)) ? String(t.volatility) : 'medium') as 'low' | 'medium' | 'high',
    })) : [];

    const perPerson: EnrichmentResult['perPerson'] = {};
    if (parsed.perPerson && typeof parsed.perPerson === 'object') {
      for (const [name, data] of Object.entries(parsed.perPerson as Record<string, Record<string, unknown>>)) {
        perPerson[name] = {
          sarcasmPatterns: Array.isArray(data.sarcasmPatterns) ? data.sarcasmPatterns.map(String) : [],
          emotionalTriggers: Array.isArray(data.emotionalTriggers) ? data.emotionalTriggers.map(String) : [],
          deepEscalationStyle: String(data.deepEscalationStyle ?? ''),
          deepDeescalationStyle: String(data.deepDeescalationStyle ?? ''),
        };
      }
    }

    return { topics, perPerson };
  } catch {
    throw new Error('Błąd parsowania wyników wzbogacania profilu konfliktowego');
  }
}

function parseGenerationJSON(raw: string, participants: string[]): GenerationResult {
  try {
    const parsed = JSON.parse(cleanJSON(raw)) as Record<string, unknown>;

    const validPhases = ['trigger', 'escalation', 'peak', 'deescalation', 'aftermath'] as const;
    const messages: ArgumentSimulationMessage[] = Array.isArray(parsed.messages)
      ? (parsed.messages as Array<Record<string, unknown>>)
        .slice(0, 70) // Cap at 70 messages — allow full continuous conversations
        .map(m => ({
          sender: String(m.sender ?? participants[0]),
          text: String(m.text ?? ''),
          delayMs: typeof m.delayMs === 'number' ? Math.max(500, Math.min(120000, m.delayMs)) : 2000,
          burstGroup: typeof m.burstGroup === 'number' ? m.burstGroup : 0,
          phase: validPhases.includes(String(m.phase) as typeof validPhases[number])
            ? (String(m.phase) as typeof validPhases[number])
            : 'escalation',
          isTypingVisible: typeof m.isTypingVisible === 'boolean' ? m.isTypingVisible : true,
        }))
        .filter(m => m.text.trim().length > 0)
      : [];

    if (messages.length === 0) {
      throw new Error('AI nie wygenerowało żadnych wiadomości');
    }

    const summaryRaw = parsed.summary as Record<string, unknown> | undefined;
    const horsemen = ['criticism', 'contempt', 'defensiveness', 'stonewalling'] as const;

    const horsemanScores: Record<string, number> = {};
    if (summaryRaw?.horsemanScores && typeof summaryRaw.horsemanScores === 'object') {
      for (const h of horsemen) {
        const val = (summaryRaw.horsemanScores as Record<string, unknown>)[h];
        horsemanScores[h] = typeof val === 'number' ? Math.max(0, Math.min(100, val)) : 25;
      }
    } else {
      for (const h of horsemen) horsemanScores[h] = 25;
    }

    const dominantHorseman = horsemen.reduce((max, h) =>
      (horsemanScores[h] ?? 0) > (horsemanScores[max] ?? 0) ? h : max, horsemen[0]);

    const personBreakdown: Record<string, { messagesCount: number; avgLength: number; escalationContribution: number; dominantPhase: string }> = {};
    if (summaryRaw?.personBreakdown && typeof summaryRaw.personBreakdown === 'object') {
      for (const [name, data] of Object.entries(summaryRaw.personBreakdown as Record<string, Record<string, unknown>>)) {
        personBreakdown[name] = {
          messagesCount: typeof data.messagesCount === 'number' ? data.messagesCount : 0,
          avgLength: typeof data.avgLength === 'number' ? data.avgLength : 0,
          escalationContribution: typeof data.escalationContribution === 'number'
            ? Math.max(0, Math.min(100, data.escalationContribution)) : 50,
          dominantPhase: String(data.dominantPhase ?? 'escalation'),
        };
      }
    }

    const summary: ArgumentSummary = {
      escalator: String(summaryRaw?.escalator ?? participants[0]),
      firstDeescalator: String(summaryRaw?.firstDeescalator ?? participants[1] ?? participants[0]),
      escalationMessageCount: typeof summaryRaw?.escalationMessageCount === 'number'
        ? summaryRaw.escalationMessageCount : Math.round(messages.length * 0.6),
      totalMessages: messages.length,
      dominantHorseman,
      horsemanScores,
      comparisonWithReal: String(summaryRaw?.comparisonWithReal ?? ''),
      patternDescription: String(summaryRaw?.patternDescription ?? ''),
      personBreakdown,
    };

    return { messages, summary };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('AI nie')) throw err;
    throw new Error('Błąd parsowania wygenerowanej kłótni');
  }
}
