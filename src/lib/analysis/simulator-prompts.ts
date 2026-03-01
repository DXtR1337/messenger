/**
 * Reply Simulator — Gemini AI prompt module.
 * Generates responses in the style of a target person based on their real message patterns.
 * Server-side only.
 */

import 'server-only';
import { callGeminiWithRetry } from './gemini';
import { parseGeminiJSON } from './json-parser';

import type { PersonProfile, Pass1Result, Pass2Result } from './types';

// ============================================================
// Types
// ============================================================

export interface SimulationParams {
  userMessage: string;
  targetPerson: string;
  participants: string[];
  /** Stringified quantitative context */
  quantitativeContext: string;
  /** Top words for the target person */
  topWords: Array<{ word: string; count: number }>;
  /** Top phrases for the target person */
  topPhrases: Array<{ phrase: string; count: number }>;
  /** Average message length in words */
  avgMessageLengthWords: number;
  /** Average message length in chars */
  avgMessageLengthChars: number;
  /** Emoji frequency and top emojis */
  emojiFrequency: number;
  topEmojis: Array<{ emoji: string; count: number }>;
  /** Median response time in ms */
  medianResponseTimeMs: number;
  /** 20-30 real example messages FROM the target person */
  exampleMessages: string[];
  /** Previous exchanges in this simulation session */
  previousExchanges: Array<{ role: 'user' | 'target'; message: string }>;
  /** Personality profile if available from Pass 3 */
  personalityProfile?: PersonProfile;
  /** Tone & relationship dynamics from Pass 1 */
  toneAnalysis?: Pass1Result;
  /** Conflict, emotional labor, flags from Pass 2 */
  dynamicsAnalysis?: Pass2Result;
}

export interface SimulationResponse {
  reply: string;
  confidence: number;
  styleNotes: string;
}

// ============================================================
// Private: System prompt builder
// ============================================================

function buildSimulatorSystemPrompt(params: SimulationParams): string {
  const {
    targetPerson,
    topWords,
    topPhrases,
    avgMessageLengthWords,
    avgMessageLengthChars,
    emojiFrequency,
    topEmojis,
    exampleMessages,
    personalityProfile,
    toneAnalysis,
    dynamicsAnalysis,
  } = params;

  const topWordsStr = topWords
    .slice(0, 50)
    .map((w) => `${w.word} (${w.count}x)`)
    .join(', ');

  const topPhrasesStr = topPhrases
    .slice(0, 20)
    .map((p) => `"${p.phrase}" (${p.count}x)`)
    .join(', ');

  const topEmojisStr = topEmojis
    .slice(0, 10)
    .map((e) => `${e.emoji} (${e.count}x)`)
    .join(', ');

  const examplesBlock = exampleMessages
    .slice(0, 30)
    .map((msg, i) => `[${i + 1}] ${msg}`)
    .join('\n');

  // Build rich psychological context from all available analysis passes
  const psychParts: string[] = [];

  // Pass 1 — Tone & relationship context
  if (toneAnalysis) {
    const personTone = toneAnalysis.tone_per_person?.[targetPerson];
    if (personTone) {
      psychParts.push(`PRIMARY TONE: ${personTone.primary_tone} (secondary: ${personTone.secondary_tones.join(', ')})`);
      psychParts.push(`Formality: ${personTone.formality_level}/10, Warmth: ${personTone.warmth}/10, Confidence: ${personTone.confidence}/10`);
      psychParts.push(`Humor: ${personTone.humor_presence}/10, style: ${personTone.humor_style}`);
    }
    if (toneAnalysis.overall_dynamic) {
      const d = toneAnalysis.overall_dynamic;
      psychParts.push(`Relationship energy: ${d.energy}, balance: ${d.balance}, trajectory: ${d.trajectory}`);
    }
    if (toneAnalysis.relationship_type) {
      psychParts.push(`Relationship type: ${toneAnalysis.relationship_type.category} (${toneAnalysis.relationship_type.sub_type})`);
    }
  }

  // Pass 2 — Dynamics, conflict, emotional patterns
  if (dynamicsAnalysis) {
    if (dynamicsAnalysis.conflict_patterns) {
      const cp = dynamicsAnalysis.conflict_patterns;
      const personStyle = cp.resolution_style?.[targetPerson];
      if (personStyle) {
        psychParts.push(`Conflict resolution style: ${personStyle}`);
      }
      if (cp.unresolved_tensions.length > 0) {
        psychParts.push(`Unresolved tensions: ${cp.unresolved_tensions.slice(0, 3).join('; ')}`);
      }
    }
    if (dynamicsAnalysis.emotional_labor) {
      const el = dynamicsAnalysis.emotional_labor;
      psychParts.push(`Emotional labor: primary caregiver is ${el.primary_caregiver}, balance: ${el.balance_score}/10`);
    }
    if (dynamicsAnalysis.power_dynamics) {
      const pd = dynamicsAnalysis.power_dynamics;
      psychParts.push(`Power balance: ${pd.balance_score} (who adapts more: ${pd.who_adapts_more}, type: ${pd.adaptation_type})`);
    }
    if (dynamicsAnalysis.intimacy_markers?.shared_language) {
      const sl = dynamicsAnalysis.intimacy_markers.shared_language;
      if (sl.unique_phrases.length > 0) {
        psychParts.push(`Shared language/inside jokes: ${sl.unique_phrases.slice(0, 5).join(', ')}`);
      }
      if (sl.pet_names) psychParts.push('Uses pet names/nicknames');
    }
  }

  // Pass 3 — Personality profile
  if (personalityProfile) {
    if (personalityProfile.mbti) {
      psychParts.push(`MBTI: ${personalityProfile.mbti.type} (confidence: ${personalityProfile.mbti.confidence}%)`);
    }
    if (personalityProfile.love_language) {
      psychParts.push(`Love language: primary=${personalityProfile.love_language.primary}, secondary=${personalityProfile.love_language.secondary}`);
    }
    if (personalityProfile.communication_profile) {
      const cp = personalityProfile.communication_profile;
      psychParts.push(`Communication style: ${cp.style}, assertiveness: ${cp.assertiveness}/10`);
      psychParts.push(`Emotional expressiveness: ${cp.emotional_expressiveness}/10`);
      if (cp.verbal_tics.length > 0) {
        psychParts.push(`Verbal tics: ${cp.verbal_tics.join(', ')}`);
      }
      psychParts.push(`Emoji personality: ${cp.emoji_personality}`);
      psychParts.push(`Typical message structure: ${cp.typical_message_structure}`);
    }
    if (personalityProfile.big_five_approximation) {
      const bf = personalityProfile.big_five_approximation;
      psychParts.push(`Big Five: O=${bf.openness.range.join('-')}, C=${bf.conscientiousness.range.join('-')}, E=${bf.extraversion.range.join('-')}, A=${bf.agreeableness.range.join('-')}, N=${bf.neuroticism.range.join('-')}`);
    }
    if (personalityProfile.attachment_indicators) {
      psychParts.push(`Attachment style: ${personalityProfile.attachment_indicators.primary_style}`);
    }
    if (personalityProfile.communication_needs) {
      const cn = personalityProfile.communication_needs;
      psychParts.push(`Communication needs: primary=${cn.primary}, secondary=${cn.secondary}`);
      if (cn.unmet_needs_signals.length > 0) {
        psychParts.push(`Unmet needs signals: ${cn.unmet_needs_signals.slice(0, 3).join('; ')}`);
      }
    }
    if (personalityProfile.emotional_patterns) {
      const ep = personalityProfile.emotional_patterns;
      psychParts.push(`Dominant emotions: ${ep.dominant_emotions.join(', ')}`);
      if (ep.coping_mechanisms_visible.length > 0) {
        psychParts.push(`Coping mechanisms: ${ep.coping_mechanisms_visible.join(', ')}`);
      }
    }
    if (personalityProfile.conflict_resolution) {
      psychParts.push(`Conflict style: ${personalityProfile.conflict_resolution.primary_style}, recovery: ${personalityProfile.conflict_resolution.recovery_speed}`);
    }
  }

  const personalityBlock = psychParts.length > 0
    ? `\n\nPSYCHOLOGICAL PROFILE OF ${targetPerson} (use this to understand HOW they think and react):\n${psychParts.join('\n')}`
    : '';

  return `You are simulating how a specific person texts. Your goal is to BECOME this person — think like them, respond like them, with their personality, humor, and communication patterns. You are NOT a parrot repeating their top words. You are channeling their MIND.

TARGET PERSON: ${targetPerson}

REAL EXAMPLE MESSAGES FROM ${targetPerson} (study these carefully — this is how they actually write):
${examplesBlock}

STYLE REFERENCE (use as guidelines, NOT as a word bank to copy from):
- Common phrases they use naturally: ${topPhrasesStr}
- Their vocabulary tendencies: ${topWordsStr}
- Average message length: ${Math.round(avgMessageLengthWords)} words / ${Math.round(avgMessageLengthChars)} characters
- They write ${avgMessageLengthWords < 5 ? 'very short, brief' : avgMessageLengthWords < 12 ? 'medium-length' : 'longer, detailed'} messages
- Emoji usage: ${emojiFrequency > 0.5 ? 'heavy emoji user' : emojiFrequency > 0.15 ? 'moderate emoji user' : 'rarely uses emoji'}
- Top emojis: ${topEmojisStr || 'none'}
${personalityBlock}

CRITICAL RULES:
1. STUDY the example messages above. Absorb the STYLE — how they construct sentences, their humor, their attitude, their tone. Do NOT just repeat their most common words.
2. Generate a NATURAL response to the conversation. Think: "What would this person actually say in this situation?" — not "What are their most frequent words?"
3. Match their PATTERNS: punctuation habits (periods? no periods? "xd"? "XD"? "..."?), capitalization, abbreviations, sentence structure.
4. Match their language (Polish, English, mixed) — whatever they naturally use in the examples.
5. Keep reply length SIMILAR to their average, but vary naturally. Not every message is the same length.
6. Use their phrases and expressions only when they FIT the context naturally. Do NOT force them in.
7. Be authentic — if they're sarcastic, be sarcastic. If they're warm, be warm. If they deflect with humor, deflect with humor. Channel their PERSONALITY, not their word frequency list.
8. NEVER repeat the same response structure twice in a session. Vary your replies.
9. The confidence score (0-100) reflects how certain you are the real person would say something similar.
10. styleNotes: briefly describe what personality/style elements you channeled (NOT "used their top words").

OUTPUT FORMAT: Valid JSON only, no markdown:
{
  "reply": "the simulated message",
  "confidence": 0-100,
  "styleNotes": "brief description of mimicked style elements"
}`;
}

// ============================================================
// Private: Build user content for Gemini
// ============================================================

function buildUserContent(params: SimulationParams): string {
  const { userMessage, targetPerson, participants, previousExchanges } = params;

  const otherPerson = participants.find((p) => p !== targetPerson) ?? 'Użytkownik';

  let conversationHistory = '';
  if (previousExchanges.length > 0) {
    conversationHistory = '\nPREVIOUS EXCHANGES IN THIS SESSION:\n';
    for (const exchange of previousExchanges) {
      const sender = exchange.role === 'user' ? otherPerson : targetPerson;
      conversationHistory += `${sender}: ${exchange.message}\n`;
    }
    conversationHistory += '\n';
  }

  return `${conversationHistory}${otherPerson} just sent: "${userMessage}"

Reply as ${targetPerson} would. Remember: match their exact writing style, not a generic response.`;
}

// ============================================================
// Public: Run Reply Simulation
// ============================================================

/**
 * Call Gemini API to simulate a reply in the target person's style.
 * Retries up to 3 times on failure.
 */
export async function runReplySimulation(params: SimulationParams): Promise<SimulationResponse> {
  const systemPrompt = buildSimulatorSystemPrompt(params);
  const userContent = buildUserContent(params);

  const rawText = await callGeminiWithRetry(systemPrompt, userContent, 3, 1024, 0.5);
  const parsed = parseGeminiJSON<Record<string, unknown>>(rawText);

  const reply = typeof parsed.reply === 'string' ? parsed.reply : '';
  const confidence = typeof parsed.confidence === 'number'
    ? Math.max(0, Math.min(100, parsed.confidence))
    : 50;
  const styleNotes = typeof parsed.styleNotes === 'string' ? parsed.styleNotes : '';

  if (!reply) {
    throw new Error('Pusta odpowiedz z AI');
  }

  return { reply, confidence, styleNotes };
}
