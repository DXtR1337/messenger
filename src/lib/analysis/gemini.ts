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
} from './types';
import {
    PASS_1_SYSTEM,
    PASS_2_SYSTEM,
    PASS_3_SYSTEM,
    PASS_4_SYSTEM,
    formatMessagesForAnalysis,
} from './prompts';

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
): Promise<string> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const client = getClient();
            const model = client.getGenerativeModel({
                model: 'gemini-3-flash-preview',
                systemInstruction: systemPrompt,
                generationConfig: {
                    maxOutputTokens: 8192,
                    temperature: 0.7,
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
                throw lastError;
            }
            if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError;
}

function parseGeminiJSON<T>(raw: string): T {
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned) as T;
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
        const pass1Input = formatMessagesForAnalysis(samples.overview);
        const pass1Raw = await callGeminiWithRetry(PASS_1_SYSTEM, pass1Input);
        const pass1 = parseGeminiJSON<Pass1Result>(pass1Raw);
        result.pass1 = pass1;
        result.currentPass = 2;

        // Pass 2: Dynamics — power, conflict, intimacy
        onProgress(2, 'Analyzing relationship dynamics...');
        const pass2Input = formatMessagesForAnalysis(
            samples.dynamics,
            samples.quantitativeContext,
        );
        const pass2Raw = await callGeminiWithRetry(PASS_2_SYSTEM, pass2Input);
        const pass2 = parseGeminiJSON<Pass2Result>(pass2Raw);
        result.pass2 = pass2;
        result.currentPass = 3;

        // Pass 3: Individual profiles — one per participant
        onProgress(3, 'Building individual personality profiles...');
        const pass3: Record<string, PersonProfile> = {};
        for (const name of participants) {
            const personMessages = samples.perPerson[name];
            if (!personMessages || personMessages.length === 0) continue;

            const pass3Input = formatMessagesForAnalysis(personMessages);
            const pass3Raw = await callGeminiWithRetry(
                PASS_3_SYSTEM,
                `Analyze messages from: ${name}\n\n${pass3Input}`,
            );
            pass3[name] = parseGeminiJSON<PersonProfile>(pass3Raw);
        }
        result.pass3 = pass3;
        result.currentPass = 4;

        // Pass 4: Synthesis — final report
        onProgress(4, 'Synthesizing final report...');
        const synthesisInput = buildSynthesisInputFromPasses(pass1, pass2, pass3, samples.quantitativeContext);
        const pass4Raw = await callGeminiWithRetry(PASS_4_SYSTEM, synthesisInput);
        const pass4 = parseGeminiJSON<Pass4Result>(pass4Raw);
        result.pass4 = pass4;

        result.status = 'complete';
        result.completedAt = Date.now();
    } catch (error) {
        result.status = 'error';
        result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
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
- Use speech bubbles for dialogue — do NOT write the actual conversation text, use wavy lines or symbols to represent speech
- The overall mood should feel: ${mood}
- Background should be dark/moody (#1a1a2e or deep navy) with the characters and speech bubbles being the bright focal points
- The panels should flow naturally from left to right, top to bottom
- Add subtle emotional context through body language, environmental details, and color temperature
- Make it feel premium and artistic — like a high-quality graphic novel page
- Aspect ratio: 16:9, landscape orientation
- Do NOT include any readable text at all — all "speech" should be represented as abstract symbols or wavy lines in the bubbles`;

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
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
