/**
 * Server-only Gemini API module for PodTeksT.
 * Uses Google AI Studio SDK (@google/generative-ai) with a simple API key.
 * Must only be imported in server contexts (API routes).
 */

import 'server-only';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

import type {
    Pass1Result,
    Pass2Result,
    PersonProfile,
    Pass4Result,
    QualitativeAnalysis,
    RoastResult,
    StandUpRoastResult,
    MegaRoastResult,
    CwelTygodniaResult,
} from './types';
import {
    PASS_1_SYSTEM,
    PASS_2_SYSTEM,
    PASS_3_SYSTEM,
    PASS_4_SYSTEM,
    buildCPSBatchPrompt,
    ROAST_SYSTEM,
    ENHANCED_ROAST_SYSTEM,
    STANDUP_ROAST_SYSTEM,
    MEGA_ROAST_SYSTEM,
    CWEL_TYGODNIA_SYSTEM,
    formatMessagesForAnalysis,
    SUBTEXT_SYSTEM,
    formatWindowsForSubtext,
} from './prompts';
import type { CPSResult, CPSAnswer } from './communication-patterns';
import { calculatePatternResults, CPS_DISCLAIMER } from './communication-patterns';
import type { SubtextResult, SubtextItem, SimplifiedMsg, ExchangeWindow } from './subtext';
import { extractExchangeWindows, SUBTEXT_DISCLAIMER } from './subtext';

import type { AnalysisSamples } from './qualitative';

// ============================================================
// Private: Gemini API helpers
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
                    temperature: 0.3,
                    responseMimeType: 'application/json',
                },
                safetySettings: SAFETY_SETTINGS,
            });

            const result = await model.generateContent(userContent);
            const response = result.response;

            // Check for safety blocks
            if (response.promptFeedback?.blockReason) {
                console.error('[Gemini Safety] Prompt blocked:', response.promptFeedback?.blockReason);
                throw new Error(`Prompt zablokowany przez filtr bezpieczeństwa: ${response.promptFeedback.blockReason}`);
            }

            const candidate = response.candidates?.[0];
            if (candidate?.finishReason === 'SAFETY') {
                console.error('[Gemini Safety] Response filtered:', candidate.finishReason);
                throw new Error('Odpowiedź zablokowana przez filtr bezpieczeństwa');
            }

            const text = response.text();
            if (!text) throw new Error('No text in Gemini response');
            return text;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const msg = lastError.message.toLowerCase();
            // Non-retryable errors — fail immediately
            if (
                msg.includes('api key') ||
                msg.includes('permission') ||
                msg.includes('billing')
            ) {
                throw new Error('Błąd konfiguracji API — sprawdź klucz API');
            }
            if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            }
        }
    }
    console.error('[Gemini Error] All retries exhausted:', lastError?.message);
    throw new Error(`Błąd analizy AI: ${lastError?.message ?? 'nieznany błąd'}`);
}

function sanitizeJsonString(raw: string): string {
    // Fix unescaped control characters inside JSON string values.
    // Walk through the string tracking whether we're inside a quoted value;
    // replace raw control chars (tabs, newlines) with their escape sequences.
    const out: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];

        if (escaped) {
            out.push(ch);
            escaped = false;
            continue;
        }

        if (ch === '\\' && inString) {
            out.push(ch);
            escaped = true;
            continue;
        }

        if (ch === '"') {
            inString = !inString;
            out.push(ch);
            continue;
        }

        if (inString) {
            // Replace unescaped control characters
            const code = ch.charCodeAt(0);
            if (code < 0x20) {
                if (ch === '\n') { out.push('\\n'); continue; }
                if (ch === '\r') { out.push('\\r'); continue; }
                if (ch === '\t') { out.push('\\t'); continue; }
                // Other control chars — unicode escape
                out.push('\\u' + code.toString(16).padStart(4, '0'));
                continue;
            }
        }

        out.push(ch);
    }

    return out.join('');
}

function parseGeminiJSON<T>(raw: string): T {
    // Strip markdown code fences if present
    let cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    // Sometimes Gemini wraps JSON in extra text — extract the first { ... } or [ ... ] block
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        const jsonStart = cleaned.search(/[{[]/);
        if (jsonStart >= 0) cleaned = cleaned.slice(jsonStart);
    }
    // Find the matching closing brace/bracket
    if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
        const closingChar = cleaned.startsWith('{') ? '}' : ']';
        const lastClose = cleaned.lastIndexOf(closingChar);
        if (lastClose >= 0) cleaned = cleaned.slice(0, lastClose + 1);
    }

    // Attempt 1: direct parse
    try {
        return JSON.parse(cleaned) as T;
    } catch {
        // Attempt 2: fix unescaped control characters and trailing commas
        try {
            const sanitized = sanitizeJsonString(cleaned)
                .replace(/,\s*([}\]])/g, '$1'); // strip trailing commas
            return JSON.parse(sanitized) as T;
        } catch {
            console.error('[Gemini Parse] Failed to parse response, length:', raw?.length, 'first 500 chars:', raw?.slice(0, 500));
            throw new Error('Błąd parsowania odpowiedzi AI — odpowiedź nie jest poprawnym JSON');
        }
    }
}

// ============================================================
// Private: Synthesis builder
// ============================================================

function buildSynthesisInputFromPasses(
    pass1: Pass1Result,
    pass2: Pass2Result,
    pass3: Record<string, PersonProfile>,
    quantitativeContext: string,
): string {
    const sections: string[] = [];

    sections.push('=== PASS 1: OVERVIEW ===');
    sections.push(JSON.stringify(pass1, null, 2));

    sections.push('');
    sections.push('=== PASS 2: DYNAMICS ===');
    sections.push(JSON.stringify(pass2, null, 2));

    sections.push('');
    sections.push('=== PASS 3: INDIVIDUAL PROFILES ===');
    for (const [name, profile] of Object.entries(pass3)) {
        sections.push(`--- ${name} ---`);
        sections.push(JSON.stringify(profile, null, 2));
    }

    sections.push('');
    sections.push('=== QUANTITATIVE SUMMARY ===');
    sections.push(quantitativeContext);

    return sections.join('\n');
}

// ============================================================
// Private: Relationship context prefix builder
// ============================================================

function buildRelationshipPrefix(relationshipContext?: string): string {
    if (!relationshipContext) return '';
    const labels: Record<string, string> = {
        romantic: 'romantic relationship (couple/partners)',
        friendship: 'friendship',
        colleague: 'casual colleagues/acquaintances',
        professional: 'professional/work relationship',
        family: 'family relationship',
        other: 'unspecified relationship type',
    };
    const baselines: Record<string, string> = {
        friendship: `CALIBRATION FOR FRIENDSHIP:
- Double texting is normal and expected, NOT a sign of clinginess or anxious attachment.
- Infrequent or slow replies are NOT "avoidant" — friends have separate lives, jobs, and other relationships.
- "Power dynamics" in this context refer to social influence and group standing, NOT romantic control.
- Long silences (days/weeks) are normal and do not indicate relationship decline.
- Banter, teasing, and even mild insults are often signs of closeness, not hostility.
- Uneven message volume is typical — one friend may simply be more talkative by nature.`,

        professional: `CALIBRATION FOR PROFESSIONAL RELATIONSHIP:
- Formal, clipped tone is expected and appropriate, NOT "cold" or "distant."
- Short replies are efficient communication, NOT dismissive or avoidant.
- No intimacy analysis is appropriate — do not assess vulnerability, attachment styles, or love languages.
- Lack of emoji or emotional expression is standard, not a red flag.
- Delayed responses reflect workload and priorities, not disinterest.
- Boundary-setting (e.g., not responding after hours) is healthy professionalism, not avoidance.`,

        family: `CALIBRATION FOR FAMILY RELATIONSHIP:
- Obligation-driven communication (birthdays, holidays, check-ins) is normal and does not indicate lack of genuine care.
- Generational communication style gaps are expected — different formality levels, emoji usage, and message length are typical.
- Authority dynamics (parent-child) differ fundamentally from romantic power imbalance — do not conflate them.
- Guilt or duty in messaging patterns is culturally normal in many families, not inherently manipulative.
- Infrequent deep conversations do not indicate a shallow relationship — family bonds operate differently.
- Unsolicited advice from older family members is a cultural norm, not a boundary violation by default.`,

        romantic: `CALIBRATION FOR ROMANTIC RELATIONSHIP:
- Analyze attachment styles, intimacy patterns, and love languages — these are highly relevant.
- Double texting patterns CAN indicate anxious attachment in this context — assess carefully.
- Response time changes over months are significant and may signal shifting interest or comfort levels.
- Emotional reciprocity and vulnerability balance are critical metrics for relationship health.
- Look for love-bombing cycles, intermittent reinforcement, and withdrawal patterns.
- Sexual or flirtatious tone shifts are expected data points, not anomalies to ignore.`,

        colleague: `CALIBRATION FOR COLLEAGUE/ACQUAINTANCE RELATIONSHIP:
- Casual, brief exchanges are the norm — do not over-interpret short messages as dismissive.
- Social niceties and pleasantries do not indicate deep emotional connection.
- Work-life boundary patterns are relevant — note if conversation stays strictly professional or bleeds into personal.
- Humor is often surface-level bonding, not a sign of intimacy.
- Inconsistent response patterns reflect busy schedules, not relationship instability.
- Topic range is naturally limited — lack of deep personal topics is expected, not avoidant.`,
    };

    const safeContext = labels[relationshipContext] ? relationshipContext : 'other';
    const label = labels[safeContext] ?? labels['other'];
    const baseline = baselines[safeContext] ?? '';
    const baselineBlock = baseline ? `\n\n${baseline}\n` : '';
    return `\n\nIMPORTANT CONTEXT — USER-DECLARED RELATIONSHIP TYPE: ${label}\nThe user has explicitly stated this is a ${label}. Calibrate ALL analysis, flags, and observations to this specific relationship context. Do NOT assume romantic dynamics unless the type is "romantic". Adjust your assessment of what constitutes "red flags" vs normal behavior for this relationship type.${baselineBlock}\n`;
}

// ============================================================
// Public: Run analysis passes (server-side only)
// ============================================================

/**
 * Run all 4 analysis passes sequentially using the Gemini API.
 * Must be called server-side (API route) since it requires GEMINI_API_KEY.
 */
export async function runAnalysisPasses(
    samples: AnalysisSamples,
    participants: string[],
    onProgress: (pass: number, status: string) => void,
    relationshipContext?: string,
): Promise<QualitativeAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            status: 'error',
            error: 'GEMINI_API_KEY is not set in .env.local — get one from https://aistudio.google.com/apikey',
        };
    }

    const result: QualitativeAnalysis = {
        status: 'running',
        currentPass: 1,
    };

    try {
        // Pass 1: Overview — tone, style, relationship type
        onProgress(1, 'Analyzing overall tone and relationship type...');
        const pass1Input = buildRelationshipPrefix(relationshipContext) + formatMessagesForAnalysis(samples.overview);
        const pass1Raw = await callGeminiWithRetry(PASS_1_SYSTEM, pass1Input);
        const pass1 = parseGeminiJSON<Pass1Result>(pass1Raw);
        result.pass1 = pass1;
        result.currentPass = 2;

        // Pass 2: Dynamics — power, conflict, intimacy
        onProgress(2, 'Analyzing relationship dynamics...');
        const pass2Input = buildRelationshipPrefix(relationshipContext) + formatMessagesForAnalysis(
            samples.dynamics,
            samples.quantitativeContext,
        );
        const pass2Raw = await callGeminiWithRetry(PASS_2_SYSTEM, pass2Input);
        const pass2 = parseGeminiJSON<Pass2Result>(pass2Raw);
        result.pass2 = pass2;
        result.currentPass = 3;

        // Pass 3: Individual profiles — only for participants with sampled messages
        // For large groups, perPerson is already capped to top 8 by sampleMessages()
        onProgress(3, 'Building individual personality profiles...');
        const profilingNames = participants.filter(name => samples.perPerson[name]?.length > 0);

        // Batch pass3 calls in groups of 4 to avoid Gemini rate limits
        const BATCH_SIZE = 4;
        const pass3: Record<string, PersonProfile> = {};
        for (let i = 0; i < profilingNames.length; i += BATCH_SIZE) {
            const batch = profilingNames.slice(i, i + BATCH_SIZE);
            const settled = await Promise.allSettled(
                batch.map(async (name) => {
                    const personMessages = samples.perPerson[name];
                    const pass3Input = buildRelationshipPrefix(relationshipContext) + formatMessagesForAnalysis(personMessages);
                    const pass3Raw = await callGeminiWithRetry(
                        PASS_3_SYSTEM,
                        `Analyze messages from: ${name}\n\n${pass3Input}`,
                    );
                    return [name, parseGeminiJSON<PersonProfile>(pass3Raw)] as const;
                })
            );
            for (const entry of settled) {
                if (entry.status === 'fulfilled') {
                    const [name, profile] = entry.value;
                    if (profile) pass3[name] = profile;
                }
                // Rejected entries are silently skipped — partial profiles OK
            }
        }
        result.pass3 = pass3;
        result.currentPass = 4;

        // Pass 4: Synthesis — final report
        onProgress(4, 'Synthesizing final report...');
        const synthesisInput = buildRelationshipPrefix(relationshipContext) + buildSynthesisInputFromPasses(pass1, pass2, pass3, samples.quantitativeContext);
        const pass4Raw = await callGeminiWithRetry(PASS_4_SYSTEM, synthesisInput);
        const pass4 = parseGeminiJSON<Pass4Result>(pass4Raw);
        result.pass4 = pass4;

        result.status = 'complete';
        result.completedAt = Date.now();
    } catch {
        const hasPartialResults = result.pass1 || result.pass2 || result.pass3;
        result.status = hasPartialResults ? 'partial' : 'error';
        result.error = 'Błąd analizy AI';
    }

    return result;
}

// ============================================================
// Public: Roast analysis pass (server-side only)
// ============================================================

/**
 * Run a single roast analysis pass using quantitative data and message samples.
 */
export async function runRoastPass(
    samples: AnalysisSamples,
    participants: string[],
    quantitativeContext: string,
): Promise<RoastResult> {
    const input = `PARTICIPANTS: ${participants.join(', ')}

QUANTITATIVE DATA:
${quantitativeContext}

MESSAGE SAMPLES:
${formatMessagesForAnalysis(samples.overview)}`;

    const raw = await callGeminiWithRetry(ROAST_SYSTEM, input);
    return parseGeminiJSON<RoastResult>(raw);
}

// ============================================================
// Public: Stand-Up Roast pass
// ============================================================

export async function runStandUpRoast(
    samples: AnalysisSamples,
    participants: string[],
    quantitativeContext: string,
): Promise<StandUpRoastResult> {
    const input = `PARTICIPANTS: ${participants.join(', ')}

QUANTITATIVE DATA:
${quantitativeContext}

MESSAGE SAMPLES:
${formatMessagesForAnalysis(samples.overview)}`;

    const raw = await callGeminiWithRetry(STANDUP_ROAST_SYSTEM, input, 3, 8192);
    return parseGeminiJSON<StandUpRoastResult>(raw);
}

// ============================================================
// Public: Enhanced Roast pass (with full psychological context)
// ============================================================

export async function runEnhancedRoastPass(
    samples: AnalysisSamples,
    participants: string[],
    quantitativeContext: string,
    qualitative: {
        pass1: Pass1Result;
        pass2: Pass2Result;
        pass3: Record<string, PersonProfile>;
        pass4: Pass4Result;
    },
): Promise<RoastResult> {
    const psychContext = buildSynthesisInputFromPasses(
        qualitative.pass1, qualitative.pass2, qualitative.pass3, quantitativeContext,
    );

    const input = `PARTICIPANTS: ${participants.join(', ')}

=== PSYCHOLOGICAL ANALYSIS RESULTS ===
${psychContext}

=== HEALTH SCORE ===
${JSON.stringify(qualitative.pass4.health_score)}

=== KEY INSIGHTS ===
${JSON.stringify(qualitative.pass4.insights)}

=== MESSAGE SAMPLES ===
${formatMessagesForAnalysis(samples.overview)}`;

    const raw = await callGeminiWithRetry(ENHANCED_ROAST_SYSTEM, input, 3, 8192);
    return parseGeminiJSON<RoastResult>(raw);
}

// ============================================================
// Public: Mega Roast — single-target roast with full group context
// ============================================================

export async function runMegaRoast(
    samples: AnalysisSamples,
    targetPerson: string,
    allParticipants: string[],
    quantitativeContext: string,
): Promise<MegaRoastResult> {
    const targetMessages = samples.perPerson[targetPerson] ?? [];

    const input = `TARGET: ${targetPerson}
ALL PARTICIPANTS: ${allParticipants.join(', ')}

QUANTITATIVE DATA:
${quantitativeContext}

=== MESSAGES FROM TARGET (${targetPerson}) ===
${formatMessagesForAnalysis(targetMessages)}

=== FULL GROUP MESSAGES (context — what others say about/to target) ===
${formatMessagesForAnalysis(samples.overview)}`;

    const raw = await callGeminiWithRetry(MEGA_ROAST_SYSTEM, input, 3, 8192);
    return parseGeminiJSON<MegaRoastResult>(raw);
}

// ============================================================
// Public: Cwel Tygodnia — AI-first group chat award ceremony
// ============================================================

export async function runCwelTygodnia(
    samples: AnalysisSamples,
    participants: string[],
    quantitativeContext: string,
): Promise<CwelTygodniaResult> {
    const perPersonSections = participants.map(name => {
        const msgs = samples.perPerson[name] ?? [];
        if (msgs.length === 0) return '';
        return `\n=== WIADOMOŚCI: ${name} (${msgs.length} próbek) ===\n${formatMessagesForAnalysis(msgs)}`;
    }).filter(Boolean).join('\n');

    const input = `PARTICIPANTS: ${participants.join(', ')}

=== WIADOMOŚCI GRUPOWE (czytaj uważnie — z tego oceniasz) ===
${formatMessagesForAnalysis(samples.overview)}
${perPersonSections}

=== DANE ILOŚCIOWE (kontekst wspierający) ===
${quantitativeContext}`;

    const raw = await callGeminiWithRetry(CWEL_TYGODNIA_SYSTEM, input, 3, 8192);
    return parseGeminiJSON<CwelTygodniaResult>(raw);
}

// ============================================================
// Public: Image generation (server-side only)
// ============================================================

/**
 * Generate a cartoon-style visualization of a conversation excerpt
 * using Gemini's native image generation capabilities.
 */
export async function generateAnalysisImage(
    analysisContext: {
        participants: string[];
        conversationExcerpt: Array<{ sender: string; content: string }>;
        executiveSummary: string;
        healthScore: number;
    },
): Promise<{ imageBase64: string; mimeType: string } | { error: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { error: 'GEMINI_API_KEY is not set in .env.local' };
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
        model: 'gemini-3-pro-image-preview',
        generationConfig: {
            // @ts-expect-error - responseModalities is valid for image generation models
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });

    const { participants, conversationExcerpt, executiveSummary, healthScore } = analysisContext;

    // Format conversation for the prompt
    const dialogueLines = conversationExcerpt
        .map(m => `${m.sender}: "${m.content}"`)
        .join('\n');

    const mood = healthScore >= 80
        ? 'warm, happy, connected'
        : healthScore >= 60
            ? 'casual, friendly, comfortable'
            : healthScore >= 40
                ? 'tense, distant, awkward'
                : 'cold, conflicted, disconnected';

    const prompt = `Create a colorful cartoon/comic strip illustration depicting this conversation between ${participants.join(' and ')}. The image should show 3-4 panels arranged like a comic book page, each panel showing a scene from the dialogue below.

CONVERSATION:
${dialogueLines}

RELATIONSHIP CONTEXT: ${executiveSummary}

STYLE INSTRUCTIONS:
- Comic book / cartoon style — vibrant colors, expressive characters with exaggerated facial expressions
- Each panel shows the speakers as stylized cartoon characters (NOT realistic, more like modern webtoon/manhwa style)
- Character A (${participants[0]}) has blue accent colors (#3b82f6)
- Character B (${participants[1] ?? 'Person B'}) has purple accent colors (#a855f7)
- Use speech bubbles for dialogue — write SHORT, readable snippets of the actual conversation in the bubbles (keep each bubble to 5-10 words max, paraphrase if needed)
- The text in speech bubbles should be clearly legible, use a clean sans-serif font, white or light text on the bubble background
- The overall mood should feel: ${mood}
- Background should be dark/moody (#1a1a2e or deep navy) with the characters and speech bubbles being the bright focal points
- The panels should flow naturally from left to right, top to bottom
- Add subtle emotional context through body language, environmental details, and color temperature
- Make it feel premium and artistic — like a high-quality graphic novel page
- Aspect ratio: 16:9, landscape orientation`;

    try {
        const result = await model.generateContent(prompt);
        const parts = result.response.candidates?.[0]?.content?.parts;
        if (!parts) {
            return { error: 'No response from image generation model' };
        }

        // Find the image part in the response
        for (const part of parts) {
            if (part.inlineData?.data && part.inlineData?.mimeType) {
                return {
                    imageBase64: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                };
            }
        }

        return { error: 'No image data in Gemini response' };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Błąd generowania obrazu',
        };
    }
}

// ============================================================
// Public: Communication Pattern Screening (server-side only)
// ============================================================

interface CPSRawAnswer {
    answer?: boolean | null;
    confidence?: number;
    evidence?: string[];
}

interface CPSRawResponse {
    answers?: Record<string, CPSRawAnswer>;
    overallConfidence?: number;
}

// CPS question batches — split 63 questions into 3 groups to avoid response truncation
const CPS_BATCHES: number[][] = [
    // Batch 1: Q1-Q21 (Intimacy Avoidance, Over-Dependence, Control & Perfectionism)
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    // Batch 2: Q20-Q42 (Suspicion & Distrust, Self-Focused, Emotional Intensity)
    [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
    // Batch 3: Q40-Q63 (Dramatization, Manipulation, Emotional Distance, Passive Aggression)
    [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63],
];

function parseCPSBatchAnswers(parsed: CPSRawResponse): Record<number, CPSAnswer> {
    const answers: Record<number, CPSAnswer> = {};
    if (parsed.answers && typeof parsed.answers === 'object') {
        for (const [key, value] of Object.entries(parsed.answers)) {
            const id = parseInt(key, 10);
            if (!isNaN(id) && value && typeof value === 'object') {
                answers[id] = {
                    answer: typeof value.answer === 'boolean' ? value.answer : null,
                    confidence: Math.max(0, Math.min(100, typeof value.confidence === 'number' ? value.confidence : 0)),
                    evidence: Array.isArray(value.evidence) ? value.evidence.slice(0, 3) : [],
                };
            }
        }
    }
    return answers;
}

/**
 * Run Communication Pattern Screening analysis in batches.
 * Splits 63 questions into 3 smaller Gemini calls to avoid response truncation.
 * Must be called server-side (API route) since it requires GEMINI_API_KEY.
 */
export async function runCPSAnalysis(
    samples: AnalysisSamples,
    participantName: string,
    onProgress?: (status: string) => void,
): Promise<CPSResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in .env.local');
    }

    onProgress?.('Przygotowanie analizy wzorców...');

    // Get messages only from the target participant
    const personMessages = samples.perPerson[participantName] ?? [];
    if (personMessages.length === 0) {
        throw new Error(`No messages found for participant: ${participantName}`);
    }

    const formattedMessages = formatMessagesForAnalysis(personMessages);
    const allAnswers: Record<number, CPSAnswer> = {};

    // Process each batch sequentially
    for (let i = 0; i < CPS_BATCHES.length; i++) {
        const batchIds = CPS_BATCHES[i];
        const batchNum = i + 1;
        onProgress?.(`Analiza wzorców ${batchNum}/${CPS_BATCHES.length}...`);

        const systemPrompt = buildCPSBatchPrompt(batchIds);
        const input = `ANALYZE MESSAGES FROM: ${participantName}

Answer questions ${batchIds[0]} through ${batchIds[batchIds.length - 1]} based on the message patterns below.

${formattedMessages}`;

        const raw = await callGeminiWithRetry(systemPrompt, input, 3, 16384);
        const parsed = parseGeminiJSON<CPSRawResponse>(raw);
        const batchAnswers = parseCPSBatchAnswers(parsed);

        for (const [id, answer] of Object.entries(batchAnswers)) {
            allAnswers[Number(id)] = answer;
        }
    }

    onProgress?.('Przetwarzanie wyników...');

    if (Object.keys(allAnswers).length === 0) {
        throw new Error('Analiza zwróciła puste wyniki — spróbuj ponownie');
    }

    // Calculate pattern results
    const patternResults = calculatePatternResults(allAnswers);

    // Calculate overall confidence
    const answerValues = Object.values(allAnswers);
    const overallConfidence = answerValues.length > 0
        ? Math.round(answerValues.reduce((sum, a) => sum + a.confidence, 0) / answerValues.length)
        : 0;

    onProgress?.('Analiza zakończona');

    return {
        answers: allAnswers,
        patterns: patternResults,
        overallConfidence,
        disclaimer: CPS_DISCLAIMER,
        analyzedAt: Date.now(),
        participantName,
    };
}

/**
 * Generate a satirical roast comic strip using Gemini's native image generation.
 */
export async function generateRoastImage(
    roastContext: {
        participants: string[];
        conversationExcerpt: Array<{ sender: string; content: string }>;
        roastVerdict: string;
        roastSnippets: string[];
        superlativeTitles: string[];
    },
): Promise<{ imageBase64: string; mimeType: string } | { error: string }> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { error: 'GEMINI_API_KEY is not set in .env.local' };
    }

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
        model: 'gemini-3-pro-image-preview',
        generationConfig: {
            // @ts-expect-error - responseModalities is valid for image generation models
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });

    const { participants, conversationExcerpt, roastVerdict, roastSnippets, superlativeTitles } = roastContext;

    const dialogueLines = conversationExcerpt
        .map(m => `${m.sender}: "${m.content}"`)
        .join('\n');

    const snippetsFormatted = roastSnippets.map(s => `- ${s}`).join('\n');
    const awardsFormatted = superlativeTitles.map(t => `- ${t}`).join('\n');

    const prompt = `Create a FUNNY, SATIRICAL cartoon/caricature comic strip that ROASTS the conversation between ${participants.join(' and ')}.

ROAST CONTEXT:
- Verdict: "${roastVerdict}"
- Key roasts:
${snippetsFormatted}
- Awards:
${awardsFormatted}

CONVERSATION EXCERPT:
${dialogueLines}

STYLE INSTRUCTIONS:
- SATIRICAL editorial cartoon / caricature style — exaggerated features, ridiculous expressions, visual gags
- 3-4 comic panels arranged left-to-right
- Character A (${participants[0]}) has blue accent colors (#3b82f6)
- Character B (${participants[1] ?? 'Person B'}) has purple accent colors (#a855f7)
- Use speech bubbles with SHORT roast quotes or paraphrased dialogue
- EXAGGERATE everything — if someone double-texts, show them frantically typing on multiple phones
- If someone ghosts, show them literally turning transparent
- Dark/moody background (#1a1a2e) with bright characters
- Make it FUNNY and slightly mean but not cruel
- Aspect ratio: 16:9, landscape orientation
- Premium quality, like a graphic novel page`;

    try {
        const result = await model.generateContent(prompt);
        const parts = result.response.candidates?.[0]?.content?.parts;
        if (!parts) {
            return { error: 'No response from image generation model' };
        }

        for (const part of parts) {
            if (part.inlineData?.data && part.inlineData?.mimeType) {
                return {
                    imageBase64: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                };
            }
        }

        return { error: 'No image data in Gemini response' };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Błąd generowania obrazu',
        };
    }
}

// ============================================================
// SUBTEXT DECODER
// ============================================================

interface SubtextBatchRaw {
    items?: Array<{
        originalMessage?: string;
        sender?: string;
        timestamp?: number;
        subtext?: string;
        emotion?: string;
        confidence?: number;
        category?: string;
        isHighlight?: boolean;
        exchangeContext?: string;
        windowId?: number;
        surroundingMessages?: Array<{
            sender?: string;
            content?: string;
            timestamp?: number;
        }>;
    }>;
}

const VALID_CATEGORIES = new Set([
    'deflection', 'hidden_anger', 'seeking_validation', 'power_move',
    'genuine', 'testing', 'guilt_trip', 'passive_aggressive',
    'love_signal', 'insecurity', 'distancing', 'humor_shield',
]);

function parseSubtextBatch(raw: SubtextBatchRaw, fallbackWindowId: number): SubtextItem[] {
    if (!raw.items || !Array.isArray(raw.items)) return [];

    return raw.items
        .filter(item => item.originalMessage && item.sender && item.subtext)
        .map(item => ({
            originalMessage: item.originalMessage ?? '',
            sender: item.sender ?? '',
            timestamp: typeof item.timestamp === 'number' ? item.timestamp : 0,
            subtext: item.subtext ?? '',
            emotion: item.emotion ?? 'nieznana',
            confidence: Math.max(0, Math.min(100, typeof item.confidence === 'number' ? item.confidence : 50)),
            category: (VALID_CATEGORIES.has(item.category ?? '') ? item.category : 'genuine') as SubtextItem['category'],
            isHighlight: item.isHighlight === true,
            exchangeContext: item.exchangeContext ?? '',
            windowId: typeof item.windowId === 'number' ? item.windowId : fallbackWindowId,
            surroundingMessages: Array.isArray(item.surroundingMessages)
                ? item.surroundingMessages.slice(0, 6).map(m => ({
                    sender: m?.sender ?? '',
                    content: m?.content ?? '',
                    timestamp: typeof m?.timestamp === 'number' ? m.timestamp : 0,
                }))
                : [],
        }));
}

/**
 * Run Subtext Decoder analysis.
 * Extracts exchange windows from the full conversation, sends to Gemini in batches,
 * and returns decoded subtexts with context.
 */
export async function runSubtextAnalysis(
    messages: SimplifiedMsg[],
    participants: string[],
    onProgress?: (status: string) => void,
    relationshipContext?: Record<string, unknown>,
    quantitativeContext?: string,
): Promise<SubtextResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in .env.local');
    }

    onProgress?.('Wyodrębnianie wymian zdań...');

    // Extract exchange windows (30+ messages each, ~25 windows)
    const windows = extractExchangeWindows(messages, 25, 15);
    if (windows.length === 0) {
        throw new Error('Nie znaleziono wystarczającej liczby wymian zdań do analizy podtekstów');
    }

    // Build relationship context prefix
    let contextPrefix = '';
    if (relationshipContext) {
        contextPrefix = `\nRELATIONSHIP CONTEXT (from earlier analysis):\n${JSON.stringify(relationshipContext, null, 2)}\n`;
    }
    if (quantitativeContext) {
        contextPrefix += `\nQUANTITATIVE CONTEXT:\n${quantitativeContext}\n`;
    }

    // Split windows into batches of ~8
    const BATCH_SIZE = 8;
    const batches: ExchangeWindow[][] = [];
    for (let i = 0; i < windows.length; i += BATCH_SIZE) {
        batches.push(windows.slice(i, i + BATCH_SIZE));
    }

    const allItems: SubtextItem[] = [];

    for (let i = 0; i < batches.length; i++) {
        onProgress?.(`Dekodowanie podtekstów ${i + 1}/${batches.length}...`);

        const batchWindows = batches[i];
        const formattedWindows = formatWindowsForSubtext(batchWindows);
        const userContent = contextPrefix
            ? `${contextPrefix}\n\nPARTICIPANTS: ${participants.join(', ')}\n\n${formattedWindows}`
            : `PARTICIPANTS: ${participants.join(', ')}\n\n${formattedWindows}`;

        const raw = await callGeminiWithRetry(SUBTEXT_SYSTEM, userContent, 3, 16384);
        const parsed = parseGeminiJSON<SubtextBatchRaw>(raw);
        const batchItems = parseSubtextBatch(parsed, i * BATCH_SIZE);
        allItems.push(...batchItems);
    }

    onProgress?.('Analiza wzorców ukrywania...');

    if (allItems.length === 0) {
        throw new Error('Analiza podtekstów nie zwróciła wyników — spróbuj ponownie');
    }

    // Sort by confidence descending, limit to 60
    allItems.sort((a, b) => b.confidence - a.confidence);
    const items = allItems.slice(0, 60);

    // Ensure max 8 highlights
    let highlightCount = 0;
    for (const item of items) {
        if (item.isHighlight) {
            highlightCount++;
            if (highlightCount > 8) item.isHighlight = false;
        }
    }

    // Build summary
    const categoryCount: Record<string, number> = {};
    const hiddenPerPerson: Record<string, { hidden: number; total: number }> = {};

    for (const item of items) {
        categoryCount[item.category] = (categoryCount[item.category] ?? 0) + 1;
        if (!hiddenPerPerson[item.sender]) {
            hiddenPerPerson[item.sender] = { hidden: 0, total: 0 };
        }
        hiddenPerPerson[item.sender].total++;
        if (item.category !== 'genuine') {
            hiddenPerPerson[item.sender].hidden++;
        }
    }

    const hiddenEmotionBalance: Record<string, number> = {};
    const deceptionScore: Record<string, number> = {};
    let maxDeception = 0;
    let mostDeceptivePerson = participants[0] ?? '';

    for (const [name, stats] of Object.entries(hiddenPerPerson)) {
        const pct = stats.total > 0 ? Math.round((stats.hidden / stats.total) * 100) : 0;
        hiddenEmotionBalance[name] = pct;
        deceptionScore[name] = pct;
        if (pct > maxDeception) {
            maxDeception = pct;
            mostDeceptivePerson = name;
        }
    }

    const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category: category as SubtextItem['category'], count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const biggestReveal = items.find(i => i.isHighlight) ?? items[0];

    // Re-sort chronologically for display
    items.sort((a, b) => a.timestamp - b.timestamp);

    onProgress?.('Analiza zakończona');

    return {
        items,
        summary: {
            hiddenEmotionBalance,
            mostDeceptivePerson,
            deceptionScore,
            topCategories,
            biggestReveal,
        },
        disclaimer: SUBTEXT_DISCLAIMER,
        analyzedAt: Date.now(),
    };
}
