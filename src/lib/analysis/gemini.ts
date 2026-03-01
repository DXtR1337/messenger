/**
 * Server-only Gemini API module for PodTeksT.
 * Uses Google AI Studio SDK (@google/generative-ai) with a simple API key.
 * Must only be imported in server contexts (API routes).
 */

import 'server-only';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

import { sanitizeJsonString, parseGeminiJSON } from './json-parser';

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
    PASS_3A_SYSTEM,
    PASS_3B_SYSTEM,
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
import { logger } from '@/lib/logger';
import { GEMINI_MODEL_ID, TEMPERATURES } from './constants';

// ============================================================
// Private: Gemini API helpers
// ============================================================

let _clientInstance: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
    if (_clientInstance) return _clientInstance;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');
    _clientInstance = new GoogleGenerativeAI(apiKey);
    return _clientInstance;
}

const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function callGeminiWithRetry(
    systemPrompt: string,
    userContent: string,
    maxRetries = 3,
    maxTokens = 8192,
    temperature = 0.3,
    timeoutMs = 60_000,
): Promise<string> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const client = getClient();
            const model = client.getGenerativeModel({
                model: GEMINI_MODEL_ID,
                systemInstruction: systemPrompt,
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature: temperature,
                    responseMimeType: 'application/json',
                },
                safetySettings: SAFETY_SETTINGS,
            });

            let timeoutId: NodeJS.Timeout;
            const result = await Promise.race([
                model.generateContent(userContent),
                new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error(`Gemini API timeout after ${timeoutMs / 1000}s`)), timeoutMs);
                }),
            ]).finally(() => clearTimeout(timeoutId));
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

            // Detect token limit truncation — retry with doubled maxTokens
            if (candidate?.finishReason === 'MAX_TOKENS') {
                logger.warn(`[Gemini Truncation] Response truncated at ${maxTokens} tokens (attempt ${attempt + 1})`);
                maxTokens = Math.min(maxTokens * 2, 65536);
                if (attempt < maxRetries - 1) {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }
                // Last attempt — return what we have, caller may still parse partial JSON
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
            if (msg.includes('gemini api timeout')) {
                logger.warn('[Gemini Timeout] Attempt', attempt + 1, '- will retry with longer timeout');
            }
            if (attempt < maxRetries - 1) {
                const delay = msg.includes('timeout') ? 2000 * Math.pow(2, attempt) : 1000 * Math.pow(2, attempt);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    console.error('[Gemini Error] All retries exhausted:', lastError?.message);
    throw new Error(`Błąd analizy AI: ${lastError?.message ?? 'nieznany błąd'}`);
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
// Post-processing: Evidence index validation + Confidence capping
// ============================================================

/**
 * Recursively walk an object and clamp any `evidence_indices` arrays
 * so that every index falls within [0, maxIndex]. Out-of-range indices
 * are removed to prevent the UI from referencing non-existent messages.
 */
function validateEvidenceIndices<T>(obj: T, maxIndex: number): T {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => validateEvidenceIndices(item, maxIndex)) as unknown as T;
    }
    const result = { ...obj } as Record<string, unknown>;
    for (const key of Object.keys(result)) {
        if (key === 'evidence_indices' && Array.isArray(result[key])) {
            result[key] = (result[key] as number[]).filter(
                idx => typeof idx === 'number' && idx >= 0 && idx <= maxIndex
            );
        } else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = validateEvidenceIndices(result[key], maxIndex);
        }
    }
    return result as T;
}

/**
 * Confidence caps per pass/component — prompts declare these but Gemini
 * may exceed them. Code enforcement is the safety net.
 *
 * Pass 3A personality: 85 (text-only limitation)
 * Pass 3B clinical: 60 (not clinical diagnosis)
 * Pass 4 predictions: 75 (inherent uncertainty)
 * Attachment: 65 (limited window into attachment)
 */
const CONFIDENCE_CAPS: Record<string, number> = {
    pass3a_personality: 85,
    pass3b_clinical: 60,
    pass4_predictions: 75,
    attachment: 65,
};

/**
 * Recursively walk an object and clamp any `confidence` fields to maxConfidence.
 * Handles nested objects and arrays.
 */
function clampConfidenceValues<T>(obj: T, maxConfidence: number): T {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => clampConfidenceValues(item, maxConfidence)) as unknown as T;
    }
    const result = { ...obj } as Record<string, unknown>;
    for (const key of Object.keys(result)) {
        if (key === 'confidence' && typeof result[key] === 'number') {
            result[key] = Math.min(result[key] as number, maxConfidence);
        } else if (typeof result[key] === 'object' && result[key] !== null) {
            result[key] = clampConfidenceValues(result[key], maxConfidence);
        }
    }
    return result as T;
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
        const pass1Raw = await callGeminiWithRetry(PASS_1_SYSTEM, pass1Input, 3, 8192, TEMPERATURES.ANALYTICAL);
        const pass1MaxIdx = samples.overview.length - 1;
        const pass1 = validateEvidenceIndices(parseGeminiJSON<Pass1Result>(pass1Raw), pass1MaxIdx);
        result.pass1 = pass1;
        result.currentPass = 2;

        // Pass 2: Dynamics — power, conflict, intimacy
        onProgress(2, 'Analyzing relationship dynamics...');
        const pass2Input = buildRelationshipPrefix(relationshipContext) + formatMessagesForAnalysis(
            samples.dynamics,
            samples.quantitativeContext,
        );
        const pass2Raw = await callGeminiWithRetry(PASS_2_SYSTEM, pass2Input, 3, 8192, TEMPERATURES.ANALYTICAL);
        const pass2MaxIdx = samples.dynamics.length - 1;
        const pass2 = validateEvidenceIndices(parseGeminiJSON<Pass2Result>(pass2Raw), pass2MaxIdx);
        result.pass2 = pass2;
        result.currentPass = 3;

        // Pass 3: Individual profiles — only for participants with sampled messages
        // For large groups, perPerson is already capped to top 8 by sampleMessages()
        onProgress(3, 'Building individual personality profiles...');
        const profilingNames = participants.filter(name => samples.perPerson[name]?.length > 0);

        // Batch pass3 calls in groups of 4 to avoid Gemini rate limits
        const BATCH_SIZE = 4;
        const pass3: Record<string, PersonProfile> = {};

        // Validate Big Five: must have 5 traits with valid range arrays
        const isValidBigFive = (bf: unknown): boolean => {
            if (!bf || typeof bf !== 'object') return false;
            const obj = bf as Record<string, unknown>;
            for (const key of ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']) {
                const trait = obj[key];
                if (!trait || typeof trait !== 'object') return false;
                const t = trait as { range?: unknown; score?: unknown };
                if (Array.isArray(t.range) && t.range.length === 2 && t.range[0] > 0 && t.range[1] > 0) continue;
                if (typeof t.score === 'number' && t.score > 0) continue;
                return false;
            }
            return true;
        };

        // Safely parse Gemini JSON — returns empty object on error instead of throwing
        const safeParse = (raw: string | null, label: string): Partial<PersonProfile> => {
            if (!raw) return {};
            try {
                return parseGeminiJSON<Partial<PersonProfile>>(raw);
            } catch (e) {
                logger.warn(`[Pass 3] ${label} parse failed:`, e);
                return {};
            }
        };

        // Split Pass 3 into two calls per person to avoid Gemini output truncation.
        // 3A: Big Five, Attachment, Communication Profile, MBTI, Love Language
        // 3B: Communication Needs, Emotional Patterns, Clinical Observations, Conflict, EI
        const fetchProfile = async (name: string): Promise<readonly [string, PersonProfile]> => {
            const personMessages = samples.perPerson[name];
            logger.info(`[Pass 3] ${name}: ${personMessages.length} messages sampled`);
            const pass3Input = buildRelationshipPrefix(relationshipContext) + formatMessagesForAnalysis(personMessages);
            const userPrompt = `Analyze messages from: ${name}\n\n${pass3Input}`;

            // Run both halves in parallel — if one fails, the other still returns data
            const [settledA, settledB] = await Promise.allSettled([
                callGeminiWithRetry(PASS_3A_SYSTEM, userPrompt, 3, 8192, TEMPERATURES.ANALYTICAL),
                callGeminiWithRetry(PASS_3B_SYSTEM, userPrompt, 3, 8192, TEMPERATURES.SYNTHESIS),
            ]);

            const rawA = settledA.status === 'fulfilled' ? settledA.value : null;
            const rawB = settledB.status === 'fulfilled' ? settledB.value : null;

            if (settledA.status === 'rejected') logger.warn(`[Pass 3] ${name} 3A failed:`, settledA.reason);
            if (settledB.status === 'rejected') logger.warn(`[Pass 3] ${name} 3B failed:`, settledB.reason);

            if (!rawA && !rawB) throw new Error(`Pass 3 completely failed for ${name}`);

            logger.info(`[Pass 3] ${name}: 3A=${rawA?.length ?? 0} chars, 3B=${rawB?.length ?? 0} chars`);

            let partA = safeParse(rawA, `${name}/3A`);
            const partB = safeParse(rawB, `${name}/3B`);

            // Validate Big Five — if present but malformed, retry 3A once
            if (!isValidBigFive(partA.big_five_approximation)) {
                logger.warn(`[Pass 3] ${name}: Big Five invalid or missing — retrying 3A`);
                try {
                    const retryRaw = await callGeminiWithRetry(PASS_3A_SYSTEM, userPrompt, 2, 8192, TEMPERATURES.ANALYTICAL);
                    const retryPart = safeParse(retryRaw, `${name}/3A-retry`);
                    if (isValidBigFive(retryPart.big_five_approximation)) {
                        partA = { ...partA, ...retryPart };
                    }
                } catch {
                    logger.warn(`[Pass 3] ${name}: 3A retry also failed`);
                }
            }

            // Merge both halves into one PersonProfile + apply confidence caps
            const personMaxIdx = personMessages.length - 1;
            const profile: PersonProfile = {
                big_five_approximation: clampConfidenceValues(
                    partA.big_five_approximation ?? partB.big_five_approximation,
                    CONFIDENCE_CAPS.pass3a_personality,
                ),
                attachment_indicators: clampConfidenceValues(
                    validateEvidenceIndices(
                        partA.attachment_indicators ?? partB.attachment_indicators,
                        personMaxIdx,
                    ),
                    CONFIDENCE_CAPS.attachment,
                ),
                communication_profile: partA.communication_profile ?? partB.communication_profile,
                communication_needs: partB.communication_needs ?? partA.communication_needs,
                emotional_patterns: partB.emotional_patterns ?? partA.emotional_patterns,
                clinical_observations: clampConfidenceValues(
                    partB.clinical_observations ?? partA.clinical_observations,
                    CONFIDENCE_CAPS.pass3b_clinical,
                ),
                conflict_resolution: partB.conflict_resolution ?? partA.conflict_resolution,
                emotional_intelligence: partB.emotional_intelligence ?? partA.emotional_intelligence,
                mbti: partA.mbti ?? partB.mbti,
                love_language: partA.love_language ?? partB.love_language,
            } as PersonProfile;

            const hasAttach = !!profile.attachment_indicators?.primary_style;
            const hasBF = isValidBigFive(profile.big_five_approximation);
            const hasMBTI = !!profile.mbti?.type;
            const hasEI = !!profile.emotional_intelligence;
            const hasClinical = !!profile.clinical_observations;
            logger.info(`[Pass 3] ${name}: attach=${hasAttach}, bf=${hasBF}, mbti=${hasMBTI}, ei=${hasEI}, clinical=${hasClinical}`);
            return [name, profile] as const;
        };

        for (let i = 0; i < profilingNames.length; i += BATCH_SIZE) {
            const batch = profilingNames.slice(i, i + BATCH_SIZE);
            const settled = await Promise.allSettled(batch.map(fetchProfile));
            for (const entry of settled) {
                if (entry.status === 'fulfilled') {
                    const [name, profile] = entry.value;
                    if (profile) pass3[name] = profile;
                } else {
                    logger.warn('[Pass 3] Profile fetch failed:', entry.reason);
                }
            }
        }

        // Retry incomplete profiles — if key fields are missing, likely truncated
        const isProfileComplete = (p: PersonProfile): boolean =>
            !!p.attachment_indicators?.primary_style &&
            isValidBigFive(p.big_five_approximation) &&
            !!p.communication_profile;

        const incompleteNames = profilingNames.filter(
            name => pass3[name] && !isProfileComplete(pass3[name])
        );
        if (incompleteNames.length > 0) {
            logger.warn(`[Pass 3] Retrying ${incompleteNames.length} incomplete profile(s):`, incompleteNames);
            const retrySettled = await Promise.allSettled(incompleteNames.map(fetchProfile));
            for (const entry of retrySettled) {
                if (entry.status === 'fulfilled') {
                    const [name, profile] = entry.value;
                    if (profile && isProfileComplete(profile)) {
                        pass3[name] = profile;
                    } else if (profile) {
                        // Keep retry result if it has more data than original
                        const orig = pass3[name];
                        if (!orig.attachment_indicators?.primary_style && profile.attachment_indicators?.primary_style) {
                            pass3[name] = profile;
                        }
                    }
                }
            }
        }

        // Log final state for debugging
        for (const name of profilingNames) {
            if (!pass3[name]) {
                logger.warn(`[Pass 3] No profile for ${name} — skipped`);
            } else if (!isProfileComplete(pass3[name])) {
                const missing: string[] = [];
                if (!pass3[name].attachment_indicators?.primary_style) missing.push('attachment_indicators');
                if (!pass3[name].big_five_approximation) missing.push('big_five');
                if (!pass3[name].communication_profile) missing.push('communication_profile');
                logger.warn(`[Pass 3] Incomplete profile for ${name} — missing: ${missing.join(', ')}`);
            }
        }
        result.pass3 = pass3;
        result.currentPass = 4;

        // Pass 4: Synthesis — final report
        onProgress(4, 'Synthesizing final report...');
        const synthesisInput = buildRelationshipPrefix(relationshipContext) + buildSynthesisInputFromPasses(pass1, pass2, pass3, samples.quantitativeContext);
        const pass4Raw = await callGeminiWithRetry(PASS_4_SYSTEM, synthesisInput, 3, 8192, TEMPERATURES.SYNTHESIS);
        let pass4 = parseGeminiJSON<Pass4Result>(pass4Raw);
        // Cap prediction confidence — inherent uncertainty in forecasting
        if (pass4.predictions) {
            pass4 = {
                ...pass4,
                predictions: pass4.predictions.map(p => ({
                    ...p,
                    confidence: Math.min(p.confidence, CONFIDENCE_CAPS.pass4_predictions),
                })),
            };
        }
        result.pass4 = pass4;

        result.status = 'complete';
        result.completedAt = Date.now();
    } catch (err) {
        const hasPartialResults = result.pass1 || result.pass2 || result.pass3;
        result.status = hasPartialResults ? 'partial' : 'error';
        result.error = `Błąd analizy AI: ${err instanceof Error ? err.message : String(err)}`;
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

    const raw = await callGeminiWithRetry(STANDUP_ROAST_SYSTEM, input, 3, 8192, 0.7);
    return parseGeminiJSON<StandUpRoastResult>(raw);
}

// ============================================================
// Public: Enhanced Roast pass (with full psychological context)
// ============================================================

// ============================================================
// Private: Roast keyword scanner — finds roastable material in messages
// ============================================================

interface RoastableFind {
    category: string;
    quote: string;
    sender: string;
}

const ROAST_KEYWORD_PATTERNS: Array<{ category: string; patterns: RegExp[] }> = [
    {
        category: 'Cringe / żenada',
        patterns: [
            /kocham ci[eę]/i, /tęskn[ię]/i, /miss you/i, /love you/i,
            /buzi[aąeę]/i, /kochani[eę]/i, /skarb[ie]?/i, /kotk[uao]/i,
            /misiu/i, /baby/i, /babe/i,
        ],
    },
    {
        category: 'Substancje / imprezy',
        patterns: [
            /trawka/i, /zioło/i, /kresk[aę]/i, /tabs[yię]/i, /joint/i,
            /na\s*bani/i, /urżnę?ą[lł]/i, /wódk[aęi]/i, /pijemy/i, /naćpan/i,
            /imprez[aęy]/i, /melanż/i, /after/i, /rave/i,
        ],
    },
    {
        category: 'Wulgaryzmy / obrażanie',
        patterns: [
            /kurwa/i, /jeba[ćcł]/i, /pierdol/i, /chuj/i, /spierdal/i,
            /debil/i, /idiota/i, /kretyn/i, /głupi[aey]?/i,
        ],
    },
    {
        category: 'Desperacja / clingy behavior',
        patterns: [
            /czemu nie odpisujesz/i, /halo\??/i, /odezwij si[eę]/i,
            /\?\?\?/i, /odpowiedz/i, /ignorujesz/i, /napisz do mnie/i,
            /dlaczego mi nie/i, /nie odpisuje/i,
        ],
    },
    {
        category: 'Kłamstwa / wymówki',
        patterns: [
            /nie widziałe?[mś]/i, /nie dostałe?[mś]/i, /telefon mi pad/i,
            /bateria mi się/i, /byłe?[mś] zajęt/i, /zasn[aą]łe?[mś]/i,
            /nie mogłe?[mś]/i, /sorr?y/i, /przepraszam/i,
        ],
    },
    {
        category: 'Groźby / szantaż emocjonalny',
        patterns: [
            /zostawię ci[eę]/i, /odchodzę/i, /koniec/i, /nie chcę cię/i,
            /zabiję/i, /nie żyj/i, /rzucam ci[eę]/i,
            /nie rozmawiaj ze mn/i, /blokuj[ęe]/i,
        ],
    },
    {
        category: 'Self-owns / samobójcze gole',
        patterns: [
            /jestem (taki |taka )?(głupi|beznadziejn|żałosn|smutny|brzydki)/i,
            /nikt mnie nie/i, /jestem sam[ao]?$/i, /nie zasługuję/i,
            /jestem (najgorsz|bezwartościow)/i,
        ],
    },
    {
        category: 'Podejrzane godziny',
        patterns: [], // handled separately by timestamp
    },
];

function scanForRoastableMaterial(messages: Array<{ sender: string; content: string; timestamp: number }>): string {
    const finds: RoastableFind[] = [];
    const lateNightMessages: Array<{ sender: string; content: string; time: string }> = [];

    for (const msg of messages) {
        if (!msg.content || msg.content.length < 3) continue;

        // Check keyword patterns
        for (const { category, patterns } of ROAST_KEYWORD_PATTERNS) {
            if (patterns.length === 0) continue;
            for (const pattern of patterns) {
                if (pattern.test(msg.content)) {
                    finds.push({ category, quote: msg.content.slice(0, 200), sender: msg.sender });
                    break; // one match per category per message
                }
            }
        }

        // Check late-night messages (1:00 - 5:00 AM)
        const hour = new Date(msg.timestamp).getHours();
        if (hour >= 1 && hour <= 4 && msg.content.length > 10) {
            lateNightMessages.push({
                sender: msg.sender,
                content: msg.content.slice(0, 150),
                time: new Date(msg.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
            });
        }
    }

    if (finds.length === 0 && lateNightMessages.length === 0) return '';

    const sections: string[] = ['=== ROASTABLE MATERIAL SCANNER (auto-detected) ==='];

    // Group finds by category
    const byCategory = new Map<string, RoastableFind[]>();
    for (const find of finds) {
        const list = byCategory.get(find.category) ?? [];
        list.push(find);
        byCategory.set(find.category, list);
    }

    for (const [category, items] of byCategory) {
        sections.push(`\n[${category}] (${items.length} znalezionych):`);
        // Show top 5 per category
        for (const item of items.slice(0, 5)) {
            sections.push(`  - ${item.sender}: "${item.quote}"`);
        }
    }

    if (lateNightMessages.length > 0) {
        sections.push(`\n[Podejrzane godziny] (${lateNightMessages.length} wiadomości między 1:00-5:00):`);
        for (const msg of lateNightMessages.slice(0, 5)) {
            sections.push(`  - ${msg.sender} o ${msg.time}: "${msg.content}"`);
        }
    }

    sections.push('\nUŻYJ tych znalezionych cytatów i wzorców w swoich roastach! Cytuj je DOSŁOWNIE.');
    return sections.join('\n');
}

/**
 * Build a condensed psychological context for Enhanced Roast.
 * Instead of dumping full JSON from all 4 passes (30-80KB),
 * extract only the fields most useful for roasting (~5KB).
 */
function buildCondensedRoastContext(
    pass1: Pass1Result,
    pass2: Pass2Result,
    pass3: Record<string, PersonProfile>,
    pass4: Pass4Result,
    quantitativeContext: string,
): string {
    const sections: string[] = [];

    // Pass 1: compact overview
    sections.push('=== OVERVIEW ===');
    sections.push(`Relationship: ${pass1.relationship_type}`);
    for (const [name, tone] of Object.entries(pass1.tone_per_person ?? {})) {
        const t = tone as { dominant_tone?: string; formality?: string };
        sections.push(`${name}: tone=${t.dominant_tone ?? '?'}, formality=${t.formality ?? '?'}`);
    }
    sections.push(`Dynamic: ${JSON.stringify(pass1.overall_dynamic)}`);

    // Pass 2: dynamics essentials
    sections.push('\n=== DYNAMICS ===');
    const pd = pass2.power_dynamics;
    sections.push(`Power balance: ${pd.balance_score} (adapts more: ${pd.who_adapts_more})`);
    sections.push(`Evidence: ${pd.evidence.slice(0, 3).join('; ')}`);
    sections.push(`Conflict style: ${JSON.stringify(pass2.conflict_patterns)}`);
    const el = pass2.emotional_labor;
    if (el) sections.push(`Emotional labor: caregiver=${el.primary_caregiver}, balance=${el.balance_score}`);
    if (pass2.red_flags?.length) sections.push(`Red flags: ${pass2.red_flags.map(f => f.pattern).join(', ')}`);
    if (pass2.green_flags?.length) sections.push(`Green flags: ${pass2.green_flags.map(f => f.pattern).join(', ')}`);

    // Pass 3: per-person compact profiles
    sections.push('\n=== PERSONALITY PROFILES ===');
    for (const [name, profile] of Object.entries(pass3)) {
        const lines: string[] = [`--- ${name} ---`];
        if (profile.mbti?.type) lines.push(`MBTI: ${profile.mbti.type}`);
        const b5 = profile.big_five_approximation;
        if (b5) {
            const scores = Object.entries(b5).map(([k, v]) => {
                const trait = v as { range?: [number, number] };
                return `${k[0].toUpperCase()}:${trait.range ? trait.range.join('-') : '?'}`;
            }).join(' ');
            lines.push(`Big Five: ${scores}`);
        }
        const att = profile.attachment_indicators;
        if (att?.primary_style) lines.push(`Attachment: ${att.primary_style}`);
        if (profile.love_language?.primary) lines.push(`Love language: ${profile.love_language.primary}`);
        const comm = profile.communication_profile;
        if (comm?.style) lines.push(`Communication: style=${comm.style}, assertiveness=${comm.assertiveness}`);
        const clin = profile.clinical_observations;
        if (clin?.anxiety_markers?.present) lines.push(`Anxiety markers: ${clin.anxiety_markers.patterns?.slice(0, 2).join(', ')}`);
        if (clin?.avoidance_markers?.present) lines.push(`Avoidance markers: ${clin.avoidance_markers.patterns?.slice(0, 2).join(', ')}`);
        sections.push(lines.join('\n'));
    }

    // Pass 4: health + insights
    sections.push('\n=== HEALTH SCORE ===');
    sections.push(JSON.stringify(pass4.health_score));
    sections.push(`Summary: ${pass4.executive_summary}`);
    if (pass4.predictions?.length) {
        sections.push(`Predictions: ${pass4.predictions.slice(0, 3).map(p => p.prediction ?? p).join('; ')}`);
    }

    // Quantitative context (already compact string)
    sections.push('\n=== QUANTITATIVE ===');
    sections.push(quantitativeContext);

    return sections.join('\n');
}

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
    deepScanMaterial?: string,
): Promise<RoastResult> {
    // Full psychological context from all 4 passes
    const psychContext = buildSynthesisInputFromPasses(
        qualitative.pass1, qualitative.pass2, qualitative.pass3, quantitativeContext,
    );

    // Scan all available messages for roastable material
    const allMessages = [
        ...samples.overview,
        ...Object.values(samples.perPerson).flat(),
    ];
    const roastableMaterial = scanForRoastableMaterial(allMessages);

    const input = `PARTICIPANTS: ${participants.join(', ')}
${deepScanMaterial ? `\n${deepScanMaterial}\n` : ''}
=== FULL PSYCHOLOGICAL ANALYSIS ===
${psychContext}

=== PASS 4: SYNTHESIS ===
${JSON.stringify(qualitative.pass4, null, 2)}
${roastableMaterial ? `\n${roastableMaterial}` : ''}

=== MESSAGE SAMPLES ===
${formatMessagesForAnalysis(samples.overview)}`;

    logger.log('[Enhanced Roast] Input size:', (input.length / 1024).toFixed(1), 'KB');
    const raw = await callGeminiWithRetry(ENHANCED_ROAST_SYSTEM, input, 3, 16384, 0.5, 240_000);
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

    const raw = await callGeminiWithRetry(MEGA_ROAST_SYSTEM, input, 3, 8192, 0.5);
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

    const raw = await callGeminiWithRetry(CWEL_TYGODNIA_SYSTEM, input, 3, 8192, 0.5);
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

        const raw = await callGeminiWithRetry(systemPrompt, input, 3, 16384, TEMPERATURES.ANALYTICAL);
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

/**
 * Generate a satirical cartoon dating app profile picture using Gemini image generation.
 */
export async function generateDatingProfileImage(
    context: {
        name: string;
        bio: string;
        ageVibe: string;
        personality?: string;
        mbti?: string;
        bigFive?: string;
        attachmentStyle?: string;
        communicationStyle?: string;
        dominantEmotions?: string;
        appearanceClues?: string;
        redFlags?: string;
        worstStats?: string;
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
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });

    // Build a rich character description from personality data
    const traits: string[] = [];

    if (context.mbti) {
        const mbtiVibes: Record<string, string> = {
            INTJ: 'intense intellectual stare, sharp features, minimal expression, dark clothing',
            INTP: 'messy hair, curious eyes, slightly disheveled, casual hoodie',
            ENTJ: 'confident posture, sharp jawline, power dressing, commanding presence',
            ENTP: 'mischievous smirk, animated expression, creative style, energetic pose',
            INFJ: 'gentle eyes, thoughtful expression, soft features, layered clothing',
            INFP: 'dreamy gaze, soft curly hair, artistic style, vintage clothes',
            ENFJ: 'warm smile, open posture, charismatic expression, well-groomed',
            ENFP: 'bright eyes, wild hair, colorful accessories, huge smile',
            ISTJ: 'neat appearance, serious expression, button-up shirt, disciplined posture',
            ISFJ: 'kind eyes, gentle smile, modest clothing, warm expression',
            ESTJ: 'strong jaw, firm stance, business casual, authoritative expression',
            ESFJ: 'friendly face, warm smile, trendy outfit, welcoming pose',
            ISTP: 'cool detached expression, leather jacket, minimalist style, sharp eyes',
            ISFP: 'artistic vibe, colorful accessories, soft expression, creative clothing',
            ESTP: 'athletic build, cocky grin, sporty casual, confident lean',
            ESFP: 'party energy, flashy outfit, big smile, expressive pose',
        };
        const mbtiType = context.mbti.toUpperCase();
        traits.push(mbtiVibes[mbtiType] || `${mbtiType} personality type`);
    }

    if (context.bigFive) traits.push(`Big Five traits: ${context.bigFive}`);

    if (context.attachmentStyle) {
        const attachVibes: Record<string, string> = {
            secure: 'relaxed confident posture, warm genuine smile, open body language',
            anxious: 'slightly tense expression, eager eyes, leaning forward, nervous energy, phone clutched tightly',
            avoidant: 'arms crossed, cool detached gaze, leaning back, wall-up vibe, looking away',
            disorganized: 'contradictory expression, intense but guarded, unpredictable energy',
        };
        traits.push(attachVibes[context.attachmentStyle] || '');
    }

    if (context.communicationStyle) {
        const commVibes: Record<string, string> = {
            direct: 'assertive posture, firm eye contact, strong chin',
            indirect: 'softer gaze, slightly turned away, diplomatic expression',
            mixed: 'adaptive expression, somewhere between assertive and gentle',
        };
        traits.push(commVibes[context.communicationStyle] || '');
    }

    if (context.dominantEmotions) traits.push(`Expression reflecting: ${context.dominantEmotions}`);
    if (context.appearanceClues) traits.push(`Physical appearance clues from their real conversations: ${context.appearanceClues}`);

    const bioSnippet = context.bio.slice(0, 200);
    const traitDescription = traits.filter(Boolean).join('. ');

    const prompt = `Create a HUMOROUS but high-quality caricature portrait for a dating app. This is a SINGLE CHARACTER portrait that should be FUNNY — combining real appearance with their worst personality traits.

CHARACTER: "${context.name}"
VIBE/AGE ENERGY: ${context.ageVibe}
BIO (their REAL texting personality — this is who they ACTUALLY are): "${bioSnippet}"
${context.appearanceClues ? `REAL APPEARANCE CLUES FROM THEIR CONVERSATIONS (USE THESE — this is what they actually look like): ${context.appearanceClues}` : 'No appearance clues — improvise based on personality and age vibe.'}
${context.redFlags ? `RED FLAGS TO VISUALLY REFERENCE (incorporate these as subtle visual gags — props, background details, expression): ${context.redFlags}` : ''}
${context.worstStats ? `FUNNIEST STATS TO REFERENCE (exaggerate these visually): ${context.worstStats}` : ''}
${traitDescription ? `PERSONALITY VISUAL TRAITS: ${traitDescription}` : ''}

CRITICAL RULES:
- The portrait MUST incorporate appearance clues from the conversation (hair color, glasses, build, style etc.) — this is the MOST IMPORTANT input
- Add subtle visual gags that reference their red flags and worst stats: e.g. double-texter → phone in hand with notification bubbles, ghoster → slightly translucent, clingy → surrounded by hearts, night owl → dark circles and energy drink, gamer → RGB lighting, gym bro → tight shirt
- The expression and body language should reflect their WORST trait, not their best
- Make it look like the person's HONEST dating photo — the one their friends would pick, not the one they'd pick themselves

STYLE:
- Semi-realistic digital art with slight caricature exaggeration (NOT cartoon, NOT anime)
- Moody dark background with subtle neon color gradient (deep purple/blue/pink tones)
- Dramatic cinematic lighting — soft key light from one side, rim light from behind
- Portrait from chest up, slight angle
- Square 1:1 ratio
- NO text, NO watermarks, NO UI elements, NO words
- High quality, stylized dating app portrait aesthetic`;

    // Retry up to 3 times with exponential backoff
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            const parts = result.response.candidates?.[0]?.content?.parts;
            if (!parts) {
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                    continue;
                }
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

            if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                continue;
            }
            return { error: 'No image data in Gemini response' };
        } catch (error) {
            if (attempt < MAX_RETRIES - 1) {
                await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
                continue;
            }
            return {
                error: error instanceof Error ? error.message : 'Błąd generowania zdjęcia profilowego',
            };
        }
    }

    return { error: 'Image generation failed after retries' };
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

        const raw = await callGeminiWithRetry(SUBTEXT_SYSTEM, userContent, 3, 16384, TEMPERATURES.SEMI_CREATIVE);
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
