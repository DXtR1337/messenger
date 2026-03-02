import 'server-only';
import { callGeminiWithRetry } from '@/lib/analysis/gemini';
import { parseGeminiJSON } from '@/lib/analysis/json-parser';
import {
  buildEmotionCausesPrompt,
  EMOTION_CAUSES_SYSTEM,
} from '@/lib/analysis/emotion-causes-prompts';
import type { EmotionCausesResult } from '@/lib/analysis/emotion-causes-prompts';
import { rateLimit } from '@/lib/rate-limit';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_MESSAGES = 250;

export async function POST(request: Request): Promise<Response> {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, retryAfter } = checkLimit(ip);
  if (!allowed) {
    return Response.json(
      { error: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const MAX_BODY_SIZE = 10 * 1024 * 1024;
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return Response.json({ error: 'Request body too large.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('messages' in body) ||
    !('participants' in body)
  ) {
    return Response.json({ error: 'Missing required fields: messages, participants.' }, { status: 400 });
  }

  const { messages, participants, reconBriefing } = body as {
    messages: Array<{ sender: string; content: string; index: number }>;
    participants: string[];
    reconBriefing?: string;
  };

  if (!Array.isArray(messages) || !Array.isArray(participants) || participants.length < 2) {
    return Response.json({ error: 'Nieprawidłowe dane żądania.' }, { status: 400 });
  }

  if (!messages.every(m => typeof m?.sender === 'string' && typeof m?.content === 'string')) {
    return Response.json({ error: 'Wiadomości muszą zawierać pola sender i content.' }, { status: 400 });
  }

  // Sample: weight recent messages 50%, with emotional content boosted
  const emotionKeywords = /\b(zły|zła|smutny|smutna|cieszę|kocham|frustracja|wkurwi|boję|żal|tęsknię|przepraszam|nie rozumiem|nie mogę|why|angry|sad|happy|love|miss|sorry)\b/i;
  const textMessages = messages.filter(m => m.content?.trim());
  const emotionalMessages = textMessages.filter(m => emotionKeywords.test(m.content));
  const nonEmotional = textMessages.filter(m => !emotionKeywords.test(m.content));

  const sample = [
    ...emotionalMessages.slice(-Math.min(emotionalMessages.length, Math.floor(MAX_MESSAGES * 0.6))),
    ...nonEmotional.slice(-Math.min(nonEmotional.length, Math.floor(MAX_MESSAGES * 0.4))),
  ]
    .sort((a, b) => a.index - b.index)
    .slice(-MAX_MESSAGES);

  const { signal } = request;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      };
      const send = (data: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { safeClose(); }
      };

      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, SSE_HEARTBEAT_MS);

      try {
        if (signal.aborted) { safeClose(); return; }

        send({ type: 'progress', status: 'Identyfikuję przyczyny emocji...' });

        let prompt = buildEmotionCausesPrompt(sample, participants);
        if (reconBriefing) prompt = reconBriefing + '\n\n' + prompt;
        const raw = await callGeminiWithRetry(EMOTION_CAUSES_SYSTEM, prompt, 3, 4096, 0.3);

        if (signal.aborted) { safeClose(); return; }

        const result = parseGeminiJSON<EmotionCausesResult>(raw);
        send({ type: 'complete', result });
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[EmotionCauses]', error);
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Błąd ekstrakcji przyczyn emocji',
          });
        }
      } finally {
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
