/**
 * Lightweight Gemini AI wrapper for Discord commands.
 * Reuses the same API key and safety settings as the main analysis module,
 * but with shorter output limits suitable for Discord embeds.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Call Gemini for a Discord command. Shorter output, fewer retries.
 * Default: 2048 tokens (~3000 chars). Channel roast uses 4096.
 */
export async function callGeminiForDiscord(
  systemPrompt: string,
  userContent: string,
  options?: { maxOutputTokens?: number; temperature?: number; maxRetries?: number },
): Promise<string> {
  const maxRetries = options?.maxRetries ?? 2;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const client = getClient();
      const model = client.getGenerativeModel({
        model: 'gemini-3-flash-preview',
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: options?.maxOutputTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
          responseMimeType: 'application/json',
        },
        safetySettings: SAFETY_SETTINGS,
      });

      const result = await model.generateContent(userContent);
      const response = result.response;

      if (response.promptFeedback?.blockReason) {
        throw new Error(`Filtr bezpieczeństwa: ${response.promptFeedback.blockReason}`);
      }

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason === 'SAFETY') {
        throw new Error('Odpowiedź zablokowana przez filtr bezpieczeństwa');
      }

      const text = response.text();
      if (!text) throw new Error('Pusta odpowiedź AI');
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const msg = lastError.message.toLowerCase();

      if (msg.includes('api key') || msg.includes('permission') || msg.includes('billing')) {
        throw new Error('Błąd konfiguracji API');
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`Błąd AI: ${lastError?.message ?? 'nieznany'}`);
}

/**
 * Parse Gemini JSON response safely, returning null on failure.
 */
export function parseGeminiJSONSafe<T>(raw: string): T | null {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('[Discord AI] Failed to parse JSON:', raw.slice(0, 200));
    return null;
  }
}
