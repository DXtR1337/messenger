import { runEnhancedRoastPass } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import type { Pass1Result, Pass2Result, PersonProfile, Pass4Result, RoastResult } from '@/lib/analysis/types';
import { rateLimit } from '@/lib/rate-limit';
import { enhancedRoastRequestSchema, formatZodError } from '@/lib/validation/schemas';

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

  const parsed = enhancedRoastRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, quantitativeContext } = parsed.data;
  // Zod validates samples is a non-null object; cast through unknown for the deeply-typed AnalysisSamples
  const samples = parsed.data.samples as unknown as AnalysisSamples;
  // Zod validates qualitative has pass1-4; unwrap array-wrapped Gemini responses and cast
  const unwrap = (v: unknown) => (Array.isArray(v) && v.length === 1 ? v[0] : v);
  const qualitative = {
    pass1: unwrap(parsed.data.qualitative.pass1),
    pass2: unwrap(parsed.data.qualitative.pass2),
    pass3: unwrap(parsed.data.qualitative.pass3),
    pass4: unwrap(parsed.data.qualitative.pass4),
  } as unknown as {
    pass1: Pass1Result;
    pass2: Pass2Result;
    pass3: Record<string, PersonProfile>;
    pass4: Pass4Result;
  };

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

        send({ type: 'progress', status: 'Generuję brutalną prawdę...' });
        const result: RoastResult = await runEnhancedRoastPass(
          samples,
          participants,
          quantitativeContext,
          qualitative,
        );

        if (signal.aborted) {
          clearInterval(heartbeat);
          controller.close();
          return;
        }

        send({ type: 'roast_complete', result });
      } catch (error) {
        if (!signal.aborted) {
          send({
            type: 'error',
            error: 'Błąd generowania roastu — spróbuj ponownie',
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
