import { runCwelTygodnia } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import type { CwelTygodniaResult } from '@/lib/analysis/types';
import { rateLimit } from '@/lib/rate-limit';
import { cwelTygodniaRequestSchema, formatZodError } from '@/lib/validation/schemas';

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

  const parsed = cwelTygodniaRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, quantitativeContext } = parsed.data;
  const samples = parsed.data.samples as unknown as AnalysisSamples;

  const { signal } = request;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        if (signal.aborted) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        send({ type: 'progress', status: 'AI analizuje kto jest cwelem...' });
        const result: CwelTygodniaResult = await runCwelTygodnia(
          samples,
          participants,
          quantitativeContext,
        );

        if (signal.aborted) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        send({ type: 'cwel_complete', result });
      } catch (error) {
        if (!signal.aborted) {
          send({
            type: 'error',
            error: 'Błąd generowania Cwela Tygodnia — spróbuj ponownie',
          });
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
