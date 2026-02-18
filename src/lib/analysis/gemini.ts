/**
 * Server-only Gemini API module for ChatScope.
 * Uses Google AI Studio SDK (@google/generative-ai) with a simple API key.
 * Must only be imported in server contexts (API routes).
 */

import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';

import type {
    Pass1Result,
    Pass2Result,
    PersonProfile,
    Pass4Result,
    QualitativeAnalysis,
    RoastResult,
} from './types';
import {
    PASS_1_SYSTEM,
    PASS_2_SYSTEM,
    PASS_3_SYSTEM,
    PASS_4_SYSTEM,
    PASS_5_SCID_SYSTEM,
    ROAST_SYSTEM,
    formatMessagesForAnalysis,
} from './prompts';
import type { SCIDResult, SCIDAnswer } from './scid-ii';
import { calculateDisorderResults, SCID_DISCLAIMER } from './scid-ii';

import type { AnalysisSamples } from './qualitative';

// ============================================================
// Private: Gemini API helpers
// ============================================================

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
                    temperature: 0.3,
                    responseMimeType: 'application/json',
                },
            });

            const result = await model.generateContent(userContent);
            const text = result.response.text();
            if (!text) throw new Error('No text in Gemini response');
            return text;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const msg = lastError.message.toLowerCase();
            if (
                msg.includes('api key') ||
                msg.includes('permission') ||
                msg.includes('billing') ||
                msg.includes('not found') ||
                msg.includes('invalid')
            ) {
                console.error('[Gemini Error]', lastError);
                throw new Error('Błąd analizy AI');
            }
            if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            }
        }
    }
    console.error('[Gemini Error]', lastError);
    throw new Error('Błąd analizy AI');
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
    try {
        return JSON.parse(cleaned) as T;
    } catch {
        console.error('[Gemini Error] Failed to parse response as JSON. Raw (first 500 chars):', raw.slice(0, 500));
        throw new Error('Błąd analizy AI');
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

    const label = labels[relationshipContext] ?? relationshipContext;
    const baseline = baselines[relationshipContext] ?? '';
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

        // Pass 3: Individual profiles — all participants in parallel
        onProgress(3, 'Building individual personality profiles...');
        const pass3Entries = await Promise.all(
            participants.map(async (name) => {
                const personMessages = samples.perPerson[name];
                if (!personMessages || personMessages.length === 0) return [name, null] as const;

                const pass3Input = buildRelationshipPrefix(relationshipContext) + formatMessagesForAnalysis(personMessages);
                const pass3Raw = await callGeminiWithRetry(
                    PASS_3_SYSTEM,
                    `Analyze messages from: ${name}\n\n${pass3Input}`,
                );
                return [name, parseGeminiJSON<PersonProfile>(pass3Raw)] as const;
            })
        );
        const pass3: Record<string, PersonProfile> = {};
        for (const [name, profile] of pass3Entries) {
            if (profile) pass3[name] = profile;
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
    } catch (error) {
        console.error('[Gemini Error] Analysis pass failed:', error);
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
        console.error('[Gemini Error] Image generation failed:', error);
        return {
            error: 'Błąd analizy AI',
        };
    }
}

// ============================================================
// Public: SCID-II Personality Disorder Screening (server-side only)
// ============================================================

interface SCIDRawAnswer {
    answer?: boolean | null;
    confidence?: number;
    evidence?: string[];
}

interface SCIDRawResponse {
    answers?: Record<string, SCIDRawAnswer>;
    overallConfidence?: number;
}

/**
 * Run SCID-II personality disorder screening analysis.
 * This is an optional Pass 5 that requires Passes 1-3 to be completed first.
 * Must be called server-side (API route) since it requires GEMINI_API_KEY.
 */
export async function runSCIDAnalysis(
    samples: AnalysisSamples,
    participantName: string,
    onProgress?: (status: string) => void,
): Promise<SCIDResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set in .env.local');
    }

    onProgress?.('Przygotowanie analizy SCID-II...');

    // Get messages only from the target participant
    const personMessages = samples.perPerson[participantName] ?? [];
    if (personMessages.length === 0) {
        throw new Error(`No messages found for participant: ${participantName}`);
    }

    onProgress?.('Analiza wzorców osobowości...');

    // Build input with context
    const input = `ANALYZE MESSAGES FROM: ${participantName}

INSTRUCTIONS:
You are performing a clinical personality screening based on communication patterns.
Evaluate all 119 SCID-II screening questions based on the message patterns below.

RULES:
- Only mark "yes" if there are 3+ clear instances in the messages
- Confidence must reflect evidence strength (few examples = low confidence)
- Be conservative - this is SCREENING not diagnosis
- Questions about behavior outside messaging (childhood, criminal acts, supernatural, physical appearance, spending habits, concentration, suicidal ideation, self-harm, fire-setting, theft, violence) should be marked null with confidence 0
- Focus on: language patterns, emotional reactions, interpersonal dynamics, avoidance patterns, response patterns visible in text

${formatMessagesForAnalysis(personMessages)}`;

    const raw = await callGeminiWithRetry(PASS_5_SCID_SYSTEM, input, 3, 16384);
    const parsed = parseGeminiJSON<SCIDRawResponse>(raw);

    onProgress?.('Przetwarzanie wyników...');

    // Convert string keys to numbers and normalize answers
    const answers: Record<number, SCIDAnswer> = {};
    
    if (parsed.answers && typeof parsed.answers === 'object') {
        for (const [key, value] of Object.entries(parsed.answers)) {
            const id = parseInt(key, 10);
            if (!isNaN(id) && value && typeof value === 'object') {
                answers[id] = {
                    answer: typeof value.answer === 'boolean' ? value.answer : null,
                    confidence: Math.max(0, Math.min(100, typeof value.confidence === 'number' ? value.confidence : 0)),
                    evidence: Array.isArray(value.evidence) ? value.evidence.slice(0, 5) : [],
                };
            }
        }
    }

    if (Object.keys(answers).length === 0) {
        console.error('[Gemini Error] SCID analysis returned empty answers');
        throw new Error('Błąd analizy AI — spróbuj ponownie');
    }

    // Calculate disorder results
    const disorderResults = calculateDisorderResults(answers);

    // Calculate overall confidence
    const answerValues = Object.values(answers);
    const overallConfidence = answerValues.length > 0
        ? Math.round(answerValues.reduce((sum, a) => sum + a.confidence, 0) / answerValues.length)
        : 0;

    onProgress?.('Analiza zakończona');

    return {
        answers,
        disorders: disorderResults,
        overallConfidence: parsed.overallConfidence ?? overallConfidence,
        disclaimer: SCID_DISCLAIMER,
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
        console.error('[Gemini Error] Roast image generation failed:', error);
        return {
            error: 'Błąd analizy AI',
        };
    }
}
