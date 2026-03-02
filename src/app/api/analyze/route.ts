import { runAnalysisPasses, runRoastPass, runReconPass, runDeepReconPass } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import type { ReconResult, DeepReconResult } from '@/lib/analysis/types';
import { rateLimit } from '@/lib/rate-limit';
import { analyzeRequestSchema, formatZodError } from '@/lib/validation/schemas';
import { SSE_HEARTBEAT_MS } from '@/lib/analysis/constants';

const checkLimit = rateLimit(5, 10 * 60 * 1000); // 5 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 180; // Increased for three-phase analysis

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

  const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB

  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return Response.json(
      { error: 'Request body too large. Maximum size is 5MB.' },
      { status: 413 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const parsed = analyzeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      { error: `Validation error: ${formatZodError(parsed.error)}` },
      { status: 400 },
    );
  }

  const { participants, relationshipContext, mode, quantitativeContext, phase } = parsed.data;
  // Zod validates samples is a non-null object; cast through unknown for the deeply-typed AnalysisSamples
  const samples = parsed.data.samples as unknown as AnalysisSamples;

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

      // SSE keepalive heartbeat — prevents proxy idle timeout (e.g. Cloud Run 60s)
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return; }
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, SSE_HEARTBEAT_MS);

      try {
        if (mode === 'roast') {
          // ── Roast mode (unchanged) ──
          if (signal.aborted) { safeClose(); return; }

          send({ type: 'progress', pass: 1, status: 'Generowanie roastu...' });
          const roastResult = await runRoastPass(
            samples,
            participants,
            quantitativeContext ?? samples.quantitativeContext,
          );

          if (signal.aborted) { safeClose(); return; }

          send({ type: 'roast_complete', result: roastResult });

        } else if (phase === 'recon') {
          // ── Phase 1: Recon (Pass 0) ──
          if (signal.aborted) { safeClose(); return; }

          send({ type: 'progress', pass: 0, status: 'Rozpoznanie terenu...' });
          const reconResult = await runReconPass(
            samples.overview,
            participants,
            quantitativeContext ?? samples.quantitativeContext,
            relationshipContext,
          );

          if (signal.aborted) { safeClose(); return; }

          send({ type: 'recon_complete', recon: reconResult });

        } else if (phase === 'deep_recon') {
          // ── Phase 2: Deep Recon (Pass 0.5) ──
          if (signal.aborted) { safeClose(); return; }

          const recon = parsed.data.recon as ReconResult | undefined;
          const targetedSamples = parsed.data.targetedSamples;
          if (!recon || !targetedSamples || targetedSamples.length === 0) {
            send({ type: 'error', error: 'Deep recon requires recon results and targeted samples.' });
            safeClose();
            return;
          }

          send({ type: 'progress', pass: 0.5, status: 'Pogłębione rozpoznanie...' });
          const deepReconResult = await runDeepReconPass(
            targetedSamples,
            participants,
            quantitativeContext ?? samples.quantitativeContext,
            recon,
            relationshipContext,
          );

          if (signal.aborted) { safeClose(); return; }

          send({ type: 'deep_recon_complete', deepRecon: deepReconResult });

        } else {
          // ── Phase 3: Deep analysis (Pass 1-4) with optional recon data ──
          if (signal.aborted) { safeClose(); return; }

          const recon = parsed.data.recon as ReconResult | undefined;
          const deepRecon = parsed.data.deepRecon as DeepReconResult | undefined;
          const targetedSamples = parsed.data.targetedSamples;

          const result = await runAnalysisPasses(
            samples,
            participants,
            (pass, status) => {
              if (!signal.aborted && !closed) {
                send({ type: 'progress', pass, status });
              }
            },
            relationshipContext,
            recon,
            deepRecon,
            targetedSamples,
          );

          if (signal.aborted) { safeClose(); return; }

          if (result.status === 'error') {
            send({ type: 'error', error: result.error ?? 'Analysis failed' });
          } else {
            send({ type: 'complete', result });
          }
        }
      } catch (error) {
        if (!signal.aborted && !closed) {
          console.error('[Analyze]', error);
          send({
            type: 'error',
            error: 'Błąd analizy AI — spróbuj ponownie',
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
