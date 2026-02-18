import { runAnalysisPasses, runRoastPass } from '@/lib/analysis/gemini';
import type { AnalysisSamples } from '@/lib/analysis/qualitative';
import { rateLimit } from '@/lib/rate-limit';

const checkLimit = rateLimit(5, 10 * 60 * 1000); // 5 requests per 10 min

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface AnalyzeRequest {
  samples: AnalysisSamples;
  participants: string[];
  relationshipContext?: string;
  mode?: 'standard' | 'roast';
  quantitativeContext?: string;
}

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

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json(
      { error: 'Invalid JSON in request body.' },
      { status: 400 },
    );
  }

  const { samples, participants, relationshipContext, mode, quantitativeContext } = body;

  if (!samples || typeof samples !== 'object') {
    return Response.json(
      { error: 'Missing or invalid "samples" object in request body.' },
      { status: 400 },
    );
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    return Response.json(
      { error: 'Missing or empty "participants" array in request body.' },
      { status: 400 },
    );
  }

  const { signal } = request;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // SSE keepalive heartbeat — prevents proxy idle timeout (e.g. Cloud Run 60s)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':\n\n'));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      try {
        if (mode === 'roast') {
          // Check if client disconnected before starting roast
          if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

          send({ type: 'progress', pass: 1, status: 'Generowanie roastu...' });
          const roastResult = await runRoastPass(
            samples,
            participants,
            quantitativeContext ?? samples.quantitativeContext,
          );

          // Check if client disconnected after roast pass
          if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

          send({ type: 'roast_complete', result: roastResult });
        } else {
          // Check if client disconnected before starting analysis
          if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

          const result = await runAnalysisPasses(
            samples,
            participants,
            (pass, status) => {
              // Check disconnect before sending each progress update
              if (!signal.aborted) {
                send({ type: 'progress', pass, status });
              }
            },
            relationshipContext,
          );

          // Check if client disconnected after analysis passes
          if (signal.aborted) { clearInterval(heartbeat); controller.close(); return; }

          if (result.status === 'error') {
            send({ type: 'error', error: result.error ?? 'Analysis failed' });
          } else {
            send({ type: 'complete', result });
          }
        }
      } catch (error) {
        console.error('[Analyze API Error]', error);
        // Don't send error if client already disconnected
        if (!signal.aborted) {
          send({
            type: 'error',
            error: 'Błąd analizy AI — spróbuj ponownie',
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
