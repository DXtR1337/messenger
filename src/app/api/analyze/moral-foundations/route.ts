import 'server-only';
import { callGeminiWithRetry } from '@/lib/analysis/gemini';
import { parseGeminiJSON } from '@/lib/analysis/json-parser';
import {
  buildMoralFoundationsPrompt,
  MORAL_FOUNDATIONS_SYSTEM,
} from '@/lib/analysis/moral-foundations-prompts';
import type { MoralFoundationsResult } from '@/lib/analysis/moral-foundations-prompts';
import { rateLimit } from '@/lib/rate-limit';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const MAX_MESSAGES = 300;

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

  const { messages, participants } = body as {
    messages: Array<{ sender: string; content: string }>;
    participants: string[];
  };

  if (!Array.isArray(messages) || !Array.isArray(participants) || participants.length < 2) {
    return Response.json({ error: 'Nieprawidłowe dane żądania.' }, { status: 400 });
  }

  if (!messages.every(m => typeof m?.sender === 'string' && typeof m?.content === 'string')) {
    return Response.json({ error: 'Wiadomości muszą zawierać pola sender i content.' }, { status: 400 });
  }

  // Sample messages — weight recent 40%
  const textMessages = messages.filter(m => m.content?.trim());
  const sample = textMessages.length > MAX_MESSAGES
    ? [
        ...textMessages.slice(-Math.floor(MAX_MESSAGES * 0.4)),
        ...textMessages
          .slice(0, textMessages.length - Math.floor(MAX_MESSAGES * 0.4))
          .filter((_, i) => i % Math.ceil(textMessages.length / Math.floor(MAX_MESSAGES * 0.6)) === 0)
          .slice(0, Math.floor(MAX_MESSAGES * 0.6)),
      ].slice(0, MAX_MESSAGES)
    : textMessages;

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

        send({ type: 'progress', status: 'Analizuję fundamenty moralne...' });

        const prompt = buildMoralFoundationsPrompt(sample, participants);
        const raw = await callGeminiWithRetry(MORAL_FOUNDATIONS_SYSTEM, prompt, 3, 4096, 0.3);

        if (signal.aborted) { safeClose(); return; }

        const result = parseGeminiJSON<MoralFoundationsResult>(raw);
        send({ type: 'complete', result });
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[MoralFoundations]', error);
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Błąd analizy fundamentów moralnych',
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
