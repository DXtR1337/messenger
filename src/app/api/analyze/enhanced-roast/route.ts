import { runEnhancedRoastPass } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import type { Pass1Result, Pass2Result, PersonProfile, Pass4Result, RoastResult } from '@/lib/analysis/types';
import { rateLimit } from '@/lib/rate-limit';
import { enhancedRoastRequestSchema, formatZodError } from '@/lib/validation/schemas';
import { logger } from '@/lib/logger';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000);

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
    console.error('[EnhancedRoast API] Validation failed:', formatZodError(parsed.error));
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, quantitativeContext, deepScanMaterial } = parsed.data;

  const rawSamples = parsed.data.samples as Record<string, unknown>;
  if (!Array.isArray(rawSamples['all'] ?? rawSamples['overview'])) {
    return Response.json(
      { error: 'Validation error: samples must contain an "overview" or "all" array of messages' },
      { status: 400 },
    );
  }
  const samples: AnalysisSamples = {
    overview: rawSamples['overview'] as AnalysisSamples['overview'],
    dynamics: rawSamples['dynamics'] as AnalysisSamples['dynamics'],
    perPerson: (rawSamples['perPerson'] ?? {}) as AnalysisSamples['perPerson'],
    quantitativeContext: (rawSamples['quantitativeContext'] ?? '') as string,
  };

  const unwrap = (v: unknown): unknown => (Array.isArray(v) && v.length === 1 ? v[0] : v);
  const qualitative: {
    pass1: Pass1Result;
    pass2: Pass2Result;
    pass3: Record<string, PersonProfile>;
    pass4: Pass4Result;
  } = {
    pass1: unwrap(parsed.data.qualitative.pass1) as Pass1Result,
    pass2: unwrap(parsed.data.qualitative.pass2) as Pass2Result,
    pass3: unwrap(parsed.data.qualitative.pass3) as Record<string, PersonProfile>,
    pass4: unwrap(parsed.data.qualitative.pass4) as Pass4Result,
  };

  logger.log('[EnhancedRoast API] Starting for', participants.length, 'participants');

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

        send({ type: 'progress', status: 'Generuję brutalną prawdę...' });
        logger.log('[EnhancedRoast API] Calling Gemini...');
        const startMs = Date.now();
        const result: RoastResult = await runEnhancedRoastPass(
          samples,
          participants,
          quantitativeContext,
          qualitative,
          deepScanMaterial ?? undefined,
        );
        logger.log('[EnhancedRoast API] Gemini responded in', ((Date.now() - startMs) / 1000).toFixed(1), 's');

        if (signal.aborted) { safeClose(); return; }

        send({ type: 'roast_complete', result });
        logger.log('[EnhancedRoast API] Sent roast_complete');
      } catch (error) {
        if (!signal.aborted && !closed) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.error('[EnhancedRoast]', error);
          send({
            type: 'error',
            error: errMsg,
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
