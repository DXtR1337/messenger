import { runPrzegrywTygodnia, runPrzegrywDuo } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import type { PrzegrywTygodniaResult } from '@/lib/analysis/types';
import { rateLimit } from '@/lib/rate-limit';
import { przegrywTygodniaRequestSchema, formatZodError } from '@/lib/validation/schemas';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const parsed = przegrywTygodniaRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, quantitativeContext } = parsed.data;
  const samples = parsed.data.samples as unknown as AnalysisSamples;
  const isDuo = parsed.data.mode === 'duo';

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

        let result: PrzegrywTygodniaResult;

        if (isDuo) {
          send({ type: 'progress', status: 'Pojedynek przegrywów 1v1...' });
          result = await runPrzegrywDuo(samples, participants, quantitativeContext);
        } else {
          send({ type: 'progress', status: 'AI analizuje kto jest przegrywem...' });
          result = await runPrzegrywTygodnia(samples, participants, quantitativeContext);
        }

        if (signal.aborted) { safeClose(); return; }

        send({ type: 'przegryw_complete', result });
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[Przegryw]', error);
          send({
            type: 'error',
            error: 'Błąd generowania Przegrywa Tygodnia — spróbuj ponownie',
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
